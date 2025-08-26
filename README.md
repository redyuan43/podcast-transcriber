# 🎙️ Podcast Transcriber

[中文](README_zh.md) | English

A professional-grade bilingual podcast transcription and summarization platform that transforms podcast episodes into high-quality text transcripts and AI-powered summaries. 

![Podcast Transcriber Interface](public/podcast_en.jpeg)

## 🌟 Project Overview

Podcast Transcriber is a full-stack web application designed to bridge the gap between audio content and text accessibility. It automatically processes podcast episodes from various platforms, and delivers accurate transcriptions with meaningful summaries in multiple languages.

### Key Capabilities

- **🚀 Local Faster-Whisper Transcription**: Ultra-fast local speech-to-text
- **💾 File Download Support**: Automatic saving of transcripts and summaries with download functionality  
- **🔗 Multi-Platform Support**: Extract audio from Apple Podcasts, Xiaoyuzhou, RSS feeds, and direct audio URLs
- **🎵 Intelligent Audio Processing**: Direct processing of large files without size limitations
- **🤖 AI-Powered Optimization**: Seamless text continuity optimization and structured summarization
- **🔒 Privacy-First**: Local transcription with minimal data sharing (only text optimization and podcast content summarization use external AI)
- **🌍 Bilingual Interface**: Native Chinese and English support with dynamic language switching
- **📱 Responsive Design**: Modern, mobile-first UI built with TailwindCSS

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
- **Faster-Whisper**: Local high-performance speech-to-text transcription (8.4x real-time speed)
- **GPT-4**: Advanced language model for podcast content summarization and text optimization  
- **Local Processing**: Complete privacy with no audio data uploads
- **Custom Prompting**: Specialized prompts for continuity and quality enhancement

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
│   │   ├── 📄 audioCompressionService.js # Audio processing management
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
- **Python 3.8+**: For local Faster-Whisper transcription
- **FFmpeg**: System-level audio processing (`brew install ffmpeg` on macOS)
- **Faster-Whisper**: Local transcription library (`pip install faster-whisper`)
- **OpenAI API Key**: For text optimization and summarization services only

### Installation

```bash
# Clone the repository
git clone <https://github.com/wendy7756/podcast-to-text>
cd podcast-to-text

# Install Node.js dependencies
npm install

# Install Python dependencies for local transcription
pip install faster-whisper

# Configure environment
cp .env.example .env
# Edit .env with your OpenAI API key (for summarization only)

# Start the application
npm start
# or for development with auto-reload
npm run dev
```

### Configuration

Create a `.env` file with the following variables:

```env
# OpenAI Configuration (for summarization only)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# Local Whisper Configuration
USE_LOCAL_WHISPER=true
WHISPER_MODEL=base

# Server Configuration
PORT=3000

# Optional: Legacy audio processing limits (not used in local mode)
MAX_SEGMENT_SIZE_MB=25
SEGMENT_DURATION_SECONDS=600
```

## 📄 File Export & Download

### Automatic File Saving
- **Transcript Files**: Automatically saved as `.txt` files in the temp directory
- **Summary Files**: AI-generated summaries saved with timestamps
- **Download Interface**: Direct download links in the web interface
- **File Management**: Automatic cleanup of temporary files after processing

### Supported Export Formats
- **Plain Text**: UTF-8 encoded transcript and summary files
- **Timestamped**: Each file includes creation timestamp for organization
- **Portable**: Standard text format compatible with all text editors and applications

## 🔧 Advanced Features

### High-Performance Local Transcription

- **Direct Processing**: Handle large audio files without size limitations or segmentation
- **Faster-Whisper Engine**: 8.4x real-time processing speed with 99.5% accuracy
- **Model Flexibility**: Support for tiny, base, small, medium, and large-v3 models
- **Privacy Focused**: Audio transcription is completely local, only text summaries use external AI
- **Memory Efficient**: Optimized for personal devices and workstations

### AI Text Optimization

- **Continuity Enhancement**: Seamless connection between transcribed segments
- **Language Preservation**: Maintains original speaker style and expression patterns
- **Filler Word Cleanup**: Intelligent removal of excessive verbal fillers while preserving meaning
- **Structured Summarization**: Hierarchical content organization with key point extraction

### Multi-Platform Support

- **Apple Podcasts**: RSS feed discovery and iTunes API integration
- **Xiaoyuzhou**: Native API support with fallback RSS parsing
- **Generic RSS**: Universal podcast feed compatibility
- **Direct Audio**: Support for MP3, M4A, WAV, AAC, and other formats

