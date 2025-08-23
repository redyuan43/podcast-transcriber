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
const DEFAULT_PORT = Number(process.env.PORT) || 3000;

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

        // 步骤2: 智能音频处理（检查大小，必要时分割）
        console.log('🔍 检查音频文件大小并智能处理...');
        const audioFiles = await smartCompress(originalAudioPath);
        
        const shouldSummarize = operation === 'transcribe_and_summarize';
        console.log(`📋 处理模式: ${shouldSummarize ? '转录+总结' : '仅转录'}`);
        
        // 步骤3: 使用本地Whisper处理音频
        console.log(`🤖 本地转录处理 ${audioFiles.length} 个音频文件...`);
        const result = await processAudioWithOpenAI(audioFiles, shouldSummarize, outputLanguage);

        // 步骤4: 保存转录文本和总结到文件
        const timestamp = Date.now();
        const filePrefix = `podcast_${timestamp}`;
        const savedFiles = [];
        
        console.log('💾 保存转录结果到文件...');
        
        // 保存转录文本
        if (result.transcript) {
            const transcriptFileName = `${filePrefix}_transcript.txt`;
            const transcriptPath = path.join(tempDir, transcriptFileName);
            fs.writeFileSync(transcriptPath, result.transcript, 'utf8');
            savedFiles.push({
                type: 'transcript',
                filename: transcriptFileName,
                path: transcriptPath,
                size: fs.statSync(transcriptPath).size
            });
            console.log(`📄 转录文本已保存: ${transcriptFileName}`);
        }
        
        // 保存AI总结（如果有）
        if (result.summary) {
            const summaryFileName = `${filePrefix}_summary.txt`;
            const summaryPath = path.join(tempDir, summaryFileName);
            fs.writeFileSync(summaryPath, result.summary, 'utf8');
            savedFiles.push({
                type: 'summary', 
                filename: summaryFileName,
                path: summaryPath,
                size: fs.statSync(summaryPath).size
            });
            console.log(`📋 AI总结已保存: ${summaryFileName}`);
        }

        // 步骤5: 清理音频临时文件
        try {
            // 清理原始下载文件
            if (fs.existsSync(originalAudioPath)) {
                fs.unlinkSync(originalAudioPath);
                console.log(`🗑️ 已清理原始文件: ${path.basename(originalAudioPath)}`);
            }
            
            // 如果有分割文件，清理分割文件（但保留原文件如果它就是唯一文件）
            if (audioFiles.length > 1) {
                console.log(`🧹 清理 ${audioFiles.length} 个分割文件...`);
                for (const file of audioFiles) {
                    if (fs.existsSync(file)) {
                        fs.unlinkSync(file);
                        console.log(`   ✅ 已删除: ${path.basename(file)}`);
                    }
                }
            }
        } catch (cleanupError) {
            console.warn('⚠️ 清理临时文件失败:', cleanupError);
        }

        // 返回结果（包含文件下载信息）
        res.json({
            success: true,
            data: {
                ...result,
                savedFiles: savedFiles // 添加保存的文件信息
            }
        });

    } catch (error) {
        console.error('处理播客时出错:', error);
        
        res.status(500).json({
            success: false,
            error: error.message || '服务器内部错误 / Internal server error'
        });
    }
});

// 文件下载端点
app.get('/api/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(tempDir, filename);
        
        // 安全检查：确保文件在temp目录内
        if (!filePath.startsWith(tempDir)) {
            return res.status(400).json({
                success: false,
                error: '无效的文件路径'
            });
        }
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '文件未找到'
            });
        }
        
        // 设置下载响应头
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        
        // 发送文件
        res.sendFile(filePath);
        
    } catch (error) {
        console.error('文件下载失败:', error);
        res.status(500).json({
            success: false,
            error: '文件下载失败'
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

// 启动服务器（简化版端口处理）
function startServer() {
    const server = app.listen(DEFAULT_PORT, () => {
        console.log(`🎙️ Podcast提取器服务器运行在 http://localhost:${DEFAULT_PORT}`);
        console.log(`🎙️ Podcast Extractor server running on http://localhost:${DEFAULT_PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`端口 ${DEFAULT_PORT} 被占用，尝试端口 ${DEFAULT_PORT + 1}...`);
            const altServer = app.listen(DEFAULT_PORT + 1, () => {
                console.log(`🎙️ Podcast提取器服务器运行在 http://localhost:${DEFAULT_PORT + 1}`);
                console.log(`🎙️ Podcast Extractor server running on http://localhost:${DEFAULT_PORT + 1}`);
            });
            
            altServer.on('error', (altErr) => {
                if (altErr.code === 'EADDRINUSE') {
                    console.log(`端口 ${DEFAULT_PORT + 1} 也被占用，尝试端口 ${DEFAULT_PORT + 2}...`);
                    app.listen(DEFAULT_PORT + 2, () => {
                        console.log(`🎙️ Podcast提取器服务器运行在 http://localhost:${DEFAULT_PORT + 2}`);
                        console.log(`🎙️ Podcast Extractor server running on http://localhost:${DEFAULT_PORT + 2}`);
                    });
                } else {
                    console.error('启动服务器失败:', altErr);
                    process.exit(1);
                }
            });
        } else {
            console.error('启动服务器失败:', err);
            process.exit(1);
        }
    });
}

startServer();
