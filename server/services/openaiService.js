const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// 本地Whisper转录配置
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'base'; // Whisper模型大小
console.log(`🎤 转录模式: 本地Faster-Whisper`);

// 初始化OpenAI客户端（用于总结和文本优化）
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    timeout: 300000, // 5分钟超时（音频转录需要更长时间）
    maxRetries: 0  // 禁用自动重试，我们手动处理
});

/**
 * 处理音频文件（单个或多个片段）
 * @param {Array|string} audioFiles - 音频文件路径数组或单个路径
 * @param {boolean} shouldSummarize - 是否需要总结
 * @param {string} outputLanguage - 输出语言
 * @returns {Promise<Object>} - 处理结果
 */
async function processAudioWithOpenAI(audioFiles, shouldSummarize = false, outputLanguage = 'zh') {
    try {
        console.log(`🤖 开始音频处理 - OpenAI`);
        
        // 确保 audioFiles 是数组
        const files = Array.isArray(audioFiles) ? audioFiles : [audioFiles];
        console.log(`📄 处理文件数量: ${files.length}`);

        let transcript = '';

        if (files.length === 1) {
            // 单文件处理
            console.log(`🎵 单文件处理模式`);
            transcript = await transcribeAudio(files[0], true); // 自动检测语言
        } else {
            // 多文件并发处理
            console.log(`🎬 多文件并发处理模式`);
            transcript = await transcribeMultipleAudios(files, outputLanguage);
        }

        let result = {
            transcript: transcript,
            language: outputLanguage
        };

        if (shouldSummarize) {
            console.log(`📝 开始生成总结...`);
            const summary = await generateSummary(transcript, outputLanguage);
            result.summary = summary;
        }

        console.log(`✅ 音频处理完成`);
        return result;

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
async function transcribeMultipleAudios(audioFiles, outputLanguage) {
    try {
        console.log(`🔄 开始串行转录 ${audioFiles.length} 个音频片段（避免API过载）...`);
        
        // 分批处理音频片段，避免并发过载，使用重试机制
        const batchSize = 1; // 每批最多1个文件 - 完全串行处理
        const transcriptions = [];
        
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
                        const result = await transcribeAudio(file, true); // 始终自动检测语言
                        console.log(`   ✅ 片段 ${index + 1} 转录完成 (${result.length} 字符)`);
                        return {
                            index,
                            text: result,
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
async function transcribeAudioLocal(audioPath, language = null) {
    try {
        console.log(`🎤 本地转录: ${path.basename(audioPath)}`);
        
        // 构建Python命令
        const scriptPath = path.join(__dirname, '..', 'whisper_transcribe.py');
        let command = `python3 "${scriptPath}" "${audioPath}" --model ${WHISPER_MODEL}`;
        
        if (language) {
            command += ` --language ${language}`;
        }
        
        console.log(`⚙️ 执行命令: ${command}`);
        
        // 执行转录脚本
        const { stdout, stderr } = await execAsync(command, {
            maxBuffer: 1024 * 1024 * 10, // 10MB缓冲区
            timeout: 600000 // 10分钟超时
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
 * 生成音频内容总结
 * @param {string} transcript - 转录文本
 * @param {string} outputLanguage - 输出语言
 * @returns {Promise<string>} - 总结文本
 */
async function generateSummary(transcript, outputLanguage = 'zh') {
    try {
        console.log(`📋 生成总结 (${outputLanguage})...`);
        
        const systemPrompt = outputLanguage === 'zh'
            ? `你是一个专业的内容总结助手。请为以下音频转录内容生成一个全面、结构化的总结：

总结要求：
1. 提取主要话题和关键信息
2. 保持逻辑结构清晰
3. 包含重要的观点、数据和结论
4. 使用简洁明了的语言
5. 适当保留说话者的表达风格
6. 总结长度约为原文的20-30%

请生成结构化的总结，包含要点和关键内容。`

            : `You are a professional content summarization assistant. Please generate a comprehensive, structured summary for the following audio transcript:

Summary requirements:
1. Extract main topics and key information
2. Maintain clear logical structure
3. Include important viewpoints, data, and conclusions
4. Use concise and clear language
5. Appropriately retain the speaker's expression style
6. Summary length should be about 20-30% of the original text

Please generate a structured summary with key points and essential content.`;

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

module.exports = {
    processAudioWithOpenAI,
    transcribeAudio,
    transcribeAudioLocal,
    transcribeMultipleAudios,
    optimizeTranscriptContinuity,
    generateSummary
};