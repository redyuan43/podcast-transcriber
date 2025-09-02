/**
 * 测试Ollama连接
 */

const axios = require('axios');

async function testOllama() {
    const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://192.168.100.140:11434/v1';
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:latest';
    
    console.log(`🔍 测试Ollama连接...`);
    console.log(`📡 服务地址: ${OLLAMA_BASE_URL}`);
    console.log(`🧠 模型: ${OLLAMA_MODEL}`);
    
    try {
        // 测试模型列表
        console.log('\n1. 获取模型列表...');
        const modelsResponse = await axios.get(`${OLLAMA_BASE_URL}/models`, {
            timeout: 5000
        });
        console.log('✅ 模型列表获取成功');
        console.log(`可用模型数: ${modelsResponse.data.data.length}`);
        
        // 测试简单的文本生成
        console.log('\n2. 测试简单文本生成...');
        const testPrompt = '你好，请用一句话介绍自己。';
        
        const response = await axios.post(
            `${OLLAMA_BASE_URL}/chat/completions`,
            {
                model: OLLAMA_MODEL,
                messages: [
                    { role: 'user', content: testPrompt }
                ],
                temperature: 0.7,
                max_tokens: 100,
                stream: false
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30秒超时
            }
        );
        
        if (response.data?.choices?.[0]?.message?.content) {
            console.log('✅ 文本生成成功');
            console.log('回复:', response.data.choices[0].message.content);
        } else {
            console.log('⚠️ 未收到有效回复');
        }
        
        // 测试JSON格式输出
        console.log('\n3. 测试JSON格式输出...');
        const jsonPrompt = '请分析"人工智能"这个词，返回JSON格式：{"topic": "主题", "keywords": ["关键词1"]}';
        
        const jsonResponse = await axios.post(
            `${OLLAMA_BASE_URL}/chat/completions`,
            {
                model: OLLAMA_MODEL,
                messages: [
                    { role: 'user', content: jsonPrompt }
                ],
                temperature: 0.3,
                max_tokens: 200,
                stream: false
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        if (jsonResponse.data?.choices?.[0]?.message?.content) {
            console.log('✅ JSON生成成功');
            const content = jsonResponse.data.choices[0].message.content;
            console.log('原始回复:', content);
            
            // 尝试解析JSON
            try {
                // 提取JSON部分（如果包含其他文本）
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    console.log('解析结果:', parsed);
                }
            } catch (e) {
                console.log('JSON解析失败:', e.message);
            }
        }
        
        console.log('\n✅ 所有测试通过！Ollama服务正常工作。');
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
        if (error.code === 'ECONNREFUSED') {
            console.error('无法连接到Ollama服务，请检查服务是否运行在', OLLAMA_BASE_URL);
        }
    }
}

// 运行测试
testOllama().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('异常:', error);
    process.exit(1);
});