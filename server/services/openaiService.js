const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// 初始化OpenAI客户端
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

/**
 * 使用OpenAI处理音频文件
 * @param {Object} options - 处理选项
 * @param {string} options.audioFilePath - 音频文件路径
 * @param {string} options.operation - 操作类型 ('transcribe_only' | 'transcribe_summarize')
 * @param {string} options.audioLanguage - 音频语言（可选）
 * @param {string} options.outputLanguage - 输出语言
 * @returns {Promise<Object>} 处理结果
 */
async function processAudioWithOpenAI({
    audioFilePath,
    operation,
    audioLanguage,
    outputLanguage
}) {
    try {
        // 检查文件是否存在
        if (!fs.existsSync(audioFilePath)) {
            throw new Error('音频文件不存在 / Audio file not found');
        }

        // 获取文件大小 (OpenAI Whisper 限制25MB)
        const stats = fs.statSync(audioFilePath);
        const fileSizeInMB = stats.size / (1024 * 1024);
        
        if (fileSizeInMB > 25) {
            throw new Error('音频文件过大，OpenAI Whisper API限制为25MB。请检查压缩服务是否正常工作。 / Audio file too large, OpenAI Whisper API limit is 25MB. Please check if compression service is working properly.');
        }

        console.log(`开始转录音频文件: ${audioFilePath} (${fileSizeInMB.toFixed(2)}MB)`);

        // 步骤1: 使用Whisper转录音频
        const transcription = await transcribeAudio(audioFilePath, audioLanguage);
        
        const result = {
            transcript: transcription.text
        };

        // 步骤2: 如果需要总结，使用GPT生成总结
        if (operation === 'transcribe_summarize') {
            console.log('生成AI总结...');
            const summary = await generateSummary(transcription.text, outputLanguage);
            result.summary = summary;
        }

        return result;

    } catch (error) {
        console.error('OpenAI处理错误:', error);
        throw error;
    }
}

/**
 * 使用OpenAI Whisper转录音频
 */
async function transcribeAudio(audioFilePath, language) {
    try {
        const audioStream = fs.createReadStream(audioFilePath);
        
        const transcriptionOptions = {
            file: audioStream,
            model: 'whisper-1',
            response_format: 'verbose_json',
            timestamp_granularities: ['word']
        };

        // 如果指定了语言，添加到选项中
        if (language) {
            transcriptionOptions.language = language;
        }

        const transcription = await openai.audio.transcriptions.create(transcriptionOptions);
        
        return transcription;

    } catch (error) {
        console.error('音频转录错误:', error);
        if (error.code === 'file_too_large') {
            throw new Error('音频文件过大 / Audio file too large');
        } else if (error.code === 'unsupported_file_type') {
            throw new Error('不支持的音频格式 / Unsupported audio format');
        } else {
            throw new Error(`转录失败: ${error.message} / Transcription failed: ${error.message}`);
        }
    }
}

/**
 * 使用OpenAI GPT生成总结
 */
async function generateSummary(transcript, outputLanguage) {
    try {
        const isChineseOutput = outputLanguage === 'zh';
        
        const systemPrompt = isChineseOutput 
            ? `你是一个专业的内容总结助手。请为播客转录内容提供结构化的中文总结。

总结应该包括：
1. 核心主题和关键观点
2. 重要的讨论要点
3. 实用的建议或结论
4. 关键数据或事实

请用清晰、简洁的中文表达，分段组织内容，让读者能快速理解播客的主要内容。`
            : `You are a professional content summarization assistant. Please provide a structured English summary of the podcast transcript.

The summary should include:
1. Core themes and key viewpoints
2. Important discussion points
3. Practical advice or conclusions
4. Key data or facts

Please express in clear, concise English, organize content in paragraphs, so readers can quickly understand the main content of the podcast.`;

        const userPrompt = isChineseOutput
            ? `请为以下播客转录内容生成一个详细的中文总结：\n\n${transcript}`
            : `Please generate a detailed English summary for the following podcast transcript:\n\n${transcript}`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 1000,
            temperature: 0.7
        });

        return completion.choices[0].message.content.trim();

    } catch (error) {
        console.error('总结生成错误:', error);
        throw new Error(`总结生成失败: ${error.message} / Summary generation failed: ${error.message}`);
    }
}

module.exports = {
    processAudioWithOpenAI
};
