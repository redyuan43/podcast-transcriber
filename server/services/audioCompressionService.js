const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * 音频分割和压缩服务
 * 使用系统级 ffmpeg 进行高效音频处理
 */

/**
 * 音频处理：本地Faster-Whisper模式，直接处理完整文件
 * @param {string} inputPath - 输入音频文件路径
 * @returns {Promise<Array>} - 返回音频文件路径数组
 */
async function smartCompress(inputPath) {
    try {
        const stats = await fs.stat(inputPath);
        const sizeMB = stats.size / (1024 * 1024);

        console.log(`🎵 音频文件大小: ${sizeMB.toFixed(2)}MB`);
        console.log('🎤 本地Faster-Whisper模式，支持大文件处理，无需分割');
        
        // 本地Whisper模式：直接处理完整文件，无大小限制
        return [inputPath];

    } catch (error) {
        console.error('❌ 音频处理失败:', error);
        throw error;
    }
}

/**
 * 分割音频文件为10分钟片段
 * @param {string} inputPath - 输入音频文件路径
 * @param {number} sizeMB - 文件大小（MB）
 * @returns {Promise<Array>} - 返回分割后的音频片段路径数组
 */
async function splitAudioFile(inputPath, sizeMB) {
    try {
        const outputDir = path.dirname(inputPath);
        const baseName = path.basename(inputPath, path.extname(inputPath));
        const inputExt = path.extname(inputPath); // 保持原始格式
        const outputPattern = path.join(outputDir, `${baseName}_segment_%03d${inputExt}`);

        console.log(`📂 输出目录: ${outputDir}`);
        console.log(`🎯 分割模式: 每段10分钟`);
        
        // 使用 ffmpeg 进行分割并重新编码，确保片段完整性
        const ffmpegCommand = `ffmpeg -i "${inputPath}" -f segment -segment_time 600 -c:a aac -b:a 128k "${outputPattern}"`;
        
        console.log(`⚙️  执行命令: ${ffmpegCommand}`);
        console.log(`⏳ 正在分割音频文件（重新编码以确保兼容性）...`);

        const { stdout, stderr } = await execAsync(ffmpegCommand);
        
        if (stderr && !stderr.includes('video:0kB audio:')) {
            console.warn('⚠️ FFmpeg 警告:', stderr);
        }

        // 查找生成的分割文件
        const segmentFiles = await findSegmentFiles(outputDir, baseName, inputExt);
        
        console.log(`✅ 音频分割完成！`);
        console.log(`📊 原文件: ${sizeMB.toFixed(2)}MB`);
        console.log(`🎬 分割为: ${segmentFiles.length} 个片段`);
        
        // 显示每个片段的信息
        for (let i = 0; i < segmentFiles.length; i++) {
            const segmentStats = await fs.stat(segmentFiles[i]);
            const segmentSizeMB = segmentStats.size / (1024 * 1024);
            console.log(`   📄 片段 ${i + 1}: ${segmentSizeMB.toFixed(2)}MB - ${path.basename(segmentFiles[i])}`);
        }

        return segmentFiles;

    } catch (error) {
        console.error('❌ 音频分割失败:', error);
        throw new Error(`音频分割失败: ${error.message}`);
    }
}

/**
 * 查找分割后的音频文件
 * @param {string} outputDir - 输出目录
 * @param {string} baseName - 原文件基础名称
 * @param {string} extension - 文件扩展名
 * @returns {Promise<Array>} - 分割文件路径数组
 */
async function findSegmentFiles(outputDir, baseName, extension) {
    try {
        const files = await fs.readdir(outputDir);
        const segmentFiles = files
            .filter(file => file.startsWith(`${baseName}_segment_`) && file.endsWith(extension))
            .map(file => path.join(outputDir, file))
            .sort(); // 确保顺序正确

        if (segmentFiles.length === 0) {
            throw new Error('未找到分割后的音频文件');
        }

        return segmentFiles;
    } catch (error) {
        console.error('❌ 查找分割文件失败:', error);
        throw error;
    }
}

/**
 * 清理临时分割文件
 * @param {Array} segmentFiles - 分割文件路径数组
 */
async function cleanupSegmentFiles(segmentFiles) {
    try {
        console.log(`🧹 清理 ${segmentFiles.length} 个临时分割文件...`);
        
        for (const file of segmentFiles) {
            try {
                await fs.unlink(file);
                console.log(`   ✅ 已删除: ${path.basename(file)}`);
            } catch (error) {
                console.warn(`   ⚠️ 删除失败: ${path.basename(file)} - ${error.message}`);
            }
        }
        
        console.log('✅ 临时文件清理完成');
    } catch (error) {
        console.error('❌ 清理临时文件失败:', error);
    }
}

/**
 * 获取音频文件时长（秒）
 * @param {string} filePath - 音频文件路径
 * @returns {Promise<number>} - 音频时长（秒）
 */
async function getAudioDuration(filePath) {
    try {
        const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`;
        const { stdout } = await execAsync(command);
        return parseFloat(stdout.trim());
    } catch (error) {
        console.warn(`⚠️ 获取音频时长失败: ${error.message}`);
        return 0;
    }
}

module.exports = {
    smartCompress,
    splitAudioFile,
    cleanupSegmentFiles,
    getAudioDuration
};