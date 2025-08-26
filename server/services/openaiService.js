const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * 将总结格式化为Markdown
 */
function formatSummaryAsMarkdown(summary, audioFilePath) {
    const audioName = audioFilePath ? path.basename(audioFilePath, path.extname(audioFilePath)) : '未知';
    const currentTime = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    return `# 🤖 AI总结

## 📊 基本信息

- **文件名称**: ${audioName}
- **生成时间**: ${currentTime}
- **总结引擎**: OpenAI GPT-4
- **总结长度**: ${summary.length} 字符

---

## 📋 内容总结

${summary}

---

*本文档由 [Podcast提取器](https://github.com/your-repo/podcast-to-text) 自动生成*
`;
}

// 本地Whisper转录配置
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'base'; // Whisper模型大小
console.log(`🎤 转录模式: 本地Faster-Whisper`);

// 初始化OpenAI客户端（用于总结和文本优化）
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    timeout: 900000,
    maxRetries: 0
});

/**
 * 处理音频文件（单个或多个片段）
 * @param {Array|string} audioFiles - 音频文件路径数组或单个路径
 * @param {boolean} shouldSummarize - 是否需要总结
 * @param {string} outputLanguage - 输出语言
 * @returns {Promise<Object>} - 处理结果
 */
async function processAudioWithOpenAI(audioFiles, shouldSummarize = false, outputLanguage = 'zh', tempDir = null) {
    try {
        console.log(`🤖 开始音频处理 - OpenAI`);
        
        // 确保 audioFiles 是数组
        const files = Array.isArray(audioFiles) ? audioFiles : [audioFiles];
        console.log(`📄 处理文件数量: ${files.length}`);

        let transcript = '';
        let savedFiles = [];

        if (files.length === 1) {
            // 单文件处理 - Python脚本总是保存转录文本
            console.log(`🎵 单文件处理模式`);
            
            // Python脚本转录并直接保存转录文本
            const scriptPath = path.join(__dirname, '..', 'whisper_transcribe.py');
            const timestamp = Date.now();
            const filePrefix = `podcast_${timestamp}`;
            const command = `python3 "${scriptPath}" "${files[0]}" --model ${process.env.WHISPER_MODEL || 'base'} --save-transcript "${tempDir}" --file-prefix "${filePrefix}"`;
            
            console.log(`🎤 Python脚本转录并保存: ${path.basename(files[0])}`);
            console.log(`⚙️ 执行命令: ${command}`);
            
            const { stdout, stderr } = await execAsync(command, {
                cwd: path.join(__dirname, '..'),
                maxBuffer: 1024 * 1024 * 20,
                timeout: 1200000
            });
            
            if (stderr && stderr.trim()) {
                console.log(`🔧 Whisper日志: ${stderr.trim()}`);
            }
            
            const result = JSON.parse(stdout);
            
            if (!result.success) {
                throw new Error(result.error || '转录失败');
            }
            
            transcript = result.text || '';
            savedFiles = result.savedFiles || [];
            
            console.log(`✅ Python脚本转录完成: ${transcript.length} 字符`);
            console.log(`💾 Python脚本保存了 ${savedFiles.length} 个文件`);

            // 对转录文本进行智能优化（错别字修正+格式化）
            let optimizedTranscript = transcript; // 默认使用原始文本
            let optimizationSuccess = false;
            
            for (let retryCount = 0; retryCount < 3; retryCount++) {
                try {
                    console.log(`📝 开始智能优化转录文本${retryCount > 0 ? ` (重试 ${retryCount}/3)` : ''}...`);
                    optimizedTranscript = await formatTranscriptText(transcript, outputLanguage);
                    optimizationSuccess = true;
                    break;
                } catch (optimizationError) {
                    console.error(`❌ 文本优化失败 (尝试 ${retryCount + 1}/3): ${optimizationError.message}`);
                    if (retryCount < 2) {
                        console.log(`⏳ 等待 ${(retryCount + 1) * 3} 秒后重试...`);
                        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 3000));
                    }
                }
            }
            
            if (optimizationSuccess) {
                // 保存优化后的文本（覆盖原文件）
                if (savedFiles.length > 0) {
                    const transcriptFile = savedFiles.find(f => f.type === 'transcript');
                    if (transcriptFile && fs.existsSync(transcriptFile.path)) {
                        fs.writeFileSync(transcriptFile.path, optimizedTranscript, 'utf8');
                        console.log(`📄 优化文本已保存: ${transcriptFile.filename}`);
                    }
                }
                // 更新结果
                transcript = optimizedTranscript;
            } else {
                console.warn(`🔄 AI优化失败，保留原始转录文本`);
                // 保持原始transcript不变，确保转录结果不丢失
            }
            
            // 如果需要总结，使用优化后的转录文本进行AI总结
            if (shouldSummarize) {
                console.log(`📝 开始生成总结...`);
                const summary = await generateSummary(transcript, outputLanguage);
                
                // 保存AI总结（Markdown格式）
                const summaryFileName = `${filePrefix}_summary.md`;
                const summaryPath = path.join(tempDir, summaryFileName);
                const markdownSummary = formatSummaryAsMarkdown(summary, files[0]);
                fs.writeFileSync(summaryPath, markdownSummary, 'utf8');
                
                savedFiles.push({
                    type: 'summary',
                    filename: summaryFileName,
                    path: summaryPath,
                    size: fs.statSync(summaryPath).size
                });
                
                console.log(`📋 AI总结已保存: ${summaryFileName}`);
                
                // 更新result中的summary
                result.summary = summary;
            }
            // 返回处理后的结果
            return {
                transcript: transcript,
                summary: result.summary || null, // 如果有总结则包含
                language: outputLanguage,
                savedFiles: savedFiles
            };
            
        } else {
            // 多文件并发处理
            console.log(`🎬 多文件并发处理模式`);
            const transcribeResult = await transcribeMultipleAudios(files, outputLanguage, !shouldSummarize && tempDir, tempDir);
            
            // 处理返回值（可能是字符串或对象）
            let transcript;
            let savedFiles = [];
            
            if (typeof transcribeResult === 'object' && transcribeResult.text) {
                transcript = transcribeResult.text;
                savedFiles = transcribeResult.savedFiles || [];
            } else {
                transcript = transcribeResult;
            }
            
            let finalResult = {
                transcript: transcript,
                language: outputLanguage,
                savedFiles: savedFiles
            };

            if (shouldSummarize) {
                console.log(`📝 开始生成总结...`);
                const summary = await generateSummary(transcript, outputLanguage);
                finalResult.summary = summary;
            }
            
            return finalResult;
        }

    } catch (error) {
        console.error('❌ OpenAI处理失败:', error);
        throw error;
    }
}

