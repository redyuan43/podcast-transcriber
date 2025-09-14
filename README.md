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
- **⚡ Triple Engine Transcription**: Choose between SenseVoice, Whisper, or SenseVoice+PyAnnote (combined speed & precision)
- **🎭 Professional Speaker Diarization**: Advanced speaker separation with pyannote.audio for broadcast-quality results
- **🚀 GPU Acceleration**: Multi-GPU optimization with automatic device selection for maximum performance
- **🤖 AI Content Analysis**: Topic identification, keyword extraction, semantic chapter segmentation
- **🎯 Emotion & Event Detection**: Built-in recognition for emotions, applause, laughter, and audio events
- **📱 Responsive Design**: Modern mobile-first UI with speaker-based timeline layout
- **🌍 Multilingual Support**: 50+ languages with automatic language detection

## 🏗️ Architecture & Implementation

### System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │  External APIs  │
│                 │    │                  │    │                 │
│ • HTML5/CSS3    │◄──►│ • Express.js     │◄──►│ • OpenAI/Ollama │
│ • Vanilla JS    │    │ • Node.js        │    │ • RSS Feeds     │
│ • TailwindCSS   │    │ • SSE Progress   │    │ • Podcast APIs  │
│ • File Download │    │ • File Management│    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ AI Processing    │
                    │                  │
                    │ • SenseVoice     │◄── Multi-GPU Optimization
                    │ • Whisper        │◄── Speaker Diarization
                    │ • Content Analysis│◄── Ollama LLM
                    │ • Export Pipeline│
                    └──────────────────┘
```

### Core Processing Pipeline

1. **Podcast Link Analysis**: Multi-strategy URL parsing for Apple Podcasts, Xiaoyuzhou, and RSS feeds
2. **Audio Extraction**: Direct download with RSS feed discovery and API integration
3. **AI Transcription**: Dual-engine support (SenseVoice/Whisper) with GPU acceleration
4. **Content Analysis**: Topic identification, keyword extraction, semantic segmentation
5. **Enhancement & Optimization**: AI-powered text refinement and chapter generation
6. **Multi-Format Export**: Transcripts, summaries, and analysis reports with download links

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
- **SenseVoice**: Alibaba's multilingual model, 15x faster than Whisper with emotion detection
- **PyAnnote.audio**: Professional speaker diarization library for broadcast-quality speaker separation
- **Faster-Whisper**: OpenAI's model with speaker diarization and enhanced accuracy
- **Ollama**: Local LLM for content analysis, topic identification, and semantic processing
- **Multi-GPU Support**: Automatic GPU selection and memory optimization for maximum performance

## 📁 Project Structure

```
podcast-to-text/
├── 📂 public/                          # Frontend Application
│   ├── 📄 index.html                   # Main application interface
│   └── 📄 script.js                    # Client-side logic & UI interactions
│
├── 📂 server/                          # Backend Services
│   ├── 📄 index.js                     # Express server & API routing
│   ├── 📄 sensevoice_transcribe.py     # SenseVoice transcription (standard)
│   ├── 📄 sensevoice_optimize.py       # SenseVoice transcription (GPU optimized)
│   ├── 📄 sensevoice_with_diarization.py # SenseVoice + PyAnnote (combined engine)
│   ├── 📄 pyannote_diarization.py      # PyAnnote speaker separation
│   ├── 📄 alignment_service.py         # ASR-to-diarization alignment
│   ├── 📄 whisper_transcribe.py        # Whisper transcription (basic)
│   ├── 📄 enhanced_whisper_transcribe.py # Whisper with speaker diarization
│   ├── 📂 services/                    # Core business logic
│   │   ├── 📄 openaiService.js         # AI processing & orchestration
│   │   ├── 📄 podcastService.js        # Podcast extraction & parsing
│   │   ├── 📄 ollamaAnalysisService.js # Local LLM content analysis
│   │   ├── 📄 contentAnalysisService.js# Content analysis pipeline
│   │   ├── 📄 hotwordMatchingService.js# Professional terminology matching
│   │   └── 📄 rssParser.js             # RSS feed processing
│   ├── 📂 data/hotwords/               # Professional terminology database
│   └── 📂 temp/                        # Temporary audio & text storage
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
- **Python 3.8+**: For AI transcription engines (virtual environment required)
- **CUDA GPU**: Recommended for optimal SenseVoice performance (CPU fallback available)
- **ffmpeg**: Audio processing library (usually pre-installed or available via package managers)
- **OpenAI API Key** *(Optional)*: For advanced summarization
- **Ollama** *(Optional)*: For local LLM content analysis

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

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env to choose transcription engine:
# TRANSCRIPTION_ENGINE=sensevoice  # (Recommended: 15x faster)
# TRANSCRIPTION_ENGINE=whisper     # (Enhanced speaker features)

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

### 🎯 Engine Selection Guide

#### Option 1: SenseVoice + PyAnnote (Best Overall - Recommended)

For professional speaker diarization with maximum speed:

```env
# Combined Engine Configuration
TRANSCRIPTION_ENGINE=sensevoice_diarization

# SenseVoice Configuration
SENSEVOICE_LANGUAGE=auto           # auto/zh/en/yue/ja/ko
SENSEVOICE_BATCH_SIZE=1000         # Adjust based on GPU memory
SENSEVOICE_OPTIMIZE=true           # Enable multi-GPU optimization

# PyAnnote Configuration
PYANNOTE_NUM_SPEAKERS=             # Leave empty for auto-detection
PYANNOTE_MIN_SPEAKERS=1
PYANNOTE_MAX_SPEAKERS=10

# HuggingFace Authentication (Required)
HF_TOKEN=your_huggingface_token_here
```

