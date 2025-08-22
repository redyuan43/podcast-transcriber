# 🎙️ Podcast提取器 / Podcast Extractor

一个简洁现代的双语播客转录和总结工具，支持中文和英文界面。只需提供播客链接，即可获得高质量的文字转录和AI智能总结。

A clean and modern bilingual podcast transcription and summarization tool with Chinese and English interface support. Just provide a podcast link to get high-quality transcription and AI-powered summary.

## ✨ 功能特性 / Features

- 🎯 **双语界面** / **Bilingual Interface** - 支持中文/英文切换
- 🔗 **多平台支持** / **Multi-platform Support** - Apple Podcasts, 小宇宙等
- 🎙️ **高质量转录** / **High-quality Transcription** - 基于OpenAI Whisper
- 🤖 **AI智能总结** / **AI-powered Summary** - 使用GPT生成结构化总结
- 🌍 **多语言检测** / **Multi-language Detection** - 自动检测音频语言
- 📱 **响应式设计** / **Responsive Design** - 移动端友好
- ⚡ **现代化UI** / **Modern UI** - 使用TailwindCSS构建

## 🚀 快速开始 / Quick Start

### 环境要求 / Prerequisites

- Node.js 16+ 
- OpenAI API Key

### 安装 / Installation

1. **克隆项目 / Clone the repository**
```bash
git clone <repository-url>
cd podcast-to-text
```

2. **安装依赖 / Install dependencies**
```bash
npm install
```

3. **配置环境变量 / Configure environment variables**
```bash
# 创建 .env 文件 / Create .env file
cp .env.example .env

# 编辑 .env 文件，添加你的 OpenAI API Key
# Edit .env file and add your OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
MAX_FILE_SIZE=50
```

4. **启动服务器 / Start the server**
```bash
# 开发模式 / Development mode
npm run dev

# 生产模式 / Production mode  
npm start
```

5. **访问应用 / Access the application**
```
http://localhost:3000
```

## 📖 使用方法 / How to Use

1. **输入播客链接** / **Enter podcast link**
   - 支持 Apple Podcasts, 小宇宙等平台链接
   - 也支持直接的音频文件URL

2. **选择操作类型** / **Choose operation type**
   - **转录并总结** / **Transcribe & Summarize**: 获得完整转录和AI总结
   - **仅转录** / **Transcribe Only**: 只获得转录文本

3. **语言设置** / **Language Settings**
   - **音频语言**: 自动检测或手动选择
   - **总结语言**: 选择中文或英文输出

4. **处理结果** / **Processing Results**
   - 实时显示处理进度
   - 查看转录文本和AI总结

## 🎨 界面预览 / UI Preview

- **简洁现代的设计** / **Clean modern design**
- **蓝色渐变主题** / **Blue gradient theme**
- **移动端适配** / **Mobile responsive**
- **双语切换** / **Language toggle**

## 🔧 技术栈 / Tech Stack

### 前端 / Frontend
- **HTML5** - 语义化标记
- **TailwindCSS** - 现代化样式框架
- **Vanilla JavaScript** - 轻量级交互

### 后端 / Backend
- **Node.js** - 服务器运行时
- **Express.js** - Web框架
- **OpenAI API** - Whisper转录 + GPT总结
- **Axios** - HTTP客户端

## 📁 项目结构 / Project Structure

```
podcast-to-text/
├── public/                 # 前端文件 / Frontend files
│   ├── index.html         # 主页面 / Main page
│   └── script.js          # 前端逻辑 / Frontend logic
├── server/                # 后端文件 / Backend files
│   ├── index.js          # 服务器入口 / Server entry
│   └── services/         # 服务模块 / Service modules
│       ├── openaiService.js    # OpenAI集成
│       └── podcastService.js   # 播客解析
├── package.json          # 项目配置 / Project config
└── README.md            # 项目文档 / Documentation
```

## 🔑 API接口 / API Endpoints

### POST `/api/process-podcast`

处理播客转录和总结请求

**请求体 / Request Body:**
```json
{
  "url": "https://podcasts.apple.com/...",
  "operation": "transcribe_summarize", // or "transcribe_only"
  "audioLanguage": "auto", // or "zh", "en", etc.
  "outputLanguage": "zh" // or "en"
}
```

**响应 / Response:**
```json
{
  "success": true,
  "data": {
    "transcript": "转录文本...",
    "summary": "AI总结..." // 仅在 transcribe_summarize 模式下
  }
}
```

### GET `/api/health`

健康检查接口

## ⚠️ 注意事项 / Important Notes

1. **API费用** / **API Costs**: 使用OpenAI API会产生费用，请控制使用量
2. **文件大小限制** / **File Size Limit**: 音频文件限制25MB（OpenAI Whisper限制）
3. **支持格式** / **Supported Formats**: MP3, M4A, WAV, AAC等主流音频格式
4. **网络要求** / **Network Requirements**: 需要稳定的网络连接下载音频文件

## 🛠️ 开发 / Development

### 本地开发 / Local Development
```bash
# 安装开发依赖 / Install dev dependencies
npm install

# 启动开发服务器 / Start dev server
npm run dev

# 代码检查 / Linting
npm run lint
```

### 部署 / Deployment

可以部署到任何支持Node.js的平台：
- Vercel
- Netlify
- Railway
- 自有服务器

## 📄 许可证 / License

MIT License

## 🤝 贡献 / Contributing

欢迎提交Issue和Pull Request！

Feel free to submit issues and pull requests!
