const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { processAudioWithOpenAI } = require('./services/openaiService');
const { downloadPodcastAudio } = require('./services/podcastService');
const { getAudioFiles, estimateAudioDuration } = require('./services/audioInfoService');

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

        // 步骤2: 基于文件大小估算时长（用于初始预估）
        console.log('📊 估算音频时长...');
        const estimatedDuration = await estimateAudioDuration(originalAudioPath);
        console.log(`🎯 预估时长: ${Math.round(estimatedDuration / 60)} 分钟 ${Math.round(estimatedDuration % 60)} 秒`);

        // 步骤3: 获取音频文件信息
        console.log('🔍 获取音频文件信息...');
        const audioFiles = await getAudioFiles(originalAudioPath);
        
        const shouldSummarize = operation === 'transcribe_summarize';
        console.log(`📋 处理模式: ${shouldSummarize ? '转录+总结' : '仅转录'}`);
        
        // 步骤4: 使用本地Whisper处理音频
        console.log(`🤖 本地转录处理 ${audioFiles.length} 个音频文件...`);
        const result = await processAudioWithOpenAI(audioFiles, shouldSummarize, outputLanguage, tempDir, audioLanguage);

        // 步骤4: 获取保存的文件信息
        const savedFiles = result.savedFiles || [];
        console.log(`✅ 处理完成，共保存 ${savedFiles.length} 个文件`);
        
        // 打印保存的文件详情
        savedFiles.forEach(file => {
            console.log(`📁 ${file.type}: ${file.filename} (${(file.size/1024).toFixed(1)}KB)`);
        });

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

        // 返回结果（包含估算和真实时长）
        res.json({
            success: true,
            data: {
                ...result,
                estimatedDuration: estimatedDuration, // 估算时长（秒）
                actualDuration: result.audioDuration || result.duration, // 从Whisper获取的真实时长
                savedFiles: savedFiles
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

// 本地文件处理端点
app.post('/api/process-local-file', async (req, res) => {
    try {
        const { filename, operation = 'transcribe_only', outputLanguage = 'zh' } = req.body;
        
        if (!filename) {
            return res.status(400).json({
                success: false,
                error: '缺少文件名参数'
            });
        }
        
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
        
        console.log(`📂 处理本地文件: ${filename}`);
        console.log(`📋 处理模式: ${operation === 'transcribe_summarize' ? '转录+总结' : '仅转录'}`);
        
        const shouldSummarize = operation === 'transcribe_summarize';
        
        // 使用本地Whisper处理音频
        console.log(`🤖 本地转录处理文件: ${filename}`);
        const result = await processAudioWithOpenAI([filePath], shouldSummarize, outputLanguage, tempDir, audioLanguage);

        // 获取保存的文件信息
        const savedFiles = result.savedFiles || [];
        console.log(`✅ 处理完成，共保存 ${savedFiles.length} 个文件`);
        
        // 打印保存的文件详情
        savedFiles.forEach(file => {
            console.log(`📁 ${file.type}: ${file.filename} (${(file.size/1024).toFixed(1)}KB)`);
        });
        
        // 返回结果
        res.json({
            success: true,
            data: {
                ...result,
                savedFiles: savedFiles
            }
        });
        
    } catch (error) {
        console.error('本地文件处理失败:', error);
        res.status(500).json({
            success: false,
            error: error.message || '本地文件处理失败'
        });
    }
});

// 获取temp目录文件列表端点
app.get('/api/temp-files', (req, res) => {
    try {
        const files = fs.readdirSync(tempDir)
            .filter(file => 
                // 音频文件
                file.endsWith('.m4a') || file.endsWith('.mp3') || file.endsWith('.wav') ||
                // 转录和总结文件
                file.endsWith('_transcript.md') || file.endsWith('_summary.md') ||
                // 其他文本文件
                file.endsWith('.txt') || file.endsWith('.md')
            )
            .map(file => {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    size: stats.size,
                    created: stats.ctime,
                    modified: stats.mtime
                };
            })
            .sort((a, b) => b.modified - a.modified);
            
        res.json({
            success: true,
            files: files
        });
        
    } catch (error) {
        console.error('获取文件列表失败:', error);
        res.status(500).json({
            success: false,
            error: '获取文件列表失败'
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
        console.log(`🎙️ Podcast Transcriber server running on http://localhost:${DEFAULT_PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`端口 ${DEFAULT_PORT} 被占用，尝试端口 ${DEFAULT_PORT + 1}...`);
            const altServer = app.listen(DEFAULT_PORT + 1, () => {
                console.log(`🎙️ Podcast提取器服务器运行在 http://localhost:${DEFAULT_PORT + 1}`);
                console.log(`🎙️ Podcast Transcriber server running on http://localhost:${DEFAULT_PORT + 1}`);
            });
            
            altServer.on('error', (altErr) => {
                if (altErr.code === 'EADDRINUSE') {
                    console.log(`端口 ${DEFAULT_PORT + 1} 也被占用，尝试端口 ${DEFAULT_PORT + 2}...`);
                    app.listen(DEFAULT_PORT + 2, () => {
                        console.log(`🎙️ Podcast提取器服务器运行在 http://localhost:${DEFAULT_PORT + 2}`);
                        console.log(`🎙️ Podcast Transcriber server running on http://localhost:${DEFAULT_PORT + 2}`);
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
