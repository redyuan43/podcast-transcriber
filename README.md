<div align="center">
  
# 🎙️ AI Podcast Transcriber

English | [中文](README_zh.md)

An open-source tool that turns podcasts into high-quality transcripts and AI-powered summaries.

![Podcast Transcriber Interface](public/Screenshot%202025-09-02%20183937.png)
![Timeline View](public/Screenshot%202025-09-02%20234235.png)
![Speaker Segmentation](public/Screenshot%202025-09-02%20234242.png)

</div>

## 🌟 Project Overview

Podcast Transcriber is a full-stack web application designed to bridge the gap between audio content and text accessibility. It automatically processes podcast episodes from various platforms, and delivers accurate transcriptions with meaningful summaries in multiple languages.

### Key Capabilities

- **🔗 Multi-Platform Support**: Support for Apple Podcasts, Xiaoyuzhoufm, RSS feeds, and direct audio URLs
- **🚀 Performance First**: Using OpenAI Faster-Whisper model for speech-to-text
- **🤖 AI Optimization**: AI-optimized transcription and summary text based on podcast content characteristics
- **📱 Responsive Design**: Modern mobile-first UI, friendly experience for both desktop and mobile
- **🌍 Conditional Translation**: When the selected summary language differs from the detected transcript language, the system auto-translates with GPT‑4o

## 🏗️ Architecture & Implementation

### System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │  External APIs  │
│                 │    │                  │    │                 │
│ • HTML5/CSS3    │◄──►│ • Express.js     │◄──►│ • OpenAI GPT    │
│ • Vanilla JS    │    │ • Node.js        │    │ • RSS Feeds     │
│ • TailwindCSS   │    │ • File Download  │    │ • Podcast APIs  │
│ • File Download │    │ • Text Saving    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Local Processing │
                    │                  │
                    │ • Faster-Whisper │
                    │ • Python Script  │
                    │ • Audio Direct   │
                    │ • Text Export    │
                    └──────────────────┘
```

### Core Processing Pipeline

1. **Podcast Link Analysis**: Multi-strategy URL parsing for Apple Podcasts, Xiaoyuzhou, and RSS feeds
2. **Audio Extraction**: Direct download with RSS feed discovery and API integration  
3. **Local Transcription**: High-speed Faster-Whisper processing
4. **Text Optimization**: AI-powered continuity enhancement and flow improvement
5. **Summarization**: Structured content analysis and key point extraction
6. **File Export**: Automatic saving of transcripts and summaries with download links

### Technology Stack

#### Frontend Architecture
- **HTML5**: Semantic markup with accessibility features
- **TailwindCSS**: Utility-first styling with custom design system
- **Vanilla JavaScript**: Lightweight, dependency-free client-side logic
- **Progressive Enhancement**: Graceful degradation for various devices

#### Backend Infrastructure
- **Node.js**: Asynchronous, event-driven server runtime
- **Express.js**: Minimalist web framework with middleware support
- **Python Integration**: Calls Faster-Whisper for local transcription
- **File Management**: Audio download, processing, and result saving

#### AI & ML Integration
- **Faster-Whisper**: Local high-performance speech-to-text transcription
- **GPT-4**: Advanced language model for podcast content summarization and text optimization
- **Custom Prompting**: Specialized prompts optimized for podcasts, enhancing continuity and quality

## 📁 Project Structure

```
podcast-to-text/
├── 📂 public/                          # Frontend Application
│   ├── 📄 index.html                   # Main application interface
│   └── 📄 script.js                    # Client-side logic & UI interactions
│
├── 📂 server/                          # Backend Services
│   ├── 📄 index.js                     # Express server & API routing
│   ├── 📄 whisper_transcribe.py        # Local Faster-Whisper transcription
│   ├── 📂 assets/                      # Test assets
│   │   └── 📄 test_audio.mp3           # Sample audio for testing
│   ├── 📂 services/                    # Core business logic
│   │   ├── 📄 openaiService.js         # AI processing & optimization
│   │   ├── 📄 podcastService.js        # Podcast extraction & parsing
│   │   ├── 📄 audioInfoService.js        # Audio information retrieval
│   │   └── 📄 rssParser.js             # RSS feed processing
│   └── 📂 temp/                        # Temporary audio & text storage (auto-created)
│
├── 📄 package.json                     # Dependencies & scripts
├── 📄 package-lock.json                # Dependency lock file
├── 📄 .env                            # Environment configuration (create from .env.example)
├── 📄 .gitignore                       # Git ignore rules
├── 📄 README.md                        # English documentation
├── 📄 README_zh.md                     # Chinese documentation
├── 📄 PLATFORM_SUPPORT.md             # Platform compatibility guide
├── 📄 start.sh                        # Production start script
├── 📄 quick-start.sh                   # Quick setup script
└── 📄 fix-cursor-terminal.md           # IDE troubleshooting guide
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 16+**: Runtime environment
- **Python 3.8+**: For local Faster-Whisper transcription (virtual environment required)
- **ffmpeg**: Audio processing library (usually pre-installed or available via package managers)
- **OpenAI API Key**: For transcription text optimization and AI summarization

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd podcast-transcriber

# Install Node.js dependencies
npm install

# Create Python virtual environment (required)
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# or venv\Scripts\activate  # Windows

# Install Python dependencies for transcription and AI analysis
pip install --upgrade pip
pip install faster-whisper opencc

# Configure environment (optional for basic functionality)
cp .env.example .env
# Edit .env file if needed

# Start the application in virtual environment
source venv/bin/activate && npm start
# or for development mode with auto-reload
source venv/bin/activate && npm run dev

