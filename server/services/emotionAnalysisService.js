/**
 * 情感分析服务
 * 结合关键词匹配和AI语义分析，提供更准确的情感识别
 */

class EmotionAnalysisService {
    constructor(ollamaService = null) {
        this.ollamaService = ollamaService;
        
        // 基础情感关键词库（从Python代码迁移过来）
        this.emotionKeywords = {
            '喜悦': ['哈哈', '呵呵', '嘿嘿', '咯咯', '哈哈哈', '呵呵呵', '开心', '高兴', '兴奋'],
            '惊讶': ['哇', '哎呀', '天哪', '我的天', '什么', '真的吗', '不会吧', '这么厉害'],
            '思考': ['嗯', '额', '这个', '那个', '就是说', '让我想想', '其实'],
            '赞同': ['对对对', '是的是的', '没错', '确实', '对啊', '同意', '赞同'],
            '疑问': ['为什么', '怎么', '什么时候', '哪里', '如何'],
            '担忧': ['担心', '焦虑', '不安', '忧虑', '害怕'],
            '愤怒': ['生气', '愤怒', '气死了', '烦死了', '讨厌'],
            '悲伤': ['难过', '伤心', '痛苦', '失落', '沮丧'],
            '平静': ['冷静', '平静', '淡定', '稳定']
        };
        
        // 情感强度权重
        this.intensityWeights = {
            '非常': 2.0,
            '特别': 1.8,
            '很': 1.5,
            '比较': 1.2,
            '有点': 0.8,
            '稍微': 0.6
        };
    }

