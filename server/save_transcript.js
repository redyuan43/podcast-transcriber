#!/usr/bin/env node
/**
 * 直接转录并保存文件的脚本，绕过API调用
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

async function saveTranscript() {
    try {
        // 获取音频文件
        const tempDir = path.join(__dirname, 'temp');
        const audioFiles = fs.readdirSync(tempDir).filter(file => 
            file.endsWith('.m4a') || file.endsWith('.mp3') || file.endsWith('.wav')
        );
        
        if (audioFiles.length === 0) {
            console.log('❌ 没有找到音频文件');
            return;
        }
        
        const audioFile = audioFiles[0]; // 使用第一个音频文件
        const audioPath = path.join(tempDir, audioFile);
        
        console.log(`🎵 处理音频文件: ${audioFile}`);
        
        // 运行转录脚本
        const scriptPath = path.join(__dirname, 'whisper_transcribe.py');
        const command = `python3 "${scriptPath}" "${audioPath}" --model base`;
        
        console.log('🔄 开始转录...');
        const { stdout, stderr } = await execAsync(command, {
            maxBuffer: 1024 * 1024 * 10, // 10MB缓冲区
            timeout: 600000 // 10分钟超时
        });
        
        if (stderr && stderr.trim()) {
            console.log(`🔧 Whisper日志: ${stderr.trim()}`);
        }
        
        // 解析JSON结果
        const result = JSON.parse(stdout);
        
        if (!result.success) {
            throw new Error(result.error || '转录失败');
        }
        
        // 生成文件名
        const timestamp = Date.now();
        const transcriptFileName = `podcast_${timestamp}_transcript.txt`;
        const transcriptPath = path.join(tempDir, transcriptFileName);
        
        // 保存转录文本
        fs.writeFileSync(transcriptPath, result.text, 'utf8');
        
        const stats = fs.statSync(transcriptPath);
        
        console.log('✅ 转录完成并保存!');
        console.log(`📄 文件: ${transcriptFileName}`);
        console.log(`📊 大小: ${(stats.size / 1024).toFixed(1)}KB`);
        console.log(`📍 路径: ${transcriptPath}`);
        console.log(`⏱️ 处理时间: ${result.processing_time}秒`);
        console.log(`🗣️ 语言: ${result.language} (${(result.language_probability * 100).toFixed(1)}%)`);
        
        // 显示文件内容预览
        const preview = result.text.substring(0, 200);
        console.log(`\n📝 转录预览:`);
        console.log(`${preview}${result.text.length > 200 ? '...' : ''}`);
        
        return {
            file: transcriptPath,
            size: stats.size,
            processingTime: result.processing_time
        };
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    saveTranscript()
        .then(() => {
            console.log('\n🎉 任务完成!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 任务失败:', error.message);
            process.exit(1);
        });
}

module.exports = { saveTranscript };
