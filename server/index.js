const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { processAudioWithOpenAI } = require('./services/openaiService');
const { downloadPodcastAudio } = require('./services/podcastService');
const { smartCompress } = require('./services/audioCompressionService');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 创建临时文件夹
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// 文件上传配置
const upload = multer({
    dest: tempDir,
    limits: {
        fileSize: (process.env.MAX_FILE_SIZE || 50) * 1024 * 1024 // 默认50MB
    }
});

// API路由
app.post('/api/process-podcast', async (req, res) => {
    try {
        const { url, operation, audioLanguage, outputLanguage } = req.body;

        console.log('处理播客请求:', {
            url,
            operation,
            audioLanguage,
            outputLanguage
        });

        // 验证输入
        if (!url) {
            return res.status(400).json({
                success: false,
                error: '播客链接是必需的 / Podcast URL is required'
            });
        }

        if (!['transcribe_only', 'transcribe_summarize'].includes(operation)) {
            return res.status(400).json({
                success: false,
                error: '无效的操作类型 / Invalid operation type'
            });
        }

        // 步骤1: 下载音频文件
        console.log('下载音频文件...');
        const originalAudioPath = await downloadPodcastAudio(url);
        
        if (!originalAudioPath) {
            return res.status(400).json({
                success: false,
                error: '无法下载音频文件，请检查链接是否有效 / Unable to download audio file, please check if the link is valid'
            });
        }

        // 步骤2: 智能压缩音频（如果需要）
        console.log('检查音频文件大小并智能压缩...');
        const audioFilePath = await smartCompress(originalAudioPath);

        // 步骤3: 使用OpenAI处理音频
        console.log('处理音频文件...');
        const result = await processAudioWithOpenAI({
            audioFilePath,
            operation,
            audioLanguage: audioLanguage === 'auto' ? undefined : audioLanguage,
            outputLanguage
        });

        // 清理临时文件
        try {
            if (fs.existsSync(audioFilePath)) {
                fs.unlinkSync(audioFilePath);
            }
        } catch (cleanupError) {
            console.warn('清理临时文件失败:', cleanupError);
        }

        // 返回结果
        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('处理播客时出错:', error);
        
        res.status(500).json({
            success: false,
            error: error.message || '服务器内部错误 / Internal server error'
        });
    }
});

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('未处理的错误:', error);
    res.status(500).json({
        success: false,
        error: '服务器内部错误 / Internal server error'
    });
});

// 404处理
app.use((req, res) => {
    if (req.url.startsWith('/api/')) {
        res.status(404).json({
            success: false,
            error: 'API端点未找到 / API endpoint not found'
        });
    } else {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`🎙️ Podcast提取器服务器运行在 http://localhost:${PORT}`);
    console.log(`🎙️ Podcast Extractor server running on http://localhost:${PORT}`);
});