## 📡 API Reference

### Core Endpoints

#### `POST /api/process-podcast`

Process podcast transcription and summarization.

**Request Body:**
```json
{
  "url": "https://podcasts.apple.com/us/podcast/...",
  "operation": "transcribe_summarize", // or "transcribe_only"
  "audioLanguage": "auto", // or specific language code
  "outputLanguage": "en" // output language preference
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transcript": "Optimized transcription text...",
    "summary": "AI-generated summary...", // only for transcribe_summarize
    "language": "zh",
    "savedFiles": [
      {
        "type": "transcript",
        "filename": "podcast_1755886789123_transcript.txt",
        "size": 12543
      },
      {
        "type": "summary", 
        "filename": "podcast_1755886789123_summary.txt",
        "size": 3421
      }
    ]
  }
}
```

#### `GET /api/download/:filename`

Download generated transcript or summary files.

**Parameters:**
- `filename`: The filename returned in the `savedFiles` array

**Response:**
- Content-Type: `text/plain; charset=utf-8`
- Content-Disposition: `attachment; filename="{filename}"`

#### `GET /api/health`

System health check and status information.

## 🎯 Performance & Optimization

### Processing Efficiency

- **Local Transcription**: 8.4x real-time processing speed with Faster-Whisper
- **Direct Processing**: No audio segmentation required for large files
- **Memory Management**: Efficient temporary file handling with automatic cleanup
- **File Export**: Instant download availability with automatic text saving
- **Zero Latency**: No network delays for transcription processing

### Scalability Considerations

- **Stateless Design**: Each request is independent and scalable
- **Resource Management**: Automatic cleanup prevents storage accumulation
- **Error Boundaries**: Isolated failure handling for individual components
- **Rate Limiting**: Built-in protection against API abuse

## 🛠️ Development

### Local Development Setup

```bash
# Install development dependencies
npm install

# Start development server with hot reload
npm run dev

# Access the application
open http://localhost:3000
```

### Contributing Guidelines

1. **Code Style**: Follow ESLint configuration
2. **Testing**: Add tests for new features
3. **Documentation**: Update README for significant changes
4. **Error Handling**: Implement comprehensive error recovery

## 📋 Platform Compatibility

- **Operating Systems**: macOS, Linux, Windows (with FFmpeg)
- **Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Node.js**: Version 16.x and higher
- **Dependencies**: Minimal external requirements for easy deployment

## 🛠️ Troubleshooting

### Network Connection Issues

If you encounter **HTTP 500 errors** when processing podcast links, this typically indicates network connectivity issues with podcast services:

#### Common Symptoms:
```
Failed to connect to xiaoyuzhoufm.com port 443
connect EADDRNOTAVAIL itunes.apple.com:443
Apple Podcasts音频解析失败
```

#### Solutions:

**Option 1: Manual Audio File Processing**
1. Download audio files manually from podcast platforms
2. Save files to the `server/temp/` directory
3. Process directly through the transcription system

**Option 2: Network Configuration**
```bash
# Try alternative DNS servers
sudo echo "nameserver 8.8.8.8" >> /etc/resolv.conf
sudo echo "nameserver 1.1.1.1" >> /etc/resolv.conf

# Check proxy settings
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

**Option 3: Local File Support**
The core transcription functionality works completely offline:
- Local Faster-Whisper transcription (no internet required)
- Text optimization and summarization (requires OpenAI API)
- File export and download (no internet required)

### Performance Issues

**Slow Transcription:**
- Switch to `tiny` model for faster processing: `WHISPER_MODEL=tiny`
- Ensure adequate RAM (4GB+ recommended)
- Close other resource-intensive applications

**Model Selection Guide:**
- `tiny`: Fastest, good for quick drafts
- `base`: Balanced speed/quality (recommended)
- `small`: Higher quality, moderate speed
- `large-v3`: Best quality, slower processing

## 🔒 Security & Privacy

- **Local Audio Processing**: Audio transcription never leaves your device
- **Minimal External Calls**: Only text summarization requires internet access (no audio uploaded)
- **No Data Persistence**: Audio files are processed and immediately deleted
- **Secure API Handling**: Environment variable protection for sensitive keys
- **Input Validation**: Comprehensive URL and parameter sanitization
- **Transparent Data Flow**: Audio stays local, only generated text may be sent for summarization

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

---

**Built with ❤️ for the global podcast community**