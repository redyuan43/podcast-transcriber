#!/bin/bash

# 🎙️ Podcast提取器启动脚本 / Podcast Transcriber Startup Script

echo "🎙️ 启动Podcast提取器... / Starting Podcast Transcriber..."

# 检查Node.js是否已安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js 16+ / Node.js not found, please install Node.js 16+"
    exit 1
fi

# 检查是否存在.env文件
if [ ! -f .env ]; then
    echo "⚠️  .env文件不存在，正在创建... / .env file not found, creating..."
    cat > .env << EOL
# OpenAI API 配置 / OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# 服务器配置 / Server Configuration
PORT=3000

# 支持的最大文件大小 (MB) / Max file size (MB)
MAX_FILE_SIZE=50
EOL
    echo "📝 请编辑.env文件，添加你的OpenAI API Key / Please edit .env file and add your OpenAI API Key"
    echo "📖 获取API Key: https://platform.openai.com/api-keys"
    exit 1
fi

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖... / Installing dependencies..."
    npm install
fi

# 启动服务器
echo "🚀 启动服务器... / Starting server..."
echo "🌐 访问地址 / Access URL: http://localhost:3000"
echo "🛑 按 Ctrl+C 停止服务器 / Press Ctrl+C to stop server"

npm start
