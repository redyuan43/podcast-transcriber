/**
 * Ollama本地LLM分析服务
 * 使用Ollama提供的OpenAI兼容API进行内容分析
 */

const axios = require('axios');
require('dotenv').config();

// Ollama配置
const OLLAMA_CONFIG = {
    baseURL: process.env.OLLAMA_BASE_URL || 'http://192.168.100.140:11434/v1',
    model: process.env.OLLAMA_MODEL || 'gpt-oss:latest',
    enabled: process.env.USE_OLLAMA === 'true'
};

console.log(`🤖 Ollama配置: ${OLLAMA_CONFIG.enabled ? '已启用' : '未启用'}`);
if (OLLAMA_CONFIG.enabled) {
    console.log(`📡 Ollama服务地址: ${OLLAMA_CONFIG.baseURL}`);
    console.log(`🧠 使用模型: ${OLLAMA_CONFIG.model}`);
}

/**
 * 调用Ollama进行文本分析
 */
async function callOllama(prompt, systemPrompt = '', temperature = 0.7, maxTokens = 2000) {
    if (!OLLAMA_CONFIG.enabled) {
        console.log('⚠️ Ollama未启用，跳过AI分析');
        return null;
    }

    try {
        const response = await axios.post(
            `${OLLAMA_CONFIG.baseURL}/chat/completions`,
            {
                model: OLLAMA_CONFIG.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: temperature,
                max_tokens: maxTokens,
                stream: false
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 120000 // 120秒超时
            }
        );

        if (response.data?.choices?.[0]?.message?.content) {
            return response.data.choices[0].message.content;
        }
        
        return null;
    } catch (error) {
        console.error('❌ Ollama调用失败:', error.message);
        if (error.response) {
            console.error('响应错误:', error.response.data);
        }
        return null;
    }
}

/**
 * 步骤3：宏观主题识别
 * 分析播客内容并识别主要题材
 */
async function identifyMacroTopic(transcript) {
    console.log('🎯 开始识别播客主题...');
    
    const systemPrompt = `你是一个专业的内容分类专家。请分析播客转录文本，识别其主要题材类别。`;
    
    const prompt = `请分析以下播客转录文本，确定其主要题材分类。

转录文本（前2000字）：
${transcript.substring(0, 2000)}

请按照以下格式返回JSON结果：
{
    "mainTopic": "一级分类",
    "subTopic": "二级分类",
    "confidence": 0.9,
    "keywords": ["关键词1", "关键词2", "关键词3"],
    "description": "简短描述"
}

可选的一级分类包括：科技、商业、教育、文化、生活、娱乐、新闻、健康等。
二级分类根据内容具体确定，如：科技>人工智能、商业>创业、教育>职场发展等。`;

    const result = await callOllama(prompt, systemPrompt, 0.3, 500);
    
    if (result) {
        try {
            // 尝试提取JSON部分
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                // 确保有默认值
                parsed.mainTopic = parsed.mainTopic || '通用';
                parsed.subTopic = parsed.subTopic || '未分类';
                parsed.confidence = parsed.confidence || 0.7;
                parsed.keywords = parsed.keywords || [];
                parsed.description = parsed.description || '';
                console.log(`✅ 主题识别完成: ${parsed.mainTopic} > ${parsed.subTopic}`);
                return parsed;
            }
        } catch (e) {
            console.error('⚠️ 解析主题结果失败，返回默认值');
            return {
                mainTopic: "通用",
                subTopic: "未分类",
                confidence: 0.5,
                keywords: [],
                description: "无法确定具体分类"
            };
        }
    }
    
    return null;
}

/**
 * 步骤5：语义分章节
 * 根据内容语义自动划分章节
 */
async function semanticChunking(segments, speakers = []) {
    console.log('📚 开始语义分章节...');
    
    // 准备分段文本，包含时间戳和说话人信息
    let formattedText = segments.map((seg, idx) => {
        const speaker = speakers[idx] || '未知';
        return `[${formatTime(seg.start)}] ${speaker}: ${seg.text}`;
    }).join('\n');
    
    const systemPrompt = `你是一个播客内容结构分析专家，擅长识别话题转换和内容章节划分。`;
    
    const prompt = `请分析以下带时间戳的播客转录文本，识别话题转换点并划分章节。

转录文本：
${formattedText.substring(0, 8000)}

请根据以下标准划分章节：
1. 话题明显转换
2. 讨论主题变化
3. 说话人角色转换（如从介绍转到访谈）
4. 内容深度变化（如从概述转到细节）

返回JSON格式：
{
    "chapters": [
        {
            "title": "章节标题",
            "start": "00:00:00",
            "end": "00:10:00",
            "description": "章节简介",
            "topicShift": "话题转换说明"
        }
    ]
}`;

    const result = await callOllama(prompt, systemPrompt, 0.5, 2000);
    
    if (result) {
        try {
            const parsed = JSON.parse(result);
            console.log(`✅ 章节划分完成: 共${parsed.chapters.length}个章节`);
            return parsed.chapters;
        } catch (e) {
            console.error('⚠️ 解析章节结果失败');
            return autoChunkByTime(segments); // 降级到按时间自动分割
        }
    }
    
    return autoChunkByTime(segments);
}

