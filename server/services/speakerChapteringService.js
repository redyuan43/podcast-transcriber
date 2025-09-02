/**
 * Speaker-based Chaptering Service
 * 基于说话人的分段服务
 */

const { callOllama } = require('./ollamaAnalysisService');

/**
 * 从enhanced transcription结果中解析说话人分段
 */
function parseSpeakerSegments(segments, speakers) {
    const speakerSegments = [];
    let currentSegment = null;
    let currentSpeaker = null;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const speaker = speakers[i] || '未知';

        // 当说话人发生变化时，创建新的segment
        if (speaker !== currentSpeaker) {
            // 保存之前的segment
            if (currentSegment) {
                currentSegment.endTime = segments[i - 1].end;
                currentSegment.text = currentSegment.text.trim();
                speakerSegments.push(currentSegment);
            }

            // 创建新的segment
            currentSegment = {
                speaker: speaker,
                startTime: segment.start,
                endTime: segment.end,
                text: segment.text + ' ',
                segments: [segment]
            };
            currentSpeaker = speaker;
        } else {
            // 同一说话人，继续累加
            if (currentSegment) {
                currentSegment.text += segment.text + ' ';
                currentSegment.endTime = segment.end;
                currentSegment.segments.push(segment);
            }
        }
    }

    // 添加最后一个segment
    if (currentSegment) {
        currentSegment.text = currentSegment.text.trim();
        speakerSegments.push(currentSegment);
    }

    console.log(`✅ 解析完成: 共${speakerSegments.length}个speaker段落`);
    return speakerSegments;
}

/**
 * 为speaker段落生成AI摘要
 */
async function generateSpeakerSummary(speakerSegment, index) {
    console.log(`📝 生成第${index + 1}个段落摘要: ${speakerSegment.speaker}`);
    
    const systemPrompt = `你是一个专业的内容摘要专家，擅长精炼总结对话内容的核心要点。`;
    
    const prompt = `请为以下播客对话段落生成简洁摘要（50-100字）。

说话人：${speakerSegment.speaker}
时间范围：${formatTime(speakerSegment.startTime)} - ${formatTime(speakerSegment.endTime)}
内容：
${speakerSegment.text.substring(0, 2000)}

要求：
1. 提取核心观点和关键信息
2. 保持简洁精炼（50-100字）
3. 突出这段话的主要贡献
4. 使用自然的语言表达

请直接返回摘要文本，无需JSON格式。`;

    const result = await callOllama(prompt, systemPrompt, 0.3, 300);
    
    if (result) {
        return result.trim();
    }
    
    // 降级方案：使用前100字作为摘要
    return speakerSegment.text.substring(0, 100) + '...';
}

/**
 * 批量生成所有speaker段落的摘要
 */
async function generateAllSpeakerSummaries(speakerSegments) {
    console.log(`🎯 开始生成${speakerSegments.length}个speaker段落的摘要...`);
    
    const summaries = [];
    
    for (let i = 0; i < speakerSegments.length; i++) {
        const segment = speakerSegments[i];
        
        const summary = await generateSpeakerSummary(segment, i);
        
        summaries.push({
            id: `speaker-${i}`,
            speaker: segment.speaker,
            startTime: segment.startTime,
            endTime: segment.endTime,
            duration: segment.endTime - segment.startTime,
            text: segment.text,
            summary: summary,
            segmentCount: segment.segments.length,
            timeRange: `${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`
        });
        
        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('✅ 所有speaker摘要生成完成');
    return summaries;
}

/**
 * 确定speaker的布局位置（左侧还是右侧）
 */
function assignSpeakerPositions(speakerSegments) {
    const speakers = [...new Set(speakerSegments.map(s => s.speaker))];
    const speakerPositions = {};
    
    // 简单策略：按出现顺序分配左右位置
    speakers.forEach((speaker, index) => {
        speakerPositions[speaker] = index % 2 === 0 ? 'left' : 'right';
    });
    
    return speakerPositions;
}

/**
 * 生成完整的speaker-based章节数据
 */
async function generateSpeakerChapters(transcriptionResult) {
    try {
        console.log('🎭 开始生成基于说话人的章节...');
        
        const { segments, speakers } = transcriptionResult;
        
        if (!segments || !speakers) {
            console.error('❌ 缺少segments或speakers数据');
            return null;
        }
        
        // 1. 解析speaker分段
        const speakerSegments = parseSpeakerSegments(segments, speakers);
        
        // 2. 生成AI摘要
        const speakerChapters = await generateAllSpeakerSummaries(speakerSegments);
        
        // 3. 分配布局位置
        const speakerPositions = assignSpeakerPositions(speakerChapters);
        
        // 4. 添加位置信息
        speakerChapters.forEach(chapter => {
            chapter.position = speakerPositions[chapter.speaker];
        });
        
        const result = {
            success: true,
            totalSegments: speakerChapters.length,
            speakers: Object.keys(speakerPositions),
            speakerPositions: speakerPositions,
            chapters: speakerChapters,
            statistics: {
                totalDuration: Math.max(...speakerChapters.map(c => c.endTime)),
                averageSegmentDuration: speakerChapters.reduce((sum, c) => sum + c.duration, 0) / speakerChapters.length,
                speakerCount: Object.keys(speakerPositions).length
            }
        };
        
        console.log(`✅ Speaker章节生成完成: ${result.totalSegments}个段落, ${result.statistics.speakerCount}个说话人`);
        return result;
        
    } catch (error) {
        console.error('❌ 生成speaker章节失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
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

module.exports = {
    parseSpeakerSegments,
    generateSpeakerSummary,
    generateAllSpeakerSummaries,
    generateSpeakerChapters,
    assignSpeakerPositions,
    formatTime
};