    /**
     * 基于关键词的基础情感检测（快速）
     */
    detectBasicEmotions(text) {
        const emotions = [];
        const emotionScores = {};
        
        // 关键词匹配
        for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
            let score = 0;
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    score += 1;
                }
            }
            
            if (score > 0) {
                // 检测强度修饰词
                let intensity = 1.0;
                for (const [modifier, weight] of Object.entries(this.intensityWeights)) {
                    if (text.includes(modifier)) {
                        intensity = Math.max(intensity, weight);
                    }
                }
                
                emotionScores[emotion] = score * intensity;
                emotions.push({
                    emotion: emotion,
                    confidence: Math.min(score * intensity / 3, 1.0), // 归一化到0-1
                    method: 'keyword'
                });
            }
        }
        
        // 检测标点符号情感
        if (text.includes('?') || text.includes('？')) {
            emotions.push({
                emotion: '疑问',
                confidence: 0.7,
                method: 'punctuation'
            });
        }
        
        if (text.includes('!') || text.includes('！')) {
            emotions.push({
                emotion: '激动',
                confidence: 0.6,
                method: 'punctuation'
            });
        }
        
        // 检测重复字符（表示强调）
        if (/(.)\1{2,}/.test(text)) {
            emotions.push({
                emotion: '强调',
                confidence: 0.8,
                method: 'repetition'
            });
        }
        
        return emotions;
    }

    /**
     * 使用AI进行深度情感分析（精确但较慢）
     */
    async analyzeEmotionWithAI(text, contextSegments = []) {
        if (!this.ollamaService) {
            console.log('⚠️ Ollama服务未配置，使用基础情感检测');
            return this.detectBasicEmotions(text);
        }

        try {
            // 构建上下文
            let contextText = '';
            if (contextSegments.length > 0) {
                contextText = '\n\n上下文：\n' + contextSegments.map(s => s.text).join('\n');
            }

            const systemPrompt = `你是一个专业的情感分析专家。请分析文本中的情感色彩，包括：
1. 主要情感类型（喜悦、愤怒、悲伤、惊讶、恐惧、厌恶、中性等）
2. 情感强度（0.0-1.0）
3. 情感的具体表现和原因

请以JSON格式返回结果：
{
  "emotions": [
    {
      "emotion": "情感类型",
      "confidence": 0.85,
      "intensity": 0.7,
      "evidence": "支撑证据",
      "method": "ai_analysis"
    }
  ],
  "overall_sentiment": "positive/negative/neutral",
  "sentiment_score": 0.3
}`;

            const userPrompt = `请分析以下文本的情感：

"${text}"${contextText}

请注意这是播客对话内容，分析时考虑口语化表达和语境。`;

            console.log('🤖 使用AI分析情感...');
            const response = await this.ollamaService.callOllama(userPrompt, systemPrompt, 0.3, 300);
            
            // 尝试解析JSON响应
            try {
                const aiResult = JSON.parse(response);
                if (aiResult.emotions && Array.isArray(aiResult.emotions)) {
                    return {
                        emotions: aiResult.emotions,
                        overall_sentiment: aiResult.overall_sentiment || 'neutral',
                        sentiment_score: aiResult.sentiment_score || 0.0,
                        method: 'ai_analysis'
                    };
                }
            } catch (parseError) {
                console.log('⚠️ AI响应格式解析失败，使用基础检测');
            }

        } catch (error) {
            console.error('❌ AI情感分析失败:', error.message);
        }

        // 降级到基础检测
        return {
            emotions: this.detectBasicEmotions(text),
            overall_sentiment: 'neutral',
            sentiment_score: 0.0,
            method: 'fallback'
        };
    }

    /**
     * 混合情感分析（结合关键词和AI）
     */
    async analyzeEmotionHybrid(text, contextSegments = [], useAI = true) {
        const basicEmotions = this.detectBasicEmotions(text);
        
        // 如果基础检测发现了明显情感，且不需要AI，直接返回
        if (!useAI || basicEmotions.length > 0) {
            return {
                emotions: basicEmotions,
                overall_sentiment: this.calculateOverallSentiment(basicEmotions),
                sentiment_score: this.calculateSentimentScore(basicEmotions),
                method: 'basic'
            };
        }
        
        // 对于没有明显关键词的复杂情感，使用AI分析
        const aiResult = await this.analyzeEmotionWithAI(text, contextSegments);
        
        // 合并基础检测和AI分析结果
        return {
            emotions: [...basicEmotions, ...aiResult.emotions],
            overall_sentiment: aiResult.overall_sentiment,
            sentiment_score: aiResult.sentiment_score,
            method: 'hybrid'
        };
    }

    /**
     * 计算整体情感倾向
     */
    calculateOverallSentiment(emotions) {
        const positiveEmotions = ['喜悦', '赞同', '兴奋'];
        const negativeEmotions = ['愤怒', '悲伤', '担忧', '厌恶'];
        
        let positiveScore = 0;
        let negativeScore = 0;
        
        emotions.forEach(emotion => {
            const confidence = emotion.confidence || 0.5;
            if (positiveEmotions.includes(emotion.emotion)) {
                positiveScore += confidence;
            } else if (negativeEmotions.includes(emotion.emotion)) {
                negativeScore += confidence;
            }
        });
        
        if (positiveScore > negativeScore + 0.2) return 'positive';
        if (negativeScore > positiveScore + 0.2) return 'negative';
        return 'neutral';
    }

    /**
     * 计算情感分数（-1到1）
     */
    calculateSentimentScore(emotions) {
        const positiveEmotions = ['喜悦', '赞同', '兴奋'];
        const negativeEmotions = ['愤怒', '悲伤', '担忧', '厌恶'];
        
        let score = 0;
        emotions.forEach(emotion => {
            const confidence = emotion.confidence || 0.5;
            if (positiveEmotions.includes(emotion.emotion)) {
                score += confidence;
            } else if (negativeEmotions.includes(emotion.emotion)) {
                score -= confidence;
            }
        });
        
        // 归一化到-1到1区间
        return Math.max(-1, Math.min(1, score / 2));
    }

    /**
     * 为转录片段批量添加情感分析
     */
    async analyzeSegmentEmotions(segments, useAI = false, batchSize = 10) {
        console.log(`🎭 开始情感分析 (${segments.length}个片段, AI模式: ${useAI})`);
        
        const results = [];
        
        for (let i = 0; i < segments.length; i += batchSize) {
            const batch = segments.slice(i, i + batchSize);
            console.log(`📊 处理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(segments.length/batchSize)}`);
            
            const batchPromises = batch.map(async (segment, index) => {
                // 获取上下文片段（前后各1个）
                const globalIndex = i + index;
                const contextSegments = segments.slice(
                    Math.max(0, globalIndex - 1), 
                    Math.min(segments.length, globalIndex + 2)
                );
                
                const emotionResult = await this.analyzeEmotionHybrid(
                    segment.text, 
                    contextSegments, 
                    useAI
                );
                
                return {
                    ...segment,
                    emotions: emotionResult.emotions,
                    overall_sentiment: emotionResult.overall_sentiment,
                    sentiment_score: emotionResult.sentiment_score,
                    emotion_method: emotionResult.method
                };
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // 避免API请求过于频繁
            if (useAI && i + batchSize < segments.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log('✅ 情感分析完成');
        return results;
    }

    /**
     * 生成情感分析报告
     */
    generateEmotionReport(analyzedSegments) {
        const emotionCounts = {};
        const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
        let totalSentimentScore = 0;
        
        analyzedSegments.forEach(segment => {
            // 统计情感类型
            if (segment.emotions) {
                segment.emotions.forEach(emotion => {
                    emotionCounts[emotion.emotion] = (emotionCounts[emotion.emotion] || 0) + 1;
                });
            }
            
            // 统计情感倾向
            if (segment.overall_sentiment) {
                sentimentCounts[segment.overall_sentiment]++;
            }
            
            // 累计情感分数
            totalSentimentScore += segment.sentiment_score || 0;
        });
        
        const avgSentimentScore = totalSentimentScore / analyzedSegments.length;
        
        return {
            emotion_distribution: emotionCounts,
            sentiment_distribution: sentimentCounts,
            average_sentiment_score: parseFloat(avgSentimentScore.toFixed(3)),
            total_segments: analyzedSegments.length,
            most_common_emotion: Object.keys(emotionCounts).reduce((a, b) => 
                emotionCounts[a] > emotionCounts[b] ? a : b, '无'
            )
        };
    }
}

module.exports = EmotionAnalysisService;