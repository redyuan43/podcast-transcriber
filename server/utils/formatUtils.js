/**
 * 格式化工具函数
 * 统一文件大小、时长等格式化逻辑
 */

/**
 * 格式化文件大小为KB
 * @param {number} sizeInBytes - 文件大小（字节）
 * @returns {string} - 格式化后的大小字符串
 */
function formatSizeKB(sizeInBytes) {
    return `${(sizeInBytes / 1024).toFixed(1)}KB`;
}

/**
 * 格式化文件大小为MB
 * @param {number} sizeInBytes - 文件大小（字节）
 * @returns {string} - 格式化后的大小字符串
 */
function formatSizeMB(sizeInBytes) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * 音频时长估算公式（统一）
 * @param {number} sizeInBytes - 音频文件大小（字节）
 * @returns {number} - 估算时长（秒）
 */
function estimateAudioDurationFromSize(sizeInBytes) {
    const sizeMB = sizeInBytes / (1024 * 1024);
    // 经验公式：128kbps MP3约1MB/分钟，保守估算
    const estimatedMinutes = sizeMB * 0.8;
    return estimatedMinutes * 60; // 返回秒数
}

/**
 * 格式化百分比（保留1位小数）
 * @param {number} value - 0-1之间的数值
 * @returns {string} - 格式化后的百分比字符串
 */
function formatPercentage(value) {
    return `${(value * 100).toFixed(1)}%`;
}

module.exports = {
    formatSizeKB,
    formatSizeMB,
    estimateAudioDurationFromSize,
    formatPercentage
};
