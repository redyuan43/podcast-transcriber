# Podcast Transcriber AI增强功能开发文档

## 项目概述
本项目是一个播客转录和分析系统，支持本地Whisper转录、说话人分离、情绪检测以及AI内容分析。

## 已完成功能 (阶段一)
1. **基础转录功能修复**
   - 修复了 `podcastService.js` 返回格式不一致问题
   - 修复了 `openaiService.js` API密钥缺失导致的崩溃问题

2. **增强转录功能**
   - 创建 `enhanced_whisper_transcribe.py` - 支持说话人分离和情绪检测
   - 创建 `optimize_whisper.py` - 性能优化脚本
   - 配置 `.env` 启用增强转录模式

## 进行中功能 (阶段二：AI内容理解与分析)

### 步骤3：宏观主题识别 (Macro-Topic Identification)
- **目标**: 对播客整体内容进行分类
- **实现**: 使用本地Ollama (gpt-oss:latest) 分析全文
- **输出**: 播客主要题材标签（如"科技 > 人工智能"）

### 步骤4：专业热词库匹配 (Custom Hotword Matching)
- **热词库选择**: 
  - 主要采用 [jiqizhixin/Artificial-Intelligence-Terminology-Database](https://github.com/jiqizhixin/Artificial-Intelligence-Terminology-Database) - 2400+ AI专业术语
  - 辅助使用 [fighting41love/funNLP](https://github.com/fighting41love/funNLP) - 多领域专业词汇
- **数据结构**: JSON格式，按领域分类存储
- **匹配算法**: 全文扫描+时间戳标注

### 步骤5：内容分章节 (Semantic Chunking)
- **技术方案**: 使用Ollama分析语义转折点
- **分割依据**: 话题转换、说话人变化、长停顿
- **输出格式**: 章节列表（开始/结束时间戳）

### 步骤6：章节摘要与关键词提取
- **摘要生成**: 调用Ollama生成每章节摘要
- **关键词提取**: 3-5个核心关键词
- **热词匹配**: 结合专业术语库

## 技术配置

### Ollama本地LLM配置
```env
USE_OLLAMA=true
OLLAMA_BASE_URL=http://192.168.100.140:11434/v1
OLLAMA_MODEL=gpt-oss:latest
```

### 新增文件结构
```
server/
├── services/
│   ├── ollamaAnalysisService.js  # Ollama集成服务
│   └── contentAnalysisService.js  # 内容分析主服务
├── data/
│   └── hotwords/                  # 专业热词库
│       ├── tech-ai.json          # AI科技领域
│       ├── business.json         # 商业领域
│       └── education.json        # 教育领域
└── utils/
    └── chapteringUtils.js         # 章节分割工具
```

## 输出数据格式
```json
{
  "basicTranscript": {
    "text": "...",
    "segments": [...],
    "speakers": [...],
    "emotions": [...]
  },
  "analysis": {
    "topic": "科技 > 人工智能",
    "hotwords": [
      {
        "term": "AIGC",
        "chinese": "AI生成内容",
        "timestamps": ["00:05:10", "00:18:25"]
      }
    ],
    "chapters": [
      {
        "title": "AI发展现状讨论",
        "start": "00:05:10",
        "end": "00:18:25",
        "summary": "本章节讨论了当前AI技术的发展现状...",
        "keywords": ["人工智能", "大模型", "算力"],
        "hotwords": ["AIGC", "Transformer", "GPT"]
      }
    ]
  }
}
```

## 运行指令
```bash
# 启动服务器
npm start

# 运行增强转录
python server/enhanced_whisper_transcribe.py audio.mp3 --enhanced

# 运行性能优化转录
python server/optimize_whisper.py audio.mp3 --benchmark
```

## 已完成任务 (阶段二) ✅
- [x] 实现 ollamaAnalysisService.js - Ollama本地LLM集成服务
- [x] 创建热词数据库 - 包含AI科技、商业、教育三个领域(共138个术语)
- [x] 实现章节分割算法 - 基于语义分析的智能分章
- [x] 集成所有分析功能到main service - contentAnalysisService.js
- [x] 实现热词匹配服务 - hotwordMatchingService.js
- [x] **测试验证通过** - 成功识别主题、匹配热词、生成分析报告

## 待完成任务 (阶段三)
- [ ] 前端UI展示 - 左侧摘要目录，右侧播放器
- [ ] 实现章节跳转功能
- [ ] 热词高亮和索引功能
- [ ] 数据结构化整合(JSON格式)

## 功能特性 ✨
- **基础转录**: 本地Faster-Whisper，支持多语言
- **增强转录**: 说话人分离 + 情绪检测
- **AI内容分析**: 主题识别、专业热词匹配、智能分章、摘要生成
- **多格式输出**: Markdown报告、JSON数据、音频转录

## 注意事项
- Ollama服务需要在 192.168.100.140:11434 运行
- 推荐使用 `qwen3:30b-a3b-instruct-2507-q4_K_M` 模型（非thinking模式）
- API调用兼容OpenAI格式
- AI分析功能需要 `USE_OLLAMA=true`