**Performance Benefits:**
- 🚀 **15x faster** than Whisper for transcription
- 🎭 **Professional speaker separation** with precise timestamps
- 🎯 **Multi-GPU support** with automatic device selection
- 🌍 **50+ languages** with superior accuracy
- 📊 **Speaker statistics** and detailed analytics

#### Option 2: SenseVoice Only (Speed Priority)

For maximum transcription speed without speaker separation:

```env
# Transcription Engine Configuration
TRANSCRIPTION_ENGINE=sensevoice

# SenseVoice Configuration (GPU Optimized)
SENSEVOICE_LANGUAGE=auto           # auto/zh/en/yue/ja/ko
SENSEVOICE_BATCH_SIZE=1000         # Adjust based on GPU memory
SENSEVOICE_OPTIMIZE=true           # Enable multi-GPU optimization
```

**Performance Benefits:**
- ⚡ **Fastest processing** - 15x faster than Whisper
- 🎭 **Built-in emotion detection** and audio event recognition
- 💾 **Lower resource usage** - no speaker diarization overhead

#### Option 3: Whisper (Traditional - Compatibility)

For enhanced speaker features with traditional approach:

```env
# Transcription Engine Configuration
TRANSCRIPTION_ENGINE=whisper

# Whisper Configuration
USE_LOCAL_WHISPER=true
WHISPER_MODEL=base                 # base/small/medium/large
USE_ENHANCED_TRANSCRIPTION=true    # Enable speaker diarization
```

## 🔧 Speaker Diarization Setup

### HuggingFace Authentication (Required for PyAnnote)

To use the professional speaker diarization, you need a HuggingFace token:

```bash
# Method 1: Environment Variable
export HF_TOKEN=your_huggingface_token_here

# Method 2: HuggingFace CLI Login
hf auth login
# Enter your token when prompted
```

**Get Your Token:**
1. Visit https://huggingface.co/settings/tokens
2. Create a new token with "Read" permissions
3. Copy the token and configure as shown above

### Available Features Summary

- ✅ **SenseVoice+PyAnnote**: Professional speaker separation with 15x speed boost
- ✅ **SenseVoice Only**: Fastest transcription with emotion detection
- ✅ **Whisper Enhanced**: Traditional speaker diarization and segmentation
- ✅ **AI Content Analysis**: Topic identification, terminology matching, semantic chaptering
- ✅ **Multi-Format Export**: Transcripts, summaries, analysis reports (TXT/JSON/MD)
- ✅ **Auto Audio Format Conversion**: Supports M4A, MP4, AAC → WAV conversion
- ⚠️ **OpenAI Integration**: Optional advanced summarization (requires API key)

## 🎯 Latest System Performance

### SenseVoice + PyAnnote Combined Engine Results

**Real-world Performance Test** (5:46 audio, Chinese podcast):
- **⚡ Processing Speed**: 12.1 seconds total = **28.6x real-time speed**
- **🎤 SenseVoice Transcription**: 9.8s (RTF=0.033)
- **🎭 PyAnnote Speaker Separation**: 14.1s, detected 2 speakers, 23 segments
- **📊 Transcription Quality**: 1976 characters, semantically complete Chinese text
- **🔄 Auto Format Conversion**: M4A → WAV (16kHz, mono) for PyAnnote compatibility

### System Architecture Improvements

**✅ Path Resolution Fixed**:
- Replaced relative path commands with absolute paths
- No more `venv/bin/activate` directory issues
- Works from any working directory

**✅ Audio Format Compatibility**:
- Automatic detection of M4A, MP4, AAC formats
- Silent ffmpeg conversion to WAV for PyAnnote
- Fallback to original format if conversion fails

**✅ Production Ready**:
- Complete error handling and user guidance
- Clean JSON output without stderr contamination
- Comprehensive logging for debugging

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
pip install -r requirements.txt

# Test SenseVoice installation
python -c "from funasr import AutoModel; print('✅ SenseVoice ready')"

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

**Q: Speaker diarization not working - "Token is required" error**

A: This indicates PyAnnote needs HuggingFace authentication. Follow these steps:

```bash
# Get your token from https://huggingface.co/settings/tokens
export HF_TOKEN=your_token_here

# Or use CLI login
hf auth login

# Test the authentication
source venv/bin/activate
python -c "from huggingface_hub import HfApi; print('✅ Token valid')"

# Restart the server
npm start
```

**Q: PyAnnote installation issues**

A: Ensure you have the correct PyTorch version with CUDA support:

```bash
source venv/bin/activate

# Install PyTorch with CUDA
pip install torch>=2.7.1 torchaudio>=2.7.1 --index-url https://download.pytorch.org/whl/cu118

# Install PyAnnote
pip install pyannote.audio

# Test installation
python -c "import pyannote.audio; print('✅ PyAnnote ready')"
```

**Q: "venv/bin/activate: No such file or directory" error**

A: This error occurs when the working directory changes during processing. The latest version fixes this with absolute paths:

```bash
# Ensure you're in the project root
cd /path/to/podcast-transcriber

# Verify virtual environment exists
ls venv/bin/python  # Should exist

# The system now uses absolute paths automatically
```

**Q: M4A/MP4 audio format not supported**

A: The system now automatically converts unsupported formats:

```bash
# The system will automatically convert:
# M4A → WAV (16kHz, mono) for PyAnnote compatibility
# MP4 → WAV for audio processing
# AAC → WAV for maximum compatibility

# Manual conversion (if needed):
ffmpeg -i input.m4a -ar 16000 -ac 1 output.wav
```

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

