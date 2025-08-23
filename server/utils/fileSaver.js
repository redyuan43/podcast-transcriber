/**
 * 文件保存工具模块
 * 统一处理转录结果的保存逻辑
 */

const fs = require('fs');
const path = require('path');

/**
 * 保存转录结果到文件
 * @param {Object} result - 转录结果 {transcript, summary}
 * @param {string} tempDir - 临时目录路径
 * @param {boolean} shouldSummarize - 是否包含总结
 * @returns {Array} savedFiles - 保存的文件信息数组
 */
function saveTranscriptionResults(result, tempDir, shouldSummarize = false) {
    const timestamp = Date.now();
    const filePrefix = `podcast_${timestamp}`;
    const savedFiles = [];
    
    console.log('💾 保存转录结果到文件...');
    
    try {
        // 保存转录文本
        if (result.transcript) {
            const transcriptFileName = `${filePrefix}_transcript.txt`;
            const transcriptPath = path.join(tempDir, transcriptFileName);
            
            fs.writeFileSync(transcriptPath, result.transcript, 'utf8');
            
            const transcriptStats = fs.statSync(transcriptPath);
            savedFiles.push({
                type: 'transcript',
                filename: transcriptFileName,
                path: transcriptPath,
                size: transcriptStats.size
            });
            
            console.log(`📄 转录文本已保存: ${transcriptFileName} (${(transcriptStats.size/1024).toFixed(1)}KB)`);
        } else {
            console.warn('⚠️ 没有转录文本可保存');
        }
        
        // 保存AI总结（如果有且需要）
        if (shouldSummarize && result.summary) {
            const summaryFileName = `${filePrefix}_summary.txt`;
            const summaryPath = path.join(tempDir, summaryFileName);
            
            fs.writeFileSync(summaryPath, result.summary, 'utf8');
            
            const summaryStats = fs.statSync(summaryPath);
            savedFiles.push({
                type: 'summary',
                filename: summaryFileName,
                path: summaryPath,
                size: summaryStats.size
            });
            
            console.log(`📋 AI总结已保存: ${summaryFileName} (${(summaryStats.size/1024).toFixed(1)}KB)`);
        } else if (shouldSummarize && !result.summary) {
            console.warn('⚠️ 请求了总结但没有总结内容可保存');
        }
        
        console.log(`✅ 成功保存 ${savedFiles.length} 个文件`);
        return savedFiles;
        
    } catch (error) {
        console.error('❌ 保存文件时出错:', error);
        
        // 清理已创建的文件（回滚）
        savedFiles.forEach(file => {
            try {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                    console.log(`🗑️ 已清理失败的文件: ${file.filename}`);
                }
            } catch (cleanupError) {
                console.error(`❌ 清理文件失败: ${file.filename}`, cleanupError);
            }
        });
        
        throw new Error(`文件保存失败: ${error.message}`);
    }
}

/**
 * 清理音频临时文件
 * @param {string} originalAudioPath - 原始音频文件路径
 * @param {Array} audioFiles - 所有音频文件路径数组
 */
function cleanupAudioFiles(originalAudioPath, audioFiles) {
    console.log('🧹 清理音频临时文件...');
    
    try {
        // 清理原始下载文件
        if (fs.existsSync(originalAudioPath)) {
            fs.unlinkSync(originalAudioPath);
            console.log(`🗑️ 已清理原始文件: ${path.basename(originalAudioPath)}`);
        }
        
        // 如果有分割文件，清理分割文件
        if (audioFiles.length > 1) {
            console.log(`🧹 清理 ${audioFiles.length} 个分割文件...`);
            let cleanedCount = 0;
            
            for (const file of audioFiles) {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                    cleanedCount++;
                }
            }
            
            console.log(`✅ 已清理 ${cleanedCount} 个音频片段文件`);
        }
    } catch (error) {
        console.warn('⚠️ 清理音频文件时出错:', error.message);
        // 清理失败不应该影响主流程
    }
}

/**
 * 检查并创建临时目录
 * @param {string} tempDir - 临时目录路径
 */
function ensureTempDirectory(tempDir) {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log(`📁 创建临时目录: ${tempDir}`);
    }
}

module.exports = {
    saveTranscriptionResults,
    cleanupAudioFiles,
    ensureTempDirectory
};