/**
 * 并发转录多个音频文件并优化拼接
 * @param {Array} audioFiles - 音频文件路径数组
 * @param {string} outputLanguage - 总结输出语言（不影响转录语言）
 * @returns {Promise<string>} - 优化后的完整转录文本
 */
async function transcribeMultipleAudios(audioFiles, outputLanguage, shouldSaveDirectly = false, tempDir = null) {
    try {
        console.log(`🔄 开始串行转录 ${audioFiles.length} 个音频片段（避免API过载）...`);
        
        // 分批处理音频片段，避免并发过载，使用重试机制
        const batchSize = 1; // 每批最多1个文件 - 完全串行处理
        const transcriptions = [];
        let allSavedFiles = []; // 收集所有保存的文件
        
        for (let i = 0; i < audioFiles.length; i += batchSize) {
            const batch = audioFiles.slice(i, i + batchSize);
            console.log(`🔄 处理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(audioFiles.length/batchSize)}: ${batch.length} 个文件`);
            
            const batchPromises = batch.map(async (file, batchIndex) => {
                const index = i + batchIndex;
                let retryCount = 0;
                const maxRetries = 2;
                
                while (retryCount <= maxRetries) {
                    try {
                        console.log(`   🎵 开始转录片段 ${index + 1}/${audioFiles.length}: ${path.basename(file)} ${retryCount > 0 ? `(重试 ${retryCount})` : ''}`);
                        
                        // 使用新的本地转录函数，支持保存参数
                        const result = await transcribeAudioLocal(file, null, shouldSaveDirectly, tempDir);
                        const transcript = typeof result === 'string' ? result : result.text || '';
                        
                        console.log(`   ✅ 片段 ${index + 1} 转录完成 (${transcript.length} 字符)`);
                        
                        // 如果有保存的文件信息，收集起来
                        if (typeof result === 'object' && result.savedFiles) {
                            allSavedFiles = allSavedFiles.concat(result.savedFiles);
                        }
                        
                        return {
                            index,
                            text: transcript,
                            filename: path.basename(file),
                            success: true
                        };
                    } catch (error) {
                        retryCount++;
                        if (retryCount <= maxRetries) {
                            console.log(`   ⚠️ 片段 ${index + 1} 转录失败，准备重试 ${retryCount}/${maxRetries}: ${error.message}`);
                            // 等待一段时间再重试 - 增加延迟防止连接重置
                            await new Promise(resolve => setTimeout(resolve, 3000 * retryCount));
                        } else {
                            console.error(`   ❌ 片段 ${index + 1} 转录最终失败:`, error);
                            return {
                                index,
                                text: null, // 标记为失败，不提供错误文本
                                filename: path.basename(file),
                                success: false,
                                error: error.message
                            };
                        }
                    }
                }
            });
            
            // 等待当前批次完成
            const batchResults = await Promise.all(batchPromises);
            transcriptions.push(...batchResults);
            
            // 批次间添加短暂延迟，避免API压力
            if (i + batchSize < audioFiles.length) {
                console.log(`⏳ 批次间休息5秒，避免API过载...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        // 按顺序排列转录结果
        transcriptions.sort((a, b) => a.index - b.index);
        
        // 统计成功和失败的片段
        const successfulTranscriptions = transcriptions.filter(t => t.success && t.text);
        const failedCount = transcriptions.length - successfulTranscriptions.length;
        
        console.log(`📋 转录完成统计: ${successfulTranscriptions.length}/${transcriptions.length} 成功, ${failedCount} 失败`);
        
        if (successfulTranscriptions.length === 0) {
            throw new Error('所有音频片段转录都失败了。请检查网络连接和API配置，或稍后重试。');
        }
        
        if (failedCount > 0) {
            console.warn(`⚠️ ${failedCount} 个片段转录失败，将基于 ${successfulTranscriptions.length} 个成功片段继续处理`);
        }
        
        // 只拼接成功的转录文本
        const rawTranscript = successfulTranscriptions
            .map(t => t.text)
            .join('\n\n');

        console.log(`📊 有效转录内容: ${rawTranscript.length} 字符`);
        
        // 检查是否有足够的内容进行优化
        if (rawTranscript.length < 50) {
            console.warn('⚠️ 转录内容太少，跳过AI优化');
            return rawTranscript;
        }
        
        // 使用AI优化拼接的文本
        const optimizedTranscript = await optimizeTranscriptContinuity(rawTranscript, outputLanguage);
        
        console.log(`✨ 文本优化完成: ${optimizedTranscript.length} 字符`);
        
        // 如果有保存文件，返回对象；否则返回字符串（保持向后兼容）
        if (allSavedFiles.length > 0) {
            return {
                text: optimizedTranscript,
                savedFiles: allSavedFiles
            };
        }
        
        return optimizedTranscript;

    } catch (error) {
        console.error('❌ 多文件转录失败:', error);
        throw error;
    }
}

/**
 * 使用本地Faster-Whisper转录音频
 * @param {string} audioPath - 音频文件路径
 * @param {string} language - 语言代码（可选）
 * @returns {Promise<string>} - 转录文本
 */
async function transcribeAudioLocal(audioPath, language = null, shouldSaveDirectly = false, tempDir = null) {
    try {
        console.log(`🎤 本地转录: ${path.basename(audioPath)}`);
        
        // 构建Python命令
        const scriptPath = path.join(__dirname, '..', 'whisper_transcribe.py');
        let command = `python3 "${scriptPath}" "${audioPath}" --model ${WHISPER_MODEL}`;
        
        if (language) {
            command += ` --language ${language}`;
        }
        
        // 如果需要直接保存转录文本
        if (shouldSaveDirectly && tempDir) {
            const timestamp = Date.now();
            const filePrefix = `podcast_${timestamp}`;
            command += ` --save-transcript "${tempDir}" --file-prefix "${filePrefix}"`;
            console.log(`💾 将直接保存转录文本到: ${tempDir}`);
        }
        
        console.log(`⚙️ 执行命令: ${command}`);
        
        // 执行转录脚本
        const { stdout, stderr } = await execAsync(command, {
            cwd: path.join(__dirname, '..'),
            maxBuffer: 1024 * 1024 * 20,
            timeout: 1200000
        });
        
        if (stderr && stderr.trim()) {
            console.log(`🔧 Whisper日志: ${stderr.trim()}`);
        }
        
        // 解析JSON结果
        const result = JSON.parse(stdout);
        
        if (!result.success) {
            throw new Error(result.error || '本地转录失败');
        }
        
        const transcript = result.text || '';
        console.log(`✅ 本地转录完成: ${transcript.length} 字符`);
        console.log(`📊 处理时间: ${result.processing_time}秒, 检测语言: ${result.language} (${(result.language_probability * 100).toFixed(1)}%)`);
        
        // 如果保存了文件，返回完整结果对象；否则只返回转录文本
        if (shouldSaveDirectly && result.savedFiles && result.savedFiles.length > 0) {
            return {
                text: transcript,
                savedFiles: result.savedFiles,
                language: result.language,
                processing_time: result.processing_time
            };
        }
        
        return transcript;
        
    } catch (error) {
        console.error(`❌ 本地转录失败:`, error);
        
        // 提供更详细的错误信息
        if (error.message.includes('ENOENT')) {
            throw new Error('Python3或Whisper脚本未找到，请检查安装');
        } else if (error.message.includes('timeout')) {
            throw new Error('本地转录超时，请检查音频文件大小');
        } else if (error.message.includes('JSON')) {
            throw new Error('本地转录输出格式错误，请检查脚本');
        } else {
            throw new Error(`本地转录失败: ${error.message}`);
        }
    }
}

/**
 * 转录单个音频文件（本地Faster-Whisper）
 * @param {string} audioPath - 音频文件路径
 * @param {string} autoDetect - 是否自动检测语言（转录始终保持原语言）
 * @returns {Promise<string>} - 转录文本
 */
async function transcribeAudio(audioPath, autoDetect = true) {
    return await transcribeAudioLocal(audioPath, autoDetect ? null : 'zh');
}



/**
 * 优化转录文本：修正错误、改善通顺度和智能分段
 * @param {string} rawTranscript - 原始转录文本
 * @param {string} outputLanguage - 输出语言（仅影响提示语言，不改变内容语言）
 * @returns {Promise<string>} - 优化后的转录文本
 */
async function formatTranscriptText(rawTranscript, outputLanguage = 'zh') {
    try {
        console.log(`📝 开始智能优化转录文本: ${rawTranscript.length} 字符 (修正错误 + 格式化)`);

        // 检查文本长度，超过限制时分块处理
        const maxCharsPerChunk = 8000; // 约14000 tokens，留出余量
        
        if (rawTranscript.length > maxCharsPerChunk) {
            console.log(`📄 文本过长 (${rawTranscript.length} 字符)，使用分块处理`);
            return await formatLongTranscriptInChunks(rawTranscript, outputLanguage, maxCharsPerChunk);
        }

        const prompt = outputLanguage === 'zh' ? 
            `请对以下音频转录文本进行智能优化和格式化，要求：

**内容优化：**
1. 纠正明显的错别字（如：因该→应该、的地得用法等）
2. 修正同音字错误（如：在→再、做→作、象→像等）
3. 智能识别并修正品牌名称的音译错误（仔细分析文本中的品牌名称，判断是否为知名公司的错误音译）
4. 修复语句不通顺的地方，让表达更自然流畅
5. 补充遗漏的标点符号，改正标点使用错误
6. 保持原意和语气不变，不要删减或添加内容

**格式优化：**
1. 按照语义和对话逻辑进行合理分段
2. 在问答转换、话题转换处换行或空行
3. 保留口语化表达和语气词（嗯、啊、那个等）
4. 让整体排版清晰易读

**注意：这是对话/访谈内容，请保持对话的原始风格和完整性**

原始转录文本：
${rawTranscript}` :
            `Please intelligently optimize and format the following audio transcript text:

**Content Optimization:**
1. Correct obvious typos and spelling errors
2. Fix homophones and word confusion errors
3. Intelligently identify and correct brand name transcription errors (carefully analyze brand names in text and determine if they are mistranscribed famous companies)
4. Repair grammatically awkward sentences for natural flow
5. Add missing punctuation and correct punctuation errors
6. Maintain original meaning and tone, don't remove or add content

**Format Optimization:**
1. Add reasonable paragraph breaks based on semantic and conversational logic
2. Add line breaks at question-answer transitions and topic changes
3. Preserve colloquial expressions and filler words (um, ah, etc.)
4. Make overall layout clear and readable

**Note: This is dialogue/interview content, please maintain the original conversational style and completeness**

Original transcript text:
${rawTranscript}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: '你是一个专业的音频转录文本优化助手，负责修正转录错误、改善文本通顺度和排版格式，但必须保持原意不变，不删减或添加内容。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 4096,
            temperature: 0.1
        });

        const formattedText = response.choices[0].message.content.trim();
        
        console.log(`✅ 文本优化完成: ${rawTranscript.length} → ${formattedText.length} 字符`);
        
        return formattedText;
        
    } catch (error) {
        console.error('❌ 文本优化失败:', error.message);
        console.warn('🔄 返回原始文本');
        return rawTranscript; // 失败时返回原文本
    }
}

/**
 * 优化转录文本的连续性和流畅性
 * @param {string} rawTranscript - 原始拼接的转录文本
 * @param {string} outputLanguage - 输出语言（仅影响优化提示语言，不改变内容语言）
 * @returns {Promise<string>} - 优化后的转录文本
 */
async function optimizeTranscriptContinuity(rawTranscript, outputLanguage) {
    try {
        console.log(`🔧 开始优化文本连续性...`);
        
        // 检查文本质量，避免处理错误信息
        if (rawTranscript.includes('[转录失败') || rawTranscript.includes('error') || rawTranscript.length < 20) {
            console.log('📄 跳过优化：文本质量不足或包含错误信息');
            return rawTranscript;
        }
        
        const systemPrompt = outputLanguage === 'zh' 
            ? `你是一个专业的文本编辑助手。请优化以下转录文本，使其更流畅自然：

任务要求：
1. 保持原文的完整意思和语言，不要改变或删减内容
2. 优化片段间的衔接，使语句更连贯
3. 清理多余的语气词（嗯、啊、那个等），但保留必要的语气表达
4. 修正明显的断句错误
5. 保持说话者的原始语言风格和表达习惯
6. 不要翻译或改变原文语言
7. 不要添加原文中没有的信息

请直接输出优化后的文本，保持原语言，不要添加任何解释或标注。`

            : `You are a professional text editing assistant. Please optimize the following transcript to make it more fluent and natural:

Requirements:
1. Maintain the complete meaning and language of the original text, do not change or remove content
2. Optimize transitions between segments for better coherence
3. Clean up excessive filler words (um, uh, like, etc.) while keeping necessary expressions
4. Fix obvious sentence breaks
5. Maintain the speaker's original language style and expression habits
6. Do not translate or change the original language
7. Do not add information not present in the original text

Please output the optimized text directly in the original language without any explanations or annotations.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: rawTranscript }
            ],
            temperature: 0.3,
            max_tokens: Math.min(4000, Math.floor(rawTranscript.length * 1.2))
        });

        const optimizedText = response.choices[0].message.content.trim();
        console.log(`✨ 文本优化完成`);
        
        return optimizedText;

    } catch (error) {
        console.error('❌ 文本优化失败:', error);
        console.log('📄 返回原始拼接文本');
        return rawTranscript; // 失败时返回原始文本
    }
}

/**
 * 生成播客内容总结
 * @param {string} transcript - 播客转录文本
 * @param {string} outputLanguage - 输出语言
 * @returns {Promise<string>} - 播客内容总结
 */
async function generateSummary(transcript, outputLanguage = 'zh') {
    try {
        console.log(`📋 生成总结 (${outputLanguage})...`);
        
        // 检查文本长度，超过限制时分块处理
        const maxCharsForSummary = 6000; // 约10000 tokens，为总结留更多空间
        
        if (transcript.length > maxCharsForSummary) {
            console.log(`📄 文本过长 (${transcript.length} 字符)，使用分块总结`);
            return await generateSummaryInChunks(transcript, outputLanguage, maxCharsForSummary);
        }
        
        const systemPrompt = outputLanguage === 'zh'
            ? `你是一个专业的播客内容分析师。请为以下播客节目生成一个全面、结构化的总结：

总结要求：
1. 提取播客的主要话题和核心观点
2. 保持逻辑结构清晰，突出播客的核心价值
3. 包含重要的讨论内容、观点和结论
4. 使用简洁明了的语言
5. 适当保留嘉宾/主持人的表达风格和重要观点


请生成结构化的播客内容总结，包含要点和关键内容。`

            : `You are a professional podcast content analyst. Please generate a comprehensive, structured summary for the following podcast episode:

Summary requirements:
1. Extract main topics and core viewpoints from the podcast
2. Maintain clear logical structure highlighting the podcast's core value
3. Include important discussions, viewpoints, and conclusions
4. Use concise and clear language
5. Appropriately retain the hosts'/guests' expression style and important viewpoints

Please generate a structured podcast content summary with key points and essential content.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: transcript }
            ],
            temperature: 0.5,
            max_tokens: Math.min(2000, Math.floor(transcript.length * 0.4))
        });

        const summary = response.choices[0].message.content.trim();
        console.log(`📄 总结生成完成: ${summary.length} 字符`);
        
        return summary;

    } catch (error) {
        console.error('❌ 总结生成失败:', error);
        throw new Error(`总结生成失败: ${error.message}`);
    }
}

