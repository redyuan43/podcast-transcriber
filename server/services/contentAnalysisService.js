/**
 * 内容分析主服务
 * 整合所有AI分析功能：主题识别、热词匹配、章节划分、摘要生成
 */

const ollamaService = require('./ollamaAnalysisService');
const hotwordService = require('./hotwordMatchingService');

/**
 * 执行完整的内容分析流程
 */
async function analyzeContent(transcriptData) {
    console.log('🚀 开始AI内容分析...');
    
    const { text, segments, speakers } = transcriptData;
    
    if (!text || !segments || segments.length === 0) {
        console.error('❌ 转录数据不完整，无法进行分析');
        return null;
    }
    
    try {
        // 步骤3：宏观主题识别
        console.log('\n📍 步骤3: 识别播客主题...');
        let topic = await ollamaService.identifyMacroTopic(text);
        if (!topic) {
            console.log('⚠️ 主题识别失败，使用默认主题');
            topic = {
                mainTopic: '通用',
                subTopic: '未分类',
                confidence: 0.5,
                keywords: [],
                description: '无法确定具体分类'
            };
        }
        
        // 步骤4：专业热词库匹配
        console.log('\n📍 步骤4: 匹配专业热词...');
        const hotwordResult = await hotwordService.matchHotwords(text, segments, topic);
        
        // 步骤5：内容分章节
        console.log('\n📍 步骤5: 语义分章节...');
        const chapters = await ollamaService.semanticChunking(segments, speakers);
        
        // 步骤6：章节摘要与关键词提取
        console.log('\n📍 步骤6: 生成章节摘要...');
        let enhancedChapters = chapters;
        if (chapters && chapters.length > 0) {
            // 生成摘要
            enhancedChapters = await ollamaService.generateAllChapterSummaries(chapters, segments);
            
            // 为每个章节匹配热词
            enhancedChapters = await hotwordService.matchHotwordsForChapters(
                enhancedChapters, 
                segments, 
                topic
            );
        }
        
        // 构建分析结果
        const analysisResult = {
            success: true,
            timestamp: new Date().toISOString(),
            topic: topic,
            hotwords: {
                summary: hotwordResult.summary.slice(0, 20), // 前20个高频热词
                totalMatches: hotwordResult.totalMatches,
                uniqueTermCount: hotwordResult.uniqueTermCount,
                topTerms: hotwordResult.summary.slice(0, 5).map(t => ({
                    term: t.chinese || t.english,
                    count: t.count
                }))
            },
            chapters: enhancedChapters,
            statistics: {
                totalDuration: segments[segments.length - 1]?.end || 0,
                chapterCount: enhancedChapters.length,
                speakerCount: speakers ? new Set(speakers).size : 1,
                averageChapterLength: enhancedChapters.length > 0 ? 
                    Math.round(segments[segments.length - 1].end / enhancedChapters.length) : 0
            }
        };
        
        console.log('\n✅ AI内容分析完成!');
        console.log(`📊 分析统计:`);
        console.log(`  - 主题: ${topic.mainTopic} > ${topic.subTopic}`);
        console.log(`  - 专业术语: ${hotwordResult.uniqueTermCount}个`);
        console.log(`  - 章节数: ${enhancedChapters.length}`);
        console.log(`  - 说话人数: ${analysisResult.statistics.speakerCount}`);
        
        return analysisResult;
        
    } catch (error) {
        console.error('❌ 内容分析过程出错:', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * 生成结构化的分析报告
 */
function generateAnalysisReport(analysisResult, transcriptData) {
    if (!analysisResult || !analysisResult.success) {
        return null;
    }
    
    const report = {
        metadata: {
            title: transcriptData.title || '未命名播客',
            duration: formatDuration(analysisResult.statistics.totalDuration),
            analyzedAt: analysisResult.timestamp,
            source: transcriptData.source || '未知来源'
        },
        classification: {
            mainTopic: analysisResult.topic.mainTopic,
            subTopic: analysisResult.topic.subTopic,
            confidence: analysisResult.topic.confidence,
            keywords: analysisResult.topic.keywords
        },
        professionalTerms: {
            totalCount: analysisResult.hotwords.uniqueTermCount,
            topTerms: analysisResult.hotwords.topTerms,
            fullList: analysisResult.hotwords.summary
        },
        chapters: analysisResult.chapters.map((chapter, idx) => ({
            index: idx + 1,
            title: chapter.title,
            timeRange: `${chapter.start} - ${chapter.end}`,
            summary: chapter.summary || '暂无摘要',
            keywords: chapter.keywords || [],
            hotwords: (chapter.hotwords || []).slice(0, 5).map(h => h.chinese || h.english),
            professionalDensity: chapter.professionalDensity || 0
        })),
        insights: generateInsights(analysisResult)
    };
    
    return report;
}

/**
 * 生成洞察和建议
 */
function generateInsights(analysisResult) {
    const insights = [];
    
    // 基于专业术语密度的洞察
    if (analysisResult.hotwords.uniqueTermCount > 30) {
        insights.push({
            type: 'terminology',
            message: '本播客包含大量专业术语，适合领域内专业人士收听'
        });
    } else if (analysisResult.hotwords.uniqueTermCount < 10) {
        insights.push({
            type: 'terminology',
            message: '本播客专业术语较少，适合普通听众理解'
        });
    }
    
    // 基于章节数量的洞察
    if (analysisResult.chapters.length > 8) {
        insights.push({
            type: 'structure',
            message: '内容结构丰富，涵盖多个话题点'
        });
    } else if (analysisResult.chapters.length < 3) {
        insights.push({
            type: 'structure',
            message: '内容聚焦，深入探讨少数核心话题'
        });
    }
    
    // 基于时长的洞察
    const durationMinutes = analysisResult.statistics.totalDuration / 60;
    if (durationMinutes > 60) {
        insights.push({
            type: 'duration',
            message: '长篇深度内容，建议分段收听'
        });
    } else if (durationMinutes < 20) {
        insights.push({
            type: 'duration',
            message: '精简内容，适合碎片时间收听'
        });
    }
    
    return insights;
}

/**
 * 导出为Markdown格式报告
 */
function exportToMarkdown(analysisResult, transcriptData) {
    const report = generateAnalysisReport(analysisResult, transcriptData);
    if (!report) return null;
    
    let markdown = `# 📊 播客内容分析报告\n\n`;
    
    // 元数据
    markdown += `## 基本信息\n`;
    markdown += `- **标题**: ${report.metadata.title}\n`;
    markdown += `- **时长**: ${report.metadata.duration}\n`;
    markdown += `- **分析时间**: ${new Date(report.metadata.analyzedAt).toLocaleString('zh-CN')}\n\n`;
    
    // 主题分类
    markdown += `## 🎯 主题分类\n`;
    markdown += `- **主要类别**: ${report.classification.mainTopic}\n`;
    markdown += `- **子类别**: ${report.classification.subTopic}\n`;
    markdown += `- **置信度**: ${(report.classification.confidence * 100).toFixed(1)}%\n`;
    markdown += `- **关键词**: ${report.classification.keywords.join(', ')}\n\n`;
    
    // 专业术语
    markdown += `## 🔤 专业术语分析\n`;
    markdown += `- **术语总数**: ${report.professionalTerms.totalCount}个\n`;
    markdown += `- **高频术语TOP5**:\n`;
    report.professionalTerms.topTerms.forEach((term, idx) => {
        markdown += `  ${idx + 1}. ${term.term} (${term.count}次)\n`;
    });
    markdown += '\n';
    
    // 章节摘要
    markdown += `## 📚 章节划分与摘要\n\n`;
    report.chapters.forEach(chapter => {
        markdown += `### 第${chapter.index}章: ${chapter.title}\n`;
        markdown += `**时间范围**: ${chapter.timeRange}\n\n`;
        markdown += `**摘要**: ${chapter.summary}\n\n`;
        if (chapter.keywords.length > 0) {
            markdown += `**关键词**: ${chapter.keywords.join(', ')}\n\n`;
        }
        if (chapter.hotwords.length > 0) {
            markdown += `**专业术语**: ${chapter.hotwords.join(', ')}\n\n`;
        }
        markdown += `**专业术语密度**: ${chapter.professionalDensity}‰\n\n`;
        markdown += '---\n\n';
    });
    
    // 洞察
    if (report.insights.length > 0) {
        markdown += `## 💡 内容洞察\n\n`;
        report.insights.forEach(insight => {
            markdown += `- ${insight.message}\n`;
        });
    }
    
    return markdown;
}

/**
 * 辅助函数：格式化时长
 */
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}小时${minutes}分${secs}秒`;
    } else if (minutes > 0) {
        return `${minutes}分${secs}秒`;
    }
    return `${secs}秒`;
}

/**
 * 测试分析服务连接
 */
async function testAnalysisServices() {
    console.log('🔍 测试内容分析服务...');
    
    // 测试Ollama连接
    const ollamaOk = await ollamaService.testOllamaConnection();
    
    // 测试热词库
    const hotwordDbs = await hotwordService.getAvailableHotwordDatabases();
    console.log(`📚 可用热词库: ${hotwordDbs.length}个`);
    hotwordDbs.forEach(db => {
        console.log(`  - ${db.domain}: ${db.termCount}个术语`);
    });
    
    return {
        ollama: ollamaOk,
        hotwordDatabases: hotwordDbs.length,
        ready: ollamaOk && hotwordDbs.length > 0
    };
}

module.exports = {
    analyzeContent,
    generateAnalysisReport,
    exportToMarkdown,
    testAnalysisServices
};