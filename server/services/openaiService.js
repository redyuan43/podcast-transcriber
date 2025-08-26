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
async function processAudioWithOpenAI(audioFiles, shouldSummarize = false, outputLanguage = 'zh', tempDir = null, audioLanguage = 'auto') {
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
                    // 检测转录文本的实际语言，用于优化提示词
                    const detectedLanguage = detectTranscriptLanguage(transcript, audioLanguage);
                    optimizedTranscript = await formatTranscriptText(transcript, detectedLanguage);
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
                // 保存原始转录备份和优化后的文本
                if (savedFiles.length > 0) {
                    const transcriptFile = savedFiles.find(f => f.type === 'transcript');
                    if (transcriptFile && fs.existsSync(transcriptFile.path)) {
                        // 备份原始转录文件
                        const originalBackupPath = transcriptFile.path.replace('.md', '_original.md');
                        if (!fs.existsSync(originalBackupPath)) {
                            fs.copyFileSync(transcriptFile.path, originalBackupPath);
                            console.log(`💾 原始转录已备份: ${path.basename(originalBackupPath)}`);
                        }
                        
                        // 保存优化后的文本
                        fs.writeFileSync(transcriptFile.path, optimizedTranscript, 'utf8');
                        console.log(`📄 优化文本已保存: ${transcriptFile.filename}`);
                        
                        // 添加备份文件到结果中
                        savedFiles.push({
                            type: 'original_transcript',
                            filename: path.basename(originalBackupPath),
                            path: originalBackupPath,
                            size: fs.statSync(originalBackupPath).size
                        });
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
 * @param {string} transcriptLanguage - 转录文本的实际语言（用于选择优化提示词语言，不改变内容语言）
 * @returns {Promise<string>} - 优化后的转录文本（保持原始语言）
 */
async function formatTranscriptText(rawTranscript, transcriptLanguage = 'zh') {
    try {
        console.log(`📝 开始智能优化转录文本: ${rawTranscript.length} 字符 (修正错误 + 格式化)`);

        // 检查文本长度，超过限制时分块处理
        const maxCharsPerChunk = 4000; // 约2000-4000 tokens，适合GPT-3.5/GPT-4
        
        if (rawTranscript.length > maxCharsPerChunk) {
            console.log(`📄 文本过长 (${rawTranscript.length} 字符)，使用分块处理`);
            return await formatLongTranscriptInChunks(rawTranscript, transcriptLanguage, maxCharsPerChunk);
        }

        const prompt = transcriptLanguage === 'zh' ? 
            `请对以下音频转录文本进行智能优化和格式化，要求：

**内容优化（正确性与可读性优先）：**
1. **修复所有明显错误** - 包括转录错误、断句错误、不完整词句等
2. 纠正错别字和拼写错误，修正同音字混淆
3. 智能识别并修正品牌名称、专有名词的音译错误
4. **适度改善语法和表达** - 在保持原意的前提下，让表达更清晰流畅
5. **保留重要的口语特征** - 保持语气词（嗯、啊、那个等），但可以删除过多的重复
6. **补全不完整表达** - 根据上下文补全明显缺失的词语，提高可读性
7. **严格保持原始语言** - 不要翻译，保持原意和主要观点不变
8. 添加适当的标点符号，提升阅读体验

**格式优化（播客对话分段优先）：**
1. **智能识别播客对话结构并按对话逻辑分段**：
   - **问答边界分段** - 当主持人提出问题和嘉宾开始回答时分段
   - **发言人转换分段** - 当发言人从一个人转换到另一个人时分段
   - **话题转换分段** - 当讨论主题发生明显转换时分段
   - **完整思路分段** - 当一个完整的观点或论述表达完毕时分段
2. **保持对话的自然流程** - 每个段落应该是一个相对完整的对话单元
3. 每个段落之间必须有一个空行分隔（两个换行符）
4. **适度保留口语特征** - 保持自然的语气词和对话特色，但删除影响阅读的过度重复
5. 确保输出的是标准markdown格式，段落间有空行
6. 让播客对话具有良好的阅读流畅性和对话感

**核心原则：生成清晰、易读、准确的播客转录文本，在保持原意的前提下优化对话表达质量。**

原始转录文本：
${rawTranscript}` :
            `Please intelligently optimize and format the following audio transcript text:

**Content Optimization (Accuracy & Readability First):**
1. **Fix all obvious errors** - Including transcription errors, fragment errors, incomplete words/sentences
2. Correct typos and spelling errors, fix homophone confusions
3. Intelligently identify and correct brand names and proper noun transcription errors
4. **Moderately improve grammar and expression** - Make expressions clearer and more fluent while preserving original meaning
5. **Preserve important speaking characteristics** - Keep natural filler words (um, ah, like, you know, etc.) but remove excessive repetitions
6. **Complete incomplete expressions** - Use context to complete obviously missing words for better readability
7. **Strictly maintain original language** - No translation, preserve original meaning and main points
8. Add appropriate punctuation to enhance reading experience

**Format Optimization (Podcast Dialogue Segmentation Priority):**
1. **Intelligently recognize podcast dialogue structure and segment by conversational logic**:
   - **Question-Answer boundary segmentation** - Create breaks when hosts ask questions and guests begin answering
   - **Speaker transition segmentation** - Create breaks when speakers change from one person to another
   - **Topic transition segmentation** - Create breaks when discussion topics clearly shift
   - **Complete thought segmentation** - Create breaks when a complete viewpoint or argument is fully expressed
2. **Maintain natural conversation flow** - Each paragraph should be a relatively complete conversational unit
3. Each paragraph must be separated by a blank line (double line breaks)
4. **Moderately preserve speaking characteristics** - Keep natural filler words and conversational style but remove excessive repetitions that hinder reading
5. Ensure output is in standard markdown format with blank lines between paragraphs
6. Make podcast dialogue have good reading fluency and conversational feel

**Core Principle: Generate clear, readable, and accurate podcast transcript text that optimizes dialogue expression quality while preserving original meaning.**

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

        const optimizedText = response.choices[0].message.content.trim();
        
        // 调试: 检查优化后的分段情况
        console.log('🔍 OpenAI优化后文本前500字符:', JSON.stringify(optimizedText.substring(0, 500)));
        console.log('🔍 OpenAI优化后换行符数量:', (optimizedText.match(/\n/g) || []).length);
        
        const formattedText = ensureMarkdownParagraphs(optimizedText);
        
        console.log('🔍 ensureMarkdownParagraphs后文本前500字符:', JSON.stringify(formattedText.substring(0, 500)));
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
        
        // 智能处理不同长度的文本
        // 考虑token限制：GPT-4约8000 tokens，中文1-2字符=1token，安全起见用6000字符
        const maxCharsForDirectSummary = 6000; // 约3000-6000 tokens，适合GPT-4
        
        if (transcript.length <= maxCharsForDirectSummary) {
            // 对于适中长度的文本，直接生成总结
            return await generateDirectSummary(transcript, outputLanguage);
        } else {
            // 对于超长文本，使用智能分块策略
            console.log(`📄 文本过长 (${transcript.length} 字符)，使用智能分块总结策略`);
            return await generateSmartChunkedSummary(transcript, outputLanguage);
        }
    } catch (error) {
        console.error('❌ 总结生成失败:', error);
        throw new Error(`总结生成失败: ${error.message}`);
    }
}

/**
 * 根据语言获取系统提示词
 */
function getSystemPromptByLanguage(outputLanguage) {
    const prompts = {
        zh: `你是一个专业的播客内容分析师。请为以下播客节目生成一个全面、结构化的总结：

总结要求：
1. 提取播客的主要话题和核心观点
2. 保持逻辑结构清晰，突出播客的核心价值
3. 包含重要的讨论内容、观点和结论
4. 使用简洁明了的语言
5. 适当保留嘉宾/主持人的表达风格和重要观点

**重要：严格排除以下无价值内容（这是核心要求）：**
- 播客制作信息（制作团队、编辑、混音师、制作公司等）
- **赞助商广告和商业推广内容**（任何公司、产品、服务的宣传，包括但不限于保险公司、移动服务商、投资平台、SaaS服务等）
- **节目资助方信息**（如"本节目由...赞助"、"感谢...的支持"等）
- 播客标准开头结尾语（如"欢迎收听"、"感谢收听"等）
- 技术制作细节和播客平台信息
- 主持人介绍播客本身的元信息
- **任何形式的商业广告内容**，即使被包装成节目内容的一部分

**重要提醒：如果某段内容主要是在推广产品或服务，即使与主题相关，也应完全排除。只保留纯粹的知识性、信息性、观点性内容。**

段落组织要求（核心）：
1. **按语意和逻辑主题分段** - 每当话题转换、讨论重点改变、或从一个观点转向另一个观点时，必须开始新段落
2. **每个段落专注一个主要观点或主题**
3. **段落之间必须有空行分隔（双换行符\n\n）** 
4. **思考内容的逻辑流程，合理划分段落边界**

格式要求：
1. 使用markdown格式，可以包含标题、列表等元素
2. 确保段落间有空行，便于阅读
3. 每个段落应该是完整的逻辑单元

请仔细分析内容的语意结构，按逻辑主题合理分段。**必须使用中文输出。**`,

        en: `You are a professional podcast content analyst. Please generate a comprehensive, structured summary for the following podcast episode:

Summary requirements:
1. Extract main topics and core viewpoints from the podcast
2. Maintain clear logical structure highlighting the podcast's core value
3. Include important discussions, viewpoints, and conclusions
4. Use concise and clear language
5. Appropriately retain the hosts'/guests' expression style and important viewpoints

**Important: Strictly exclude the following non-valuable content (this is a core requirement):**
- Podcast production information (production team, editors, sound engineers, production companies, etc.)
- **Sponsor advertisements and commercial promotional content** (any company, product, or service promotion, including but not limited to insurance companies, mobile service providers, investment platforms, SaaS services, etc.)
- **Program sponsorship information** (such as "this show is sponsored by...", "thanks to... for their support", etc.)
- Standard podcast opening/closing statements (like "welcome to", "thanks for listening", etc.)
- Technical production details and podcast platform information
- Host introductions about the podcast itself (meta-information)
- **Any form of commercial advertising content**, even if packaged as part of the program content

**Important reminder: If a segment is primarily promoting a product or service, even if related to the topic, it should be completely excluded. Only retain purely knowledge-based, informational, and opinion-based content.**

Paragraph Organization Requirements (Core):
1. **Organize by semantic and logical themes** - Start a new paragraph whenever the topic shifts, discussion focus changes, or when moving from one viewpoint to another
2. **Each paragraph should focus on one main viewpoint or theme**
3. **Paragraphs must be separated by blank lines (double line breaks \n\n)**
4. **Think about the logical flow of content and reasonably divide paragraph boundaries**

Format requirements:
1. Use markdown format, may include headings, lists, and other elements
2. Ensure blank lines between paragraphs for readability
3. Each paragraph should be a complete logical unit

Please carefully analyze the semantic structure of the content and organize paragraphs logically by themes. **Must output in English.**`,

        es: `Eres un analista profesional de contenido de podcasts. Por favor, genera un resumen integral y estructurado para el siguiente episodio de podcast:

Requisitos del resumen:
1. Extraer los temas principales y puntos de vista centrales del podcast
2. Mantener una estructura lógica clara destacando el valor central del podcast
3. Incluir discusiones importantes, puntos de vista y conclusiones
4. Usar un lenguaje conciso y claro
5. Retener apropiadamente el estilo de expresión y puntos de vista importantes de los anfitriones/invitados

Requisitos de formato (Importante):
1. Debe organizar el contenido por temas o segmentos lógicos
2. Cada párrafo debe estar separado por una línea en blanco (doble salto de línea)
3. Asegurar que la salida esté en formato markdown estándar con líneas en blanco entre párrafos
4. Puede usar encabezados, listas y otros elementos markdown para mejorar la estructura

Por favor, genera un resumen estructurado del contenido del podcast con puntos clave y contenido esencial. La salida debe seguir los requisitos de formato markdown. **Debe generar la salida en español.**`,

        fr: `Vous êtes un analyste professionnel de contenu de podcasts. Veuillez générer un résumé complet et structuré pour l'épisode de podcast suivant :

Exigences du résumé :
1. Extraire les sujets principaux et les points de vue centraux du podcast
2. Maintenir une structure logique claire mettant en évidence la valeur centrale du podcast
3. Inclure les discussions importantes, les points de vue et les conclusions
4. Utiliser un langage concis et clair
5. Conserver de manière appropriée le style d'expression et les points de vue importants des hôtes/invités

Exigences de format (Important) :
1. Doit organiser le contenu par thèmes ou segments logiques
2. Chaque paragraphe doit être séparé par une ligne vide (double saut de ligne)
3. S'assurer que la sortie soit en format markdown standard avec des lignes vides entre les paragraphes
4. Peut utiliser des titres, listes et autres éléments markdown pour améliorer la structure

Veuillez générer un résumé structuré du contenu du podcast avec les points clés et le contenu essentiel. La sortie doit suivre les exigences de format markdown. **Doit générer la sortie en français.**`,

        de: `Sie sind ein professioneller Podcast-Content-Analyst. Bitte erstellen Sie eine umfassende, strukturierte Zusammenfassung für die folgende Podcast-Episode:

Zusammenfassungsanforderungen:
1. Hauptthemen und zentrale Standpunkte des Podcasts extrahieren
2. Klare logische Struktur beibehalten, die den zentralen Wert des Podcasts hervorhebt
3. Wichtige Diskussionen, Standpunkte und Schlussfolgerungen einbeziehen
4. Präzise und klare Sprache verwenden
5. Ausdrucksstil und wichtige Standpunkte der Moderatoren/Gäste angemessen bewahren

Formatanforderungen (Wichtig):
1. Muss Inhalte nach Themen oder logischen Segmenten organisieren
2. Jeder Absatz muss durch eine Leerzeile getrennt sein (doppelter Zeilenumbruch)
3. Sicherstellen, dass die Ausgabe im Standard-Markdown-Format mit Leerzeilen zwischen Absätzen ist
4. Kann Überschriften, Listen und andere Markdown-Elemente zur Strukturverbesserung verwenden

Bitte erstellen Sie eine strukturierte Zusammenfassung des Podcast-Inhalts mit Schlüsselpunkten und wesentlichen Inhalten. Die Ausgabe muss den Markdown-Formatanforderungen entsprechen. **Muss die Ausgabe auf Deutsch generieren.**`
    };

    return prompts[outputLanguage] || prompts.en;
}

/**
 * 直接生成总结（适用于中等长度文本）
 */
async function generateDirectSummary(transcript, outputLanguage) {
    const systemPrompt = getSystemPromptByLanguage(outputLanguage);

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: transcript }
            ],
            temperature: 0.5,
        max_tokens: Math.min(3000, Math.floor(transcript.length * 0.4))
        });

        const summary = response.choices[0].message.content.trim();
    const formattedSummary = ensureMarkdownParagraphs(summary);
    console.log(`📄 总结生成完成: ${formattedSummary.length} 字符`);
    
    return formattedSummary;
}

/**
 * 智能分块总结（适用于超长文本）
 */
async function generateSmartChunkedSummary(transcript, outputLanguage) {
    try {
        const maxCharsPerChunk = 4000; // 每块最大字符数，约2000-4000 tokens
        
        // 智能分块：按段落和句子边界分割
        const chunks = smartChunkText(transcript, maxCharsPerChunk);
        console.log(`📊 文本分为 ${chunks.length} 块进行总结`);
        
        // 为每个分块生成简要总结
        const chunkSummaries = [];
        for (let i = 0; i < chunks.length; i++) {
            console.log(`🔄 总结第 ${i + 1}/${chunks.length} 块 (${chunks[i].length} 字符)`);
            
            try {
                // 直接调用OpenAI生成分块总结，避免递归
                const chunkSummary = await generateChunkSummary(chunks[i], outputLanguage);
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
        const combinedSummary = chunkSummaries.join('\n\n---\n\n');
        
        // 最终整合成完整总结
        const finalSummary = await generateFinalSummary(combinedSummary, outputLanguage);
        console.log(`✅ 智能分块总结完成: ${transcript.length} → ${finalSummary.length} 字符`);
        
        return finalSummary;

    } catch (error) {
        console.error('❌ 智能分块总结失败:', error.message);
        throw error;
    }
}

/**
 * 智能文本分块函数
 */
function smartChunkText(text, maxCharsPerChunk) {
    const chunks = [];
    
    // 首先按段落分割
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
        let currentChunk = '';
        
    for (const paragraph of paragraphs) {
        const testChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
        
            if (testChunk.length > maxCharsPerChunk && currentChunk) {
            // 当前块已满，保存并开始新块
                chunks.push(currentChunk.trim());
            currentChunk = paragraph;
            } else {
                currentChunk = testChunk;
            }
        }
        
    // 添加最后一块
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
    // 如果某些块仍然太大，进一步按句子分割
        const finalChunks = [];
        for (const chunk of chunks) {
            if (chunk.length <= maxCharsPerChunk) {
                finalChunks.push(chunk);
            } else {
            // 按句子分割
            const sentences = chunk.split(/[。！？.!?]+/).filter(s => s.trim());
            let sentenceChunk = '';
            
            for (const sentence of sentences) {
                const testSentenceChunk = sentenceChunk + (sentenceChunk ? '。' : '') + sentence;
                if (testSentenceChunk.length > maxCharsPerChunk && sentenceChunk) {
                    finalChunks.push(sentenceChunk.trim());
                    sentenceChunk = sentence;
                } else {
                    sentenceChunk = testSentenceChunk;
                }
            }
            
            if (sentenceChunk.trim()) {
                finalChunks.push(sentenceChunk.trim());
            }
        }
    }
    
    return finalChunks;
}

/**
 * 获取分块总结的系统提示词
 */
function getChunkSummaryPrompt(outputLanguage) {
    const prompts = {
        zh: `请为这段播客内容生成简要总结，要求：
1. 提取主要观点和关键信息
2. 保持简洁但不遗漏重要内容
3. 使用中文输出
4. 保持逻辑清晰
5. **严格排除广告、赞助商内容、制作信息、播客元信息等无价值内容**

这是播客的一部分内容，请生成这部分的要点总结：`,
        en: `Please generate a brief summary for this podcast segment, requirements:
1. Extract main viewpoints and key information
2. Keep concise but don't miss important content
3. Output in English
4. Maintain clear logic
5. **Strictly exclude advertisements, sponsor content, production information, podcast meta-information and other non-valuable content**

This is part of a podcast, please generate key points summary for this segment:`,
        es: `Por favor, genera un resumen breve para este segmento del podcast, requisitos:
1. Extraer los puntos de vista principales e información clave
2. Mantener conciso pero no perder contenido importante
3. Generar salida en español
4. Mantener lógica clara

Esta es parte de un podcast, por favor genera un resumen de puntos clave para este segmento:`,
        fr: `Veuillez générer un résumé bref pour ce segment de podcast, exigences :
1. Extraire les points de vue principaux et informations clés
2. Rester concis mais ne pas manquer de contenu important
3. Générer la sortie en français
4. Maintenir une logique claire

Ceci est une partie d'un podcast, veuillez générer un résumé des points clés pour ce segment :`,
        de: `Bitte erstellen Sie eine kurze Zusammenfassung für dieses Podcast-Segment, Anforderungen:
1. Hauptstandpunkte und Schlüsselinformationen extrahieren
2. Prägnant bleiben, aber keine wichtigen Inhalte verpassen
3. Ausgabe auf Deutsch generieren
4. Klare Logik beibehalten

Dies ist ein Teil eines Podcasts, bitte erstellen Sie eine Zusammenfassung der Schlüsselpunkte für dieses Segment:`
    };
    
    return prompts[outputLanguage] || prompts.en;
}

/**
 * 生成单个分块的总结
 */
async function generateChunkSummary(chunkText, outputLanguage) {
    const systemPrompt = getChunkSummaryPrompt(outputLanguage);

    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: chunkText }
        ],
        temperature: 0.3,
        max_tokens: 800
    });

    const chunkSummary = response.choices[0].message.content.trim();
    return ensureMarkdownParagraphs(chunkSummary);
}