/**
 * 分块处理超长文本的总结生成
 */
async function generateSummaryInChunks(transcript, outputLanguage, maxCharsPerChunk) {
    try {
        // 使用相同的分块逻辑
        let chunks = [];
        
        // 尝试按标点符号分块
        const sentences = transcript.split(/[。！？\n]+/).filter(s => s.trim());
        let currentChunk = '';
        
        for (const sentence of sentences) {
            const testChunk = currentChunk + (currentChunk ? '。' : '') + sentence;
            if (testChunk.length > maxCharsPerChunk && currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
            } else {
                currentChunk = testChunk;
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        // 强制分割大块
        const finalChunks = [];
        for (const chunk of chunks) {
            if (chunk.length <= maxCharsPerChunk) {
                finalChunks.push(chunk);
            } else {
                for (let i = 0; i < chunk.length; i += maxCharsPerChunk) {
                    finalChunks.push(chunk.substring(i, i + maxCharsPerChunk));
                }
            }
        }
        
        chunks = finalChunks;
        console.log(`📊 文本分为 ${chunks.length} 块进行总结`);
        
        // 为每个分块生成总结
        const chunkSummaries = [];
        for (let i = 0; i < chunks.length; i++) {
            console.log(`🔄 总结第 ${i + 1}/${chunks.length} 块 (${chunks[i].length} 字符)`);
            
            try {
                const chunkSummary = await generateSummary(chunks[i], outputLanguage);
                chunkSummaries.push(chunkSummary);
                
                // 添加延迟避免API限制
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (chunkError) {
                console.warn(`⚠️ 第 ${i + 1} 块总结失败: ${chunkError.message}`);
                chunkSummaries.push(`[第${i + 1}块总结失败]`);
            }
        }
        
        // 合并所有分块总结
        const combinedSummary = chunkSummaries.join('\n\n');
        
        // 对合并的总结进行最终整理
        const finalSystemPrompt = outputLanguage === 'zh'
            ? `请将以下分段总结整理成一个连贯、完整的总结，去除重复内容，保持逻辑清晰：`
            : `Please organize the following segmented summaries into a coherent, complete summary, removing duplicate content and maintaining clear logic:`;
        
        try {
            const finalResponse = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    { role: "system", content: finalSystemPrompt },
                    { role: "user", content: combinedSummary }
                ],
                temperature: 0.3,
                max_tokens: 2000
            });
            
            const finalSummary = finalResponse.choices[0].message.content.trim();
            console.log(`✅ 分块总结完成: ${transcript.length} → ${finalSummary.length} 字符`);
            
            return finalSummary;
        } catch (finalError) {
            console.warn(`⚠️ 最终总结整理失败，返回合并总结: ${finalError.message}`);
            return combinedSummary;
        }
        
    } catch (error) {
        console.error('❌ 分块总结失败:', error.message);
        throw error;
    }
}

