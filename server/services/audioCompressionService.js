const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

// 设置FFmpeg路径
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * 压缩音频文件以符合OpenAI Whisper API限制
 * @param {string} inputPath - 输入音频文件路径
 * @param {number} targetSizeMB - 目标文件大小(MB)，默认20MB
 * @returns {Promise<string>} 压缩后的文件路径
 */
async function compressAudioForWhisper(inputPath, targetSizeMB = 20) {
    try {
        console.log(`开始压缩音频文件: ${inputPath}`);
        
        // 检查输入文件是否存在
        if (!fs.existsSync(inputPath)) {
            throw new Error('输入音频文件不存在');
        }

        // 获取原始文件信息
        const inputStats = fs.statSync(inputPath);
        const inputSizeMB = inputStats.size / (1024 * 1024);
        
        console.log(`原始文件大小: ${inputSizeMB.toFixed(2)}MB`);

        // 如果文件已经小于目标大小，直接返回
        if (inputSizeMB <= targetSizeMB) {
            console.log('文件大小已符合要求，无需压缩');
            return inputPath;
        }

        // 生成压缩后的文件路径
        const outputPath = inputPath.replace(/\.[^/.]+$/, '_compressed.mp3');

        // 获取音频信息用于计算压缩参数
        const audioInfo = await getAudioInfo(inputPath);
        console.log('音频信息:', audioInfo);

        // 计算目标比特率
        const targetBitrate = calculateTargetBitrate(audioInfo, targetSizeMB);
        console.log(`目标比特率: ${targetBitrate}k`);

        // 执行压缩
        await compressAudio(inputPath, outputPath, targetBitrate);

        // 验证压缩结果
        const outputStats = fs.statSync(outputPath);
        const outputSizeMB = outputStats.size / (1024 * 1024);
        
        console.log(`压缩完成! 新文件大小: ${outputSizeMB.toFixed(2)}MB`);
        console.log(`压缩率: ${((inputSizeMB - outputSizeMB) / inputSizeMB * 100).toFixed(1)}%`);

        // 删除原始文件以节省空间
        try {
            fs.unlinkSync(inputPath);
            console.log('已删除原始文件');
        } catch (deleteError) {
            console.warn('删除原始文件失败:', deleteError.message);
        }

        return outputPath;

    } catch (error) {
        console.error('音频压缩错误:', error);
        throw new Error(`音频压缩失败: ${error.message}`);
    }
}

/**
 * 获取音频文件信息
 */
function getAudioInfo(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }

            const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
            if (!audioStream) {
                reject(new Error('找不到音频流'));
                return;
            }

            resolve({
                duration: parseFloat(metadata.format.duration) || 0,
                bitrate: parseInt(audioStream.bit_rate) || 0,
                sampleRate: parseInt(audioStream.sample_rate) || 44100,
                channels: parseInt(audioStream.channels) || 2,
                codec: audioStream.codec_name || 'unknown'
            });
        });
    });
}

/**
 * 计算目标比特率
 */
function calculateTargetBitrate(audioInfo, targetSizeMB) {
    const { duration } = audioInfo;
    
    if (!duration || duration <= 0) {
        // 如果无法获取时长，使用保守的比特率
        return 64; // 64kbps
    }

    // 目标文件大小(bits) = 目标大小(MB) * 8 * 1024 * 1024
    const targetSizeBits = targetSizeMB * 8 * 1024 * 1024;
    
    // 计算比特率 = 文件大小(bits) / 时长(秒)
    let targetBitrate = Math.floor(targetSizeBits / duration);
    
    // 设置合理的比特率范围
    // 最低32kbps（保证基本质量），最高128kbps（避免文件过大）
    targetBitrate = Math.max(32, Math.min(128, targetBitrate));
    
    // 为了安全起见，减少10%的比特率
    targetBitrate = Math.floor(targetBitrate * 0.9);
    
    return targetBitrate;
}

/**
 * 执行音频压缩
 */
function compressAudio(inputPath, outputPath, bitrate) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioCodec('mp3')           // 使用MP3编码
            .audioBitrate(`${bitrate}k`) // 设置比特率
            .audioChannels(1)            // 转为单声道（语音转录通常不需要立体声）
            .audioFrequency(16000)       // 降低采样率到16kHz（Whisper推荐）
            .format('mp3')               // 输出格式
            .on('start', (commandLine) => {
                console.log('FFmpeg命令:', commandLine);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`压缩进度: ${Math.round(progress.percent)}%`);
                }
            })
            .on('end', () => {
                console.log('音频压缩完成');
                resolve();
            })
            .on('error', (err) => {
                console.error('FFmpeg错误:', err);
                reject(err);
            })
            .save(outputPath);
    });
}

/**
 * 智能音频压缩 - 根据文件大小自动选择压缩策略
 */
async function smartCompress(inputPath) {
    try {
        const stats = fs.statSync(inputPath);
        const sizeMB = stats.size / (1024 * 1024);
        
        if (sizeMB <= 25) {
            // 文件小于25MB，无需压缩
            return inputPath;
        } else if (sizeMB <= 50) {
            // 文件在25-50MB，轻度压缩
            return await compressAudioForWhisper(inputPath, 20);
        } else if (sizeMB <= 100) {
            // 文件在50-100MB，中度压缩
            return await compressAudioForWhisper(inputPath, 18);
        } else {
            // 文件超过100MB，重度压缩
            return await compressAudioForWhisper(inputPath, 15);
        }
    } catch (error) {
        console.error('智能压缩失败:', error);
        throw error;
    }
}

module.exports = {
    compressAudioForWhisper,
    smartCompress,
    getAudioInfo
};