# Access the application
open http://localhost:3000
```

### ⚡ Quick Commands

**Start the server:**
```bash
source venv/bin/activate && npm start
```

**Stop the server:**
```bash
pkill -f "node server/index.js"
```

**Check server status:**
```bash
curl http://localhost:3000/api/health
```

### ⚠️ Important Notes

**Python Virtual Environment Setup**: The project requires a Python virtual environment named `venv` in the project root directory. This is essential because the Node.js server calls `./venv/bin/python` to execute transcription scripts.

**Required Steps:**
1. Create the virtual environment in the project root: `python3 -m venv venv`
2. Activate the virtual environment: `source venv/bin/activate`
3. Install dependencies: `pip install faster-whisper opencc`
4. **Always start the server in virtual environment**: `source venv/bin/activate && npm start`

If you encounter errors like `/bin/sh: .../venv/bin/python: No such file or directory`, please ensure you follow all steps above.

### Configuration

The system works out-of-the-box with local transcription and Ollama AI analysis. Create a `.env` file for advanced configurations:

```env
# Local Whisper Configuration (default enabled)
USE_LOCAL_WHISPER=true
WHISPER_MODEL=base

# Enhanced Transcription (Speaker Diarization + Emotion Detection)
USE_ENHANCED_TRANSCRIPTION=true

# Ollama Configuration (for AI content analysis)
USE_OLLAMA=true
OLLAMA_BASE_URL=http://192.168.100.140:11434/v1
OLLAMA_MODEL=qwen3:30b-a3b-instruct-2507-q4_K_M

# Optional: OpenAI Configuration (for text optimization and summarization)
# OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# Server Configuration
PORT=3000

# Optional: Audio processing limits
MAX_SEGMENT_SIZE_MB=25
SEGMENT_DURATION_SECONDS=600
```

**Features Available:**
- ✅ **Local Transcription**: Works without any API keys
- ✅ **Speaker Diarization**: Identify different speakers
- ✅ **Emotion Detection**: Detect emotional markers in speech
- ✅ **AI Content Analysis**: Topic identification, professional terms matching, smart chaptering (requires Ollama)
- ⚠️ **OpenAI Summarization**: Optional, requires API key

## 🔧 Troubleshooting

### Common Issues

**Q: Getting `No such file or directory: .../venv/bin/python` error**

A: This indicates that the Python virtual environment is not properly created. Follow these steps:

```bash
# Ensure you're in the project root directory
cd /path/to/podcast-transcriber

# Remove any existing incorrect virtual environment
rm -rf venv

# Create a new virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Verify Python path
which python  # Should show .../venv/bin/python

# Install dependencies
pip install --upgrade pip
pip install faster-whisper

# Restart the server
npm start
```

**Q: Transcription function not responding or showing errors**

A: Ensure that:
1. Virtual environment is properly created and activated
2. `faster-whisper` is installed in the virtual environment
3. System has sufficient memory (recommend at least 4GB available)
4. ffmpeg is installed (check with `which ffmpeg`)

**Q: 500 Internal Server Error**

In most cases, HTTP 500 is not a network issue but a local Python virtual environment problem (missing `venv` or dependencies). Heuristic: if the podcast link opens fine in your browser, it’s unlikely a network issue.

Quick checklist:

```bash
# 1) Ensure you're at the project root
cd /path/to/podcast-transcriber

# 2) Recreate the virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate

# 3) Install dependencies
pip install --upgrade pip
pip install faster-whisper

# 4) Verify python path and ffmpeg
which python     # should be .../podcast-transcriber/venv/bin/python
which ffmpeg     # should point to a valid executable

# 5) Restart the server
npm start
```

If the problem persists, copy the terminal stack trace and open an issue with the logs attached.

**Q: First transcription is very slow**

A: This is normal behavior. Faster-Whisper needs to download model files (~75MB) on first run. Subsequent transcriptions will be much faster.

## 🔧 Advanced Features

### AI Text Optimization

- **Continuity Enhancement**: Seamless connection between transcribed segments
- **Language Preservation**: Maintains original speaker style and expression patterns
- **Filler Word Cleanup**: Intelligent removal of excessive verbal fillers while preserving meaning
- **Structured Summarization**: Hierarchical content organization with key point extraction

### Multi-Platform Support

- **Apple Podcasts**: RSS feed discovery and iTunes API integration
- **Xiaoyuzhoufm**: Native API support with fallback RSS parsing
- **Generic RSS**: Universal podcast feed compatibility
- **Direct Audio**: Support for MP3, M4A, WAV, AAC, and other formats

### Audio Processing
- **Support for Various Duration Podcasts**: Local Faster-Whisper model supports processing audio files of any size
- **Memory Optimization**: Intelligent memory management, suitable for personal devices and workstations
- **Audio Processing Time**: Depends on device performance, network environment, and selected Whisper model


## 🌐 Use Cases

### Personal Users
- **Study Notes**: Convert educational podcasts to text for easy review
- **Content Organization**: Create summary indexes for favorite podcasts
- **Multi-language Learning**: Get transcriptions in different languages for practice

### Professional Users
- **Content Creation**: Use podcast transcriptions for blog and article creation
- **Research Analysis**: Text analysis and citation of academic podcasts
- **Accessibility Support**: Provide text versions for hearing-impaired users

### Enterprise Applications
- **Meeting Records**: Automatic transcription of corporate podcasts and recordings
- **Content Marketing**: SEO optimization of podcast content in text format
- **Knowledge Management**: Integrate audio content into enterprise knowledge bases


## 📄 License

Apache 2.0 License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