/**
 * 格式化单个文本块（不进行分块检查，避免递归）
 */
async function formatSingleChunk(chunkText, outputLanguage = 'zh') {
    try {
        const prompt = outputLanguage === 'zh' ? 
            `请对以下音频转录文本进行智能优化和格式化，要求：

**内容优化：**
1. 纠正明显的错别字（如：因该→应该、的地得用法等）
2. 修正同音字错误（如：在→再、做→作、象→像等）
3. 智能识别并修正品牌名称的音译错误（仔细分析文本中的品牌名称，判断是否为知名公司的错误音译）
4. 修复语句不通顺的地方，让表达更自然流畅
5. 补充遗漏的标点符号，改正标点使用错误
6. 保持原意和语气不变，不要删减或添加内容

**格式优化：**
1. 按照语义和对话逻辑进行合理分段
2. 在问答转换、话题转换处换行或空行
3. 保留口语化表达和语气词（嗯、啊、那个等）
4. 让整体排版清晰易读

**注意：这是对话/访谈内容，请保持对话的原始风格和完整性**

原始转录文本：
${chunkText}` :
            `Please intelligently optimize and format the following audio transcript text:

**Content Optimization:**
1. Correct obvious typos and spelling errors
2. Fix homophones and word confusion errors
3. Intelligently identify and correct brand name transcription errors (carefully analyze brand names in text and determine if they are mistranscribed famous companies)
4. Repair grammatically awkward sentences for natural flow
5. Add missing punctuation and correct punctuation errors
6. Maintain original meaning and tone, don't remove or add content

**Format Optimization:**
1. **Must break into reasonable paragraphs based on semantic logic - don't leave as one giant paragraph**
2. Add line breaks at topic transitions and logical shifts
3. Each paragraph should not exceed 3-4 sentences for readability
4. Preserve colloquial expressions and filler words (um, ah, etc.)
5. Ensure overall layout is clear and readable with proper paragraph spacing
4. Make overall layout clear and readable

**Note: This is dialogue/interview content, please maintain the original conversational style and completeness**

Original transcript text:
${chunkText}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: '你是一个专业的音频转录文本优化助手，负责修正转录错误、改善文本通顺度和排版格式，但必须保持原意不变，不删减或添加内容。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 4096,
            temperature: 0.1
        });

        return response.choices[0].message.content.trim();
        
    } catch (error) {
        console.error('❌ 单块文本优化失败:', error.message);
        return chunkText; // 失败时返回原文本
    }
}

/**
 * 分块处理超长转录文本
 */
async function formatLongTranscriptInChunks(rawTranscript, outputLanguage, maxCharsPerChunk) {
    try {
        // 智能分块：优先按标点符号，其次按空格，最后强制分割
        let chunks = [];
        
        // 尝试按标点符号分块
        const sentences = rawTranscript.split(/[。！？\n]+/).filter(s => s.trim());
        let currentChunk = '';
        
        for (const sentence of sentences) {
            const testChunk = currentChunk + (currentChunk ? '。' : '') + sentence;
            if (testChunk.length > maxCharsPerChunk && currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
            } else {
                currentChunk = testChunk;
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        // 如果分块仍然太大，强制按字符数分割
        const finalChunks = [];
        for (const chunk of chunks) {
            if (chunk.length <= maxCharsPerChunk) {
                finalChunks.push(chunk);
            } else {
                // 强制分割大块
                for (let i = 0; i < chunk.length; i += maxCharsPerChunk) {
                    finalChunks.push(chunk.substring(i, i + maxCharsPerChunk));
                }
            }
        }
        
        chunks = finalChunks;
        
        console.log(`📊 文本分为 ${chunks.length} 块处理`);
        
        const optimizedChunks = [];
        for (let i = 0; i < chunks.length; i++) {
            console.log(`🔄 处理第 ${i + 1}/${chunks.length} 块 (${chunks[i].length} 字符)`);
            
            try {
                // 直接调用OpenAI，避免递归循环
                const optimizedChunk = await formatSingleChunk(chunks[i], outputLanguage);
                optimizedChunks.push(optimizedChunk);
                
                // 添加延迟避免API限制
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (chunkError) {
                console.warn(`⚠️ 第 ${i + 1} 块优化失败，使用原始文本: ${chunkError.message}`);
                optimizedChunks.push(chunks[i]);
            }
        }
        
        const result = optimizedChunks.join('\n\n');
        console.log(`✅ 分块优化完成: ${rawTranscript.length} → ${result.length} 字符`);
        
        return result;
        
    } catch (error) {
        console.error('❌ 分块优化失败:', error.message);
        return rawTranscript;
    }
}

module.exports = {
    processAudioWithOpenAI,
    transcribeAudio,
    transcribeAudioLocal,
    transcribeMultipleAudios,
    formatTranscriptText,
    formatSummaryAsMarkdown,
    optimizeTranscriptContinuity,
    generateSummary
};