/**
 * 步骤6：生成章节摘要和关键词
 */
async function generateChapterSummary(chapterText, chapterTitle = '') {
    console.log(`📝 生成章节摘要: ${chapterTitle}`);
    
    const systemPrompt = `你是一个专业的内容摘要专家，擅长提炼核心信息和关键词。`;
    
    const prompt = `请为以下播客章节生成摘要和关键词。

章节标题：${chapterTitle}
章节内容：
${chapterText.substring(0, 3000)}

请返回JSON格式：
{
    "summary": "100-200字的核心内容摘要",
    "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
    "mainPoints": ["要点1", "要点2", "要点3"]
}`;

    const result = await callOllama(prompt, systemPrompt, 0.5, 800);
    
    if (result) {
        try {
            const parsed = JSON.parse(result);
            return parsed;
        } catch (e) {
            console.error('⚠️ 解析摘要结果失败');
            return {
                summary: chapterText.substring(0, 200) + '...',
                keywords: [],
                mainPoints: []
            };
        }
    }
    
    return null;
}

/**
 * 批量生成多个章节的摘要
 */
async function generateAllChapterSummaries(chapters, segments) {
    console.log(`📚 开始生成${chapters.length}个章节的摘要...`);
    
    const summaries = [];
    
    for (const chapter of chapters) {
        // 提取章节对应的文本
        const chapterSegments = extractChapterSegments(
            segments, 
            chapter.start, 
            chapter.end
        );
        
        const chapterText = chapterSegments.map(s => s.text).join(' ');
        
        const summary = await generateChapterSummary(
            chapterText, 
            chapter.title
        );
        
        if (summary) {
            summaries.push({
                ...chapter,
                ...summary
            });
        } else {
            summaries.push(chapter);
        }
        
        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('✅ 所有章节摘要生成完成');
    return summaries;
}

/**
 * 辅助函数：格式化时间
 */
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 辅助函数：时间字符串转秒数
 */
function timeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
}

/**
 * 辅助函数：提取章节对应的片段
 */
function extractChapterSegments(segments, startTime, endTime) {
    const startSec = typeof startTime === 'string' ? timeToSeconds(startTime) : startTime;
    const endSec = typeof endTime === 'string' ? timeToSeconds(endTime) : endTime;
    
    return segments.filter(seg => {
        return seg.start >= startSec && seg.end <= endSec;
    });
}

/**
 * 降级方案：按时间自动分割章节
 */
function autoChunkByTime(segments, chunkDuration = 600) { // 默认10分钟一章
    const chapters = [];
    let currentChapter = {
        title: '第1章',
        start: formatTime(0),
        end: '',
        description: '自动分割章节'
    };
    
    let chapterNum = 1;
    let lastTime = 0;
    
    segments.forEach((seg, idx) => {
        if (seg.start - lastTime > chunkDuration) {
            currentChapter.end = formatTime(lastTime);
            chapters.push(currentChapter);
            
            chapterNum++;
            currentChapter = {
                title: `第${chapterNum}章`,
                start: formatTime(seg.start),
                end: '',
                description: '自动分割章节'
            };
        }
        lastTime = seg.end;
    });
    
    // 添加最后一章
    if (segments.length > 0) {
        currentChapter.end = formatTime(segments[segments.length - 1].end);
        chapters.push(currentChapter);
    }
    
    return chapters;
}

/**
 * 测试Ollama连接
 */
async function testOllamaConnection() {
    console.log('🔍 测试Ollama连接...');
    
    try {
        const response = await axios.get(`${OLLAMA_CONFIG.baseURL}/models`, {
            timeout: 5000
        });
        
        console.log('✅ Ollama连接成功');
        console.log('可用模型:', response.data);
        return true;
    } catch (error) {
        console.error('❌ Ollama连接失败:', error.message);
        return false;
    }
}

module.exports = {
    callOllama,
    identifyMacroTopic,
    semanticChunking,
    generateChapterSummary,
    generateAllChapterSummaries,
    testOllamaConnection,
    formatTime,
    timeToSeconds,
    OLLAMA_CONFIG
};