/**
 * 获取最终整合总结的系统提示词
 */
function getFinalSummaryPrompt(outputLanguage) {
    const prompts = {
        zh: `请将以下分段总结整合成一个完整、连贯的播客总结：

要求：
1. 去除重复内容，保持逻辑清晰
2. 按主题或时间顺序重新组织内容
3. 每个段落之间必须有一个空行分隔（两个换行符）
4. 确保输出的是标准markdown格式，段落间有空行
5. 使用简洁明了的中文
6. **必须使用中文输出**
7. 形成一个完整的播客内容总结
8. **必须严格排除广告、赞助商内容、制作信息、播客元信息等所有无价值内容**

请整理为结构化的播客总结：`,
        en: `Please integrate the following segmented summaries into a complete, coherent podcast summary:

Requirements:
1. Remove duplicate content and maintain clear logic
2. Reorganize content by themes or chronological order
3. Each paragraph must be separated by a blank line (double line breaks)
4. Ensure output is in standard markdown format with blank lines between paragraphs
5. Use concise and clear English
6. **Must output in English**
7. Form a complete podcast content summary
8. **Must strictly exclude advertisements, sponsor content, production information, podcast meta-information and all other non-valuable content**

Please organize into a structured podcast summary:`,
        es: `Por favor, integra los siguientes resúmenes segmentados en un resumen completo y coherente del podcast:

Requisitos:
1. Eliminar contenido duplicado y mantener lógica clara
2. Reorganizar contenido por temas u orden cronológico
3. Cada párrafo debe estar separado por una línea en blanco (doble salto de línea)
4. Asegurar que la salida esté en formato markdown estándar con líneas en blanco entre párrafos
5. Usar español conciso y claro
6. **Debe generar la salida en español**
7. Formar un resumen completo del contenido del podcast

Por favor, organiza en un resumen estructurado del podcast:`,
        fr: `Veuillez intégrer les résumés segmentés suivants en un résumé complet et cohérent du podcast :

Exigences :
1. Supprimer le contenu dupliqué et maintenir une logique claire
2. Réorganiser le contenu par thèmes ou ordre chronologique
3. Chaque paragraphe doit être séparé par une ligne vide (double saut de ligne)
4. S'assurer que la sortie soit en format markdown standard avec des lignes vides entre les paragraphes
5. Utiliser un français concis et clair
6. **Doit générer la sortie en français**
7. Former un résumé complet du contenu du podcast

Veuillez organiser en un résumé structuré du podcast :`,
        de: `Bitte integrieren Sie die folgenden segmentierten Zusammenfassungen in eine vollständige, kohärente Podcast-Zusammenfassung:

Anforderungen:
1. Doppelte Inhalte entfernen und klare Logik beibehalten
2. Inhalte nach Themen oder chronologischer Reihenfolge neu organisieren
3. Jeder Absatz muss durch eine Leerzeile getrennt sein (doppelter Zeilenumbruch)
4. Sicherstellen, dass die Ausgabe im Standard-Markdown-Format mit Leerzeilen zwischen Absätzen ist
5. Prägnantes und klares Deutsch verwenden
6. **Muss die Ausgabe auf Deutsch generieren**
7. Eine vollständige Podcast-Inhaltszusammenfassung bilden

Bitte organisieren Sie als strukturierte Podcast-Zusammenfassung:`
    };
    
    return prompts[outputLanguage] || prompts.en;
}

