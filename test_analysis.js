/**
 * 测试AI内容分析功能
 */

const contentAnalysisService = require('./server/services/contentAnalysisService');

async function testAnalysis() {
    console.log('🧪 测试AI内容分析服务...\n');
    
    // 测试服务连接
    const status = await contentAnalysisService.testAnalysisServices();
    console.log('服务状态:', status);
    
    if (!status.ready) {
        console.log('⚠️ 分析服务未就绪');
        return;
    }
    
    // 模拟转录数据
    const mockTranscriptData = {
        title: '测试播客：AI技术发展趋势',
        source: 'https://example.com/podcast',
        text: `今天我们来聊聊人工智能的发展趋势。大家好，我是主持人。
        
        首先，让我们谈谈最近很火的AIGC技术。AIGC就是AI Generated Content，人工智能生成内容。
        这个技术正在改变内容创作的方式。比如说GPT模型，它可以写文章、写代码，甚至创作音乐。
        
        接下来，我想和大家讨论一下大语言模型LLM的发展。现在的Transformer架构已经成为主流。
        各大公司都在训练自己的大模型，算力成为了关键资源。
        
        最后，让我们展望一下未来。我认为多模态学习会是下一个重要方向。
        结合视觉、语音和文本的模型将会带来更多可能性。
        
        好的，今天的分享就到这里，谢谢大家。`,
        segments: [
            { start: 0, end: 10, text: '今天我们来聊聊人工智能的发展趋势。大家好，我是主持人。' },
            { start: 10, end: 30, text: '首先，让我们谈谈最近很火的AIGC技术。AIGC就是AI Generated Content，人工智能生成内容。' },
            { start: 30, end: 50, text: '这个技术正在改变内容创作的方式。比如说GPT模型，它可以写文章、写代码，甚至创作音乐。' },
            { start: 50, end: 70, text: '接下来，我想和大家讨论一下大语言模型LLM的发展。现在的Transformer架构已经成为主流。' },
            { start: 70, end: 90, text: '各大公司都在训练自己的大模型，算力成为了关键资源。' },
            { start: 90, end: 110, text: '最后，让我们展望一下未来。我认为多模态学习会是下一个重要方向。' },
            { start: 110, end: 130, text: '结合视觉、语音和文本的模型将会带来更多可能性。' },
            { start: 130, end: 140, text: '好的，今天的分享就到这里，谢谢大家。' }
        ],
        speakers: ['主持人', '主持人', '主持人', '主持人', '主持人', '主持人', '主持人', '主持人']
    };
    
    console.log('\n📝 开始分析测试转录数据...\n');
    
    try {
        const analysisResult = await contentAnalysisService.analyzeContent(mockTranscriptData);
        
        if (analysisResult && analysisResult.success) {
            console.log('\n✅ 分析成功！\n');
            console.log('分析结果摘要:');
            console.log('================');
            console.log(`主题: ${analysisResult.topic.mainTopic} > ${analysisResult.topic.subTopic}`);
            console.log(`关键词: ${analysisResult.topic.keywords.join(', ')}`);
            console.log(`专业术语数: ${analysisResult.hotwords.uniqueTermCount}`);
            console.log(`章节数: ${analysisResult.chapters.length}`);
            
            console.log('\n高频专业术语:');
            analysisResult.hotwords.topTerms.forEach((term, idx) => {
                console.log(`  ${idx + 1}. ${term.term} (${term.count}次)`);
            });
            
            console.log('\n章节信息:');
            analysisResult.chapters.forEach((chapter, idx) => {
                console.log(`  ${idx + 1}. ${chapter.title} [${chapter.start} - ${chapter.end}]`);
                if (chapter.summary) {
                    console.log(`     摘要: ${chapter.summary.substring(0, 50)}...`);
                }
            });
            
            // 生成并输出Markdown报告
            const markdownReport = contentAnalysisService.exportToMarkdown(analysisResult, mockTranscriptData);
            if (markdownReport) {
                console.log('\n📄 Markdown报告已生成 (前500字):');
                console.log('================================');
                console.log(markdownReport.substring(0, 500) + '...');
            }
        } else {
            console.log('❌ 分析失败:', analysisResult?.error || '未知错误');
        }
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 运行测试
testAnalysis().then(() => {
    console.log('\n🏁 测试完成');
    process.exit(0);
}).catch(error => {
    console.error('测试异常:', error);
    process.exit(1);
});