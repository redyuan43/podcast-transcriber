const fs = require('fs').promises;
const { formatSizeMB, estimateAudioDurationFromSize } = require('../utils/formatUtils');

/**
 * 音频信息服务 - 无外部依赖版本
 * 提供音频文件基本信息获取和时长估算功能
 */

/**
 * 获取音频文件信息
 * @param {string} inputPath - 输入音频文件路径
 * @returns {Promise<Array>} - 返回音频文件路径数组
 */
async function getAudioFiles(inputPath) {
    try {
        const stats = await fs.stat(inputPath);
        console.log(`🎵 音频文件大小: ${formatSizeMB(stats.size)}`);
        return [inputPath];
    } catch (error) {
        console.error('❌ 获取音频文件信息失败:', error);
        throw error;
    }
}

/**
 * 基于文件大小的音频时长估算
 * @param {string} filePath - 音频文件路径
 * @returns {Promise<number>} - 估算时长（秒）
 */
async function estimateAudioDuration(filePath) {
    try {
        const stats = await fs.stat(filePath);
        const estimatedSeconds = estimateAudioDurationFromSize(stats.size);
        const estimatedMinutes = estimatedSeconds / 60;
        console.log(`📊 基于文件大小估算时长: ${estimatedMinutes.toFixed(1)}分钟`);
        return estimatedSeconds;
    } catch (error) {
        console.warn(`⚠️ 估算音频时长失败: ${error.message}`);
        return 600; // 默认10分钟
    }
}

module.exports = {
    getAudioFiles,
    estimateAudioDuration
};