/**
 * 生成最终整合总结
 */
async function generateFinalSummary(combinedSummary, outputLanguage) {
    const systemPrompt = getFinalSummaryPrompt(outputLanguage);

    const response = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
            { role: "system", content: systemPrompt },
                    { role: "user", content: combinedSummary }
                ],
                temperature: 0.3,
        max_tokens: 2500
    });

    const finalSummary = response.choices[0].message.content.trim();
    return ensureMarkdownParagraphs(finalSummary);
}

/**
 * 格式化单个文本块（不进行分块检查，避免递归）
 */
async function formatSingleChunk(chunkText, transcriptLanguage = 'zh') {
    try {
        const prompt = transcriptLanguage === 'zh' ? 
            `请对以下音频转录文本进行智能优化和格式化，要求：

**内容优化（正确性与可读性优先）：**
1. **修复所有明显错误** - 包括转录错误、断句错误、不完整词句等
2. 纠正错别字和拼写错误，修正同音字混淆
3. 智能识别并修正品牌名称、专有名词的音译错误
4. **适度改善语法和表达** - 在保持原意的前提下，让表达更清晰流畅
5. **保留重要的口语特征** - 保持语气词（嗯、啊、那个等），但可以删除过多的重复
6. **补全不完整表达** - 根据上下文补全明显缺失的词语，提高可读性
7. **严格保持原始语言** - 不要翻译，保持原意和主要观点不变
8. 添加适当的标点符号，提升阅读体验

**格式优化（播客对话分段优先）：**
1. **智能识别播客对话结构并按对话逻辑分段**：
   - **问答边界分段** - 当主持人提出问题和嘉宾开始回答时分段
   - **发言人转换分段** - 当发言人从一个人转换到另一个人时分段
   - **话题转换分段** - 当讨论主题发生明显转换时分段
   - **完整思路分段** - 当一个完整的观点或论述表达完毕时分段
2. **保持对话的自然流程** - 每个段落应该是一个相对完整的对话单元
3. 每个段落之间必须有一个空行分隔（两个换行符）
4. **适度保留口语特征** - 保持自然的语气词和对话特色，但删除影响阅读的过度重复
5. 确保输出的是标准markdown格式，段落间有空行
6. 让播客对话具有良好的阅读流畅性和对话感

**核心原则：生成清晰、易读、准确的播客转录文本，在保持原意的前提下优化对话表达质量。**

**特别注意：如果文本开头有[上文续：...]标记，这是为了提供上下文避免断句错误。请遵循以下规则：
1. 利用上下文理解句子的完整含义，确保优化的连贯性
2. 绝对不要在输出中包含[上文续：...]标记
3. 绝对不要重复输出上下文中已有的内容
4. 只优化和输出标记后的新内容部分**

原始转录文本：
${chunkText}` :
            `Please intelligently optimize and format the following audio transcript text:

**Content Optimization (Accuracy & Readability First):**
1. **Fix all obvious errors** - Including transcription errors, fragment errors, incomplete words/sentences
2. Correct typos and spelling errors, fix homophone confusions
3. Intelligently identify and correct brand names and proper noun transcription errors
4. **Moderately improve grammar and expression** - Make expressions clearer and more fluent while preserving original meaning
5. **Preserve important speaking characteristics** - Keep natural filler words (um, ah, like, you know, etc.) but remove excessive repetitions
6. **Complete incomplete expressions** - Use context to complete obviously missing words for better readability
7. **Strictly maintain original language** - No translation, preserve original meaning and main points
8. Add appropriate punctuation to enhance reading experience

**Format Optimization (Podcast Dialogue Segmentation Priority):**
1. **Intelligently recognize podcast dialogue structure and segment by conversational logic**:
   - **Question-Answer boundary segmentation** - Create breaks when hosts ask questions and guests begin answering
   - **Speaker transition segmentation** - Create breaks when speakers change from one person to another
   - **Topic transition segmentation** - Create breaks when discussion topics clearly shift
   - **Complete thought segmentation** - Create breaks when a complete viewpoint or argument is fully expressed
2. **Maintain natural conversation flow** - Each paragraph should be a relatively complete conversational unit
3. Each paragraph must be separated by a blank line (double line breaks)
4. **Moderately preserve speaking characteristics** - Keep natural filler words and conversational style but remove excessive repetitions that hinder reading
5. Ensure output is in standard markdown format with blank lines between paragraphs
6. Make podcast dialogue have good reading fluency and conversational feel

**Core Principle: Generate clear, readable, and accurate podcast transcript text that optimizes dialogue expression quality while preserving original meaning.**

**Special Note: If the text begins with [Context continued: ...] markers, this is provided to avoid fragmentation errors. Please follow these rules:
1. Use the context to understand the complete meaning of sentences and ensure optimization coherence
2. Absolutely do not include [Context continued: ...] markers in your output
3. Absolutely do not repeat content that already exists in the context
4. Only optimize and output the new content part after the marker**

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

        const optimizedText = response.choices[0].message.content.trim();
        return ensureMarkdownParagraphs(optimizedText);
        
    } catch (error) {
        console.error('❌ 单块文本优化失败:', error.message);
        return chunkText; // 失败时返回原文本
    }
}

/**
 * 检测转录文本的实际语言，用于选择合适的优化提示词
 * @param {string} transcript - 转录文本
 * @param {string} audioLanguage - 用户指定的音频语言
 * @returns {string} - 检测到的语言代码
 */
function detectTranscriptLanguage(transcript, audioLanguage) {
    // 如果用户明确指定了音频语言，直接使用
    if (audioLanguage && audioLanguage !== 'auto') {
        return audioLanguage;
    }
    
    // 简单的语言检测逻辑
    const text = transcript.substring(0, 1000); // 取前1000个字符进行检测
    
    // 检测中文字符比例
    const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
    const chineseRatio = chineseChars.length / text.length;
    
    // 检测拉丁字符比例（包括英文、西班牙文、法文、德文等）
    const latinChars = text.match(/[a-zA-ZÀ-ÿ]/g) || [];
    const latinRatio = latinChars.length / text.length;
    
    // 检测日文字符
    const japaneseChars = text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || [];
    const japaneseRatio = japaneseChars.length / text.length;
    
    // 检测韩文字符
    const koreanChars = text.match(/[\uac00-\ud7af]/g) || [];
    const koreanRatio = koreanChars.length / text.length;
    
    // 检测俄文字符
    const cyrillicChars = text.match(/[\u0400-\u04ff]/g) || [];
    const cyrillicRatio = cyrillicChars.length / text.length;
    
    // 根据字符比例判断语言
    if (chineseRatio > 0.3) {
        console.log(`🔍 检测到中文内容，使用中文优化提示词 (中文字符比例: ${(chineseRatio * 100).toFixed(1)}%)`);
        return 'zh';
    } else if (japaneseRatio > 0.1) {
        console.log(`🔍 检测到日文内容，使用英文优化提示词 (日文字符比例: ${(japaneseRatio * 100).toFixed(1)}%)`);
        return 'en';
    } else if (koreanRatio > 0.1) {
        console.log(`🔍 检测到韩文内容，使用英文优化提示词 (韩文字符比例: ${(koreanRatio * 100).toFixed(1)}%)`);
        return 'en';
    } else if (cyrillicRatio > 0.3) {
        console.log(`🔍 检测到俄文内容，使用英文优化提示词 (俄文字符比例: ${(cyrillicRatio * 100).toFixed(1)}%)`);
        return 'en';
    } else if (latinRatio > 0.5) {
        console.log(`🔍 检测到拉丁字符内容（英文/西班牙文/法文等），使用英文优化提示词 (拉丁字符比例: ${(latinRatio * 100).toFixed(1)}%)`);
        return 'en';
    } else {
        // 默认使用英文提示词，但不改变转录内容语言
        console.log(`🔍 语言检测不确定，默认使用英文优化提示词`);
        return 'en';
    }
}

/**
 * 确保文本段落格式正确，添加必要的空行
 * @param {string} text - 需要格式化的文本
 * @returns {string} - 格式化后的文本
 */
function ensureMarkdownParagraphs(text) {
    if (!text) return text;
    
    let formatted = text;
    
    // 第一步：标准化换行符
    formatted = formatted.replace(/\r\n/g, '\n'); // 统一换行符
    
    // 第二步：确保Markdown元素后有正确的段落分隔
    // 标题后面确保有双换行
    formatted = formatted.replace(/(^#{1,6}\s+.*)\n([^\n#])/gm, '$1\n\n$2');
    
    // 列表项后确保有段落分隔
    formatted = formatted.replace(/(\n[-*+]\s+.*)\n([^\n\-*+\s])/g, '$1\n\n$2');
    
    // 引用块后确保有段落分隔
    formatted = formatted.replace(/(\n>.*)\n([^\n>])/g, '$1\n\n$2');
    
    // 第三步：清理格式
    // 移除行首尾多余空格
    const lines = formatted.split('\n');
    const cleanedLines = lines.map(line => line.trim());
    formatted = cleanedLines.join('\n');
    
    // 标准化段落间距：最多保留双换行
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // 移除开头和结尾的空行
    formatted = formatted.replace(/^\n+/, '').replace(/\n+$/, '');
    
    return formatted;
}

/**
 * 智能分割超长文本块，避免在句子中间分割
 */
function smartSplitLongChunk(text, maxCharsPerChunk) {
    const chunks = [];
    let currentPos = 0;
    
    while (currentPos < text.length) {
        let endPos = Math.min(currentPos + maxCharsPerChunk, text.length);
        
        // 如果不是最后一块，寻找安全的分割点
        if (endPos < text.length) {
            // 优先在句子边界分割
            const sentenceEnd = text.lastIndexOf('.', endPos);
            const questionEnd = text.lastIndexOf('?', endPos);
            const exclamationEnd = text.lastIndexOf('!', endPos);
            const chinesePeriod = text.lastIndexOf('。', endPos);
            const chineseQuestion = text.lastIndexOf('？', endPos);
            const chineseExclamation = text.lastIndexOf('！', endPos);
            
            const sentenceBoundary = Math.max(sentenceEnd, questionEnd, exclamationEnd, 
                                            chinesePeriod, chineseQuestion, chineseExclamation);
            
            if (sentenceBoundary > currentPos + maxCharsPerChunk * 0.7) {
                endPos = sentenceBoundary + 1;
            } else {
                // 在单词边界分割（空格）
                const spaceBoundary = text.lastIndexOf(' ', endPos);
                if (spaceBoundary > currentPos + maxCharsPerChunk * 0.8) {
                    endPos = spaceBoundary;
                }
                // 如果找不到好的分割点，保持原来的endPos（但这种情况很少）
            }
        }
        
        chunks.push(text.substring(currentPos, endPos).trim());
        currentPos = endPos;
    }
    
    return chunks.filter(chunk => chunk.length > 0);
}

/**
 * 检测两段文本之间的重复内容
 */
function findOverlapBetweenTexts(text1, text2) {
    let overlap = '';
    const maxLength = Math.min(text1.length, text2.length);
    
    // 从最长可能的重复开始检查，逐渐减少长度
    for (let length = maxLength; length >= 20; length--) {
        const suffix = text1.slice(-length);
        const prefix = text2.slice(0, length);
        
        if (suffix === prefix) {
            overlap = suffix;
            break;
        }
    }
    
    return overlap;
}

/**
 * 分块处理超长转录文本
 */
async function formatLongTranscriptInChunks(rawTranscript, transcriptLanguage, maxCharsPerChunk) {
    try {
        // 智能分块：确保不在句子中间分割，保持上下文完整性
        let chunks = [];
        
        // 使用更智能的分句方式，支持中英文标点
        const sentences = rawTranscript.split(/([。！？\.!?]+\s*)/).filter(s => s.trim());
        let currentChunk = '';
        
        for (let i = 0; i < sentences.length; i += 2) {
            const sentence = sentences[i] + (sentences[i + 1] || '');
            const testChunk = currentChunk + sentence;
            
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
        
        // 对于仍然超长的块，使用更安全的分割方式
        const finalChunks = [];
        for (const chunk of chunks) {
            if (chunk.length <= maxCharsPerChunk) {
                finalChunks.push(chunk);
            } else {
                // 寻找安全的分割点（空格、标点符号）
                const safeChunks = smartSplitLongChunk(chunk, maxCharsPerChunk);
                finalChunks.push(...safeChunks);
            }
        }
        
        chunks = finalChunks;
        
        console.log(`📊 文本分为 ${chunks.length} 块处理`);
        
        const optimizedChunks = [];
        for (let i = 0; i < chunks.length; i++) {
            console.log(`🔄 处理第 ${i + 1}/${chunks.length} 块 (${chunks[i].length} 字符)`);
            
            try {
                // 为非首块添加前文上下文，避免断句错误
                let chunkWithContext = chunks[i];
                let contextMarker = '';
                if (i > 0) {
                    // 取前一块的最后100字符作为上下文
                    const prevContext = chunks[i - 1].slice(-100);
                    
                    // 根据语言使用对应的上下文标记
                    if (transcriptLanguage === 'zh') {
                        contextMarker = `[上文续：${prevContext}]`;
                    } else {
                        contextMarker = `[Context continued: ${prevContext}]`;
                    }
                    
                    chunkWithContext = `${contextMarker}\n\n${chunks[i]}`;
                    console.log(`📎 第 ${i + 1} 块添加了上下文 (${prevContext.length} 字符)`);
                }
                
                // 调用优化函数
                let optimizedChunk = await formatSingleChunk(chunkWithContext, transcriptLanguage);
                
                // 如果添加了上下文，移除上下文标记部分
                if (i > 0) {
                    // 移除中文或英文的上下文标记
                    optimizedChunk = optimizedChunk.replace(/^\[(上文续|Context continued)：?:?.*?\]\s*/s, '');
                }
                
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
        
        // 智能去重：检测相邻块之间的重复内容
        const deduplicatedChunks = [];
        for (let i = 0; i < optimizedChunks.length; i++) {
            let currentChunk = optimizedChunks[i];
            
            if (i > 0 && deduplicatedChunks.length > 0) {
                // 检查当前块开头是否与前一块结尾重复
                const prevChunk = deduplicatedChunks[deduplicatedChunks.length - 1];
                const prevEnd = prevChunk.slice(-200); // 取前一块的最后200字符
                const currentStart = currentChunk.slice(0, 200); // 取当前块的前200字符
                
                // 寻找重复的句子或片段
                const overlapMatch = findOverlapBetweenTexts(prevEnd, currentStart);
                if (overlapMatch.length > 20) { // 如果重复内容超过20字符
                    console.log(`🔍 检测到重复内容，自动去重: ${overlapMatch.length} 字符`);
                    currentChunk = currentChunk.substring(overlapMatch.length);
                }
            }
            
            if (currentChunk.trim()) {
                deduplicatedChunks.push(currentChunk);
            }
        }
        
        const combinedText = deduplicatedChunks.join('\n\n');
        const result = ensureMarkdownParagraphs(combinedText);
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