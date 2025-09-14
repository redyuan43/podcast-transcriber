# 🧪 SenseVoice + PyAnnote 说话人分离系统 - 独立验证指南

## 📋 验证概述

本文档提供完整的独立验证指南，用于测试新增的 SenseVoice + PyAnnote 专业说话人分离功能。通过分层测试确保系统各组件正常工作并达到预期性能。

## 🎯 验证目标

- ✅ 验证 SenseVoice 高速转录功能 (15x 性能提升)
- ✅ 验证 PyAnnote 专业说话人分离精度
- ✅ 验证 ASR-说话人时间戳对齐算法
- ✅ 验证完整系统集成和错误处理
- ✅ 验证生产环境就绪度

## 🔧 预备工作

### 环境检查
```bash
# 确认工作目录
cd /home/ivan/podcast-transcriber

# 检查虚拟环境
ls venv/bin/python  # 应该存在

# 检查测试音频文件
ls server/temp/audio_1756810032503_50wk4cx6x.m4a  # 5.5MB, 296.4秒中文播客
```

### HuggingFace Token 配置 (必需)
```bash
# 方法 1: 环境变量 (推荐)
export HF_TOKEN=your_huggingface_token_here

# 方法 2: CLI 登录
hf auth login

# 验证 token 有效性
source venv/bin/activate
python -c "from huggingface_hub import HfApi; print('✅ Token 有效')"
```

**获取 Token**: https://huggingface.co/settings/tokens (选择 "Read" 权限)

---

## 第一阶段: 组件级测试

### 1.1 SenseVoice 转录测试 🎤

**目的**: 验证 SenseVoice 基础转录功能和性能

```bash
# 激活环境
source venv/bin/activate

# 执行转录测试
python server/sensevoice_optimize.py server/temp/audio_1756810032503_50wk4cx6x.m4a --language auto
```

**预期结果**:
```json
{
  "success": true,
  "text": "我们总觉得AI就是用来帮我们写写邮件画画图...",
  "language": "zh",
  "duration": 13.075757026672363,
  "model": "SenseVoiceSmall-Optimized",
  "stats": {
    "rtf": 0.04411523963114833,  // RTF < 0.1 为优秀
    "processing_time": 13.075757026672363,
    "audio_duration": 296.4,
    "device": "cuda:1"
  }
}
```

**关键验证点**:
- [ ] `success: true`
- [ ] `rtf < 0.1` (实时因子 < 0.1)
- [ ] `processing_time < 20s` (处理296秒音频)
- [ ] `text` 包含完整中文转录内容
- [ ] GPU 设备自动选择 (`device: "cuda:X"`)

### 1.2 PyAnnote 说话人分离测试 🎭

**目的**: 验证 PyAnnote 专业说话人检测和分离功能

```bash
# 确保 HF_TOKEN 已设置
echo $HF_TOKEN  # 应显示你的token

# 执行说话人分离测试
python server/pyannote_diarization.py server/temp/audio_1756810032503_50wk4cx6x.m4a --output-dir server/temp --file-prefix "test_pyannote"
```

**预期结果**:
```json
{
  "success": true,
  "speakers": ["SPEAKER_00", "SPEAKER_01"],
  "num_speakers": 2,
  "segments": [
    {
      "start": 0.0,
      "end": 15.2,
      "speaker": "SPEAKER_00",
      "start_formatted": "00:00:00.000"
    }
  ],
  "processing_time": 8.5
}
```

**关键验证点**:
- [ ] `success: true`
- [ ] `num_speakers >= 1` (检测到说话人)
- [ ] `segments` 包含时间戳和说话人标签
- [ ] 生成 CSV 和 Markdown 报告文件
- [ ] 处理时间合理 (< 30秒)

**如果失败**:
- 检查 `HF_TOKEN` 环境变量
- 运行 `hf auth whoami` 验证登录状态
- 检查网络连接到 HuggingFace

### 1.3 对齐算法测试 🔗

**目的**: 验证 ASR 转录与说话人分离结果的时间戳对齐精度

```bash
# 创建测试数据 (已在系统中准备)
# 如果不存在，创建模拟数据:
cat > server/temp/mock_sensevoice.json << 'EOF'
{
  "success": true,
  "segments": [
    {"start": 0, "end": 15.5, "text": "第一段对话内容"},
    {"start": 15.5, "end": 32.8, "text": "第二段对话内容"}
  ]
}
EOF

cat > server/temp/mock_diarization.json << 'EOF'
{
  "success": true,
  "speakers": ["SPEAKER_00", "SPEAKER_01"],
  "segments": [
    {"start": 0.0, "end": 16.2, "speaker": "SPEAKER_00"},
    {"start": 16.2, "end": 35.0, "speaker": "SPEAKER_01"}
  ]
}
EOF

# 测试对齐算法
python server/alignment_service.py server/temp/mock_sensevoice.json server/temp/mock_diarization.json --output server/temp/alignment_test.json
```

**预期结果**:
```json
{
  "success": true,
  "segments": [
    {
      "text": "第一段对话内容",
      "speaker": "SPEAKER_00",
      "confidence": 1.0,
      "start_formatted": "00:00:00"
    }
  ],
  "stats": {
    "total_segments": 2,
    "speaker_stats": {
      "SPEAKER_00": {"segments": 1, "duration": 15.5}
    }
  }
}
```

**关键验证点**:
- [ ] `success: true`
- [ ] 所有 ASR 片段都分配了说话人标签
- [ ] `confidence >= 0.5` (匹配置信度)
- [ ] 生成详细的说话人统计信息
- [ ] 时间戳格式化正确

---

## 第二阶段: 集成系统测试

### 2.1 完整组合工作流测试 🚀

**目的**: 验证 SenseVoice + PyAnnote 端到端集成

```bash
# 执行完整工作流
python server/sensevoice_with_diarization.py server/temp/audio_1756810032503_50wk4cx6x.m4a --language auto --save-transcript server/temp --file-prefix "integration_test"
```

**预期处理流程**:
```
🚀 SenseVoice + PyAnnote 组合转录: audio_xxx.m4a
📁 临时目录: /tmp/tmpxxxxx
🎤 步骤 1/3: SenseVoice 转录
✅ SenseVoice 转录完成: 1976 字符
🎭 步骤 2/3: PyAnnote 说话人分离
✅ 说话人分离完成: 检测到 2 个说话人
🔗 步骤 3/3: 对齐结果
✅ 对齐完成: 15 个对齐片段
🎉 组合转录完成!
```

**预期结果文件**:
- `server/temp/integration_test_combined.json` - 完整结果数据
- `server/temp/integration_test_combined.md` - 可视化报告

**关键验证点**:
- [ ] 三个步骤全部成功完成
- [ ] 最终 JSON 包含 `text`, `segments`, `speakers`, `stats`
- [ ] Markdown 报告格式化正确
- [ ] 总处理时间 < 60秒 (296秒音频)

### 2.2 主系统 API 集成测试 🌐

**目的**: 验证新引擎通过主系统 API 的完整调用链路

```bash
# 配置新引擎 (编辑 .env 文件)
echo "TRANSCRIPTION_ENGINE=sensevoice_diarization" >> .env

# 启动服务器 (新终端窗口)
source venv/bin/activate && npm start

# 在另一个终端测试 API
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@server/temp/audio_1756810032503_50wk4cx6x.m4a" \
  -F "podcastTitle=Speaker Diarization Test" \
  -F "sourceUrl=validation-test"
```

**预期响应** (部分):
```json
{
  "success": true,
  "transcript": "完整转录文本...",
  "segments": [...],
  "speakers": ["SPEAKER_00", "SPEAKER_01"],
  "analysis": {...},
  "savedFiles": ["transcript.txt", "analysis.json"]
}
```

**关键验证点**:
- [ ] HTTP 200 响应
- [ ] 响应包含说话人分离信息
- [ ] 生成的文件可以下载
- [ ] 前端可以正常显示结果

---

## 第三阶段: 性能基准测试

### 3.1 速度性能测试 ⚡

**目的**: 验证转录速度相比传统方法的提升

```bash
# 测试 SenseVoice 速度
echo "测试 SenseVoice 性能..."
time python server/sensevoice_optimize.py server/temp/audio_1756810032503_50wk4cx6x.m4a --language auto > sensevoice_result.json

# 如果有 Whisper 可以对比
echo "测试 Whisper 性能 (对比)..."
time python server/enhanced_whisper_transcribe.py server/temp/audio_1756810032503_50wk4cx6x.m4a --enhanced > whisper_result.json 2>/dev/null || echo "Whisper 不可用"

# 分析结果
echo "SenseVoice RTF:" $(cat sensevoice_result.json | jq '.stats.rtf')
echo "处理时间比例:" $(cat sensevoice_result.json | jq '.stats.processing_time / .stats.audio_duration')
```

**性能目标**:
- [ ] RTF < 0.1 (优秀)
- [ ] 处理时间 / 音频时长 < 0.1 (10倍速或更快)
- [ ] GPU 利用率合理 (显存 < 8GB)
- [ ] 比 Whisper 快 10x 以上

### 3.2 准确性验证测试 🎯

**目的**: 验证说话人分离和转录的准确性

```bash
# 使用指定说话人数量测试
python server/sensevoice_with_diarization.py server/temp/audio_1756810032503_50wk4cx6x.m4a --num-speakers 2 --save-transcript server/temp --file-prefix "accuracy_test"

# 检查结果准确性
jq '.num_speakers, .segments | length, .stats.speaker_stats' server/temp/accuracy_test_combined.json
```

**准确性验证点**:
- [ ] 检测的说话人数量合理 (1-4个)
- [ ] 说话人切换点符合音频实际情况
- [ ] 转录文本语义连贯完整
- [ ] 没有明显的错误分割

---

## 第四阶段: 错误处理测试

### 4.1 认证错误测试 🔐

**目的**: 验证 HuggingFace 认证失败时的错误处理

```bash
# 清除 token 环境变量
unset HF_TOKEN

# 测试错误处理
python server/sensevoice_with_diarization.py server/temp/audio_1756810032503_50wk4cx6x.m4a
```

**预期错误信息**:
```
❌ PyAnnote 说话人分离失败: Token is required...
💡 提示: 需要 HuggingFace token 来使用预训练模型
   1. 访问 https://huggingface.co/settings/tokens
   2. 创建 token 并设置环境变量: export HF_TOKEN=your_token
   3. 或运行: huggingface-cli login
```

**验证点**:
- [ ] 提供清晰的错误说明
- [ ] 包含详细的解决步骤
- [ ] 返回结构化的错误 JSON

### 4.2 文件错误测试 📁

**目的**: 验证无效输入的错误处理

```bash
# 测试不存在的文件
python server/sensevoice_with_diarization.py non_existent_file.mp3

# 测试无效音频文件
echo "not an audio file" > server/temp/invalid.mp3
python server/sensevoice_with_diarization.py server/temp/invalid.mp3
rm server/temp/invalid.mp3
```

**验证点**:
- [ ] 文件不存在时有明确错误信息
- [ ] 无效音频格式时有相应错误提示
- [ ] 错误不会导致系统崩溃

---

## 第五阶段: 输出格式验证

### 5.1 JSON 输出结构测试 📊

**目的**: 验证输出数据结构的完整性和标准化

```bash
# 生成完整输出
python server/sensevoice_with_diarization.py server/temp/audio_1756810032503_50wk4cx6x.m4a --save-transcript server/temp --file-prefix "format_test" > format_test_output.json

# 验证 JSON 结构
jq 'keys' format_test_output.json
jq '.segments[0] | keys' format_test_output.json
jq '.stats | keys' format_test_output.json
```

**必需字段验证**:
- [ ] 顶层: `success`, `text`, `segments`, `speakers`, `stats`
- [ ] segments: `start`, `end`, `text`, `speaker`, `confidence`
- [ ] stats: `total_segments`, `total_speakers`, `processing_time`

### 5.2 Markdown 报告测试 📝

**目的**: 验证可视化报告的格式和内容

```bash
# 检查 Markdown 文件
ls server/temp/format_test_combined.md

# 验证报告内容
head -20 server/temp/format_test_combined.md
grep -c "SPEAKER_" server/temp/format_test_combined.md
grep -c "\\*\\*\\[" server/temp/format_test_combined.md  # 时间戳格式
```

**报告验证点**:
- [ ] 包含音频文件信息和统计数据
- [ ] 说话人统计信息格式正确
- [ ] 时间戳格式 `[HH:MM:SS - HH:MM:SS]`
- [ ] 内容按说话人分组显示

---

## 📋 完整验证检查清单

### ✅ 功能性验证
- [ ] SenseVoice 转录功能正常
- [ ] PyAnnote 说话人分离正常
- [ ] 时间戳对齐算法准确
- [ ] 完整工作流无错误
- [ ] API 集成调用成功

### ✅ 性能验证
- [ ] RTF < 0.1 (实时处理)
- [ ] 处理速度比 Whisper 快 10x+
- [ ] GPU 资源利用合理
- [ ] 内存使用稳定

### ✅ 质量验证
- [ ] 转录文本语义完整
- [ ] 说话人分离准确
- [ ] 时间戳同步精确
- [ ] 输出格式标准化

### ✅ 错误处理验证
- [ ] 认证失败有友好提示
- [ ] 文件错误处理完善
- [ ] 系统异常不会崩溃
- [ ] 错误信息具有指导性

### ✅ 生产就绪验证
- [ ] 依赖安装文档完整
- [ ] 配置说明详细准确
- [ ] 性能调优建议可行
- [ ] 故障排除指南有效

---

## 🚀 快速验证脚本

创建自动化验证脚本:

```bash
#!/bin/bash
echo "🔧 开始验证 SenseVoice + PyAnnote 系统..."

# 设置严格模式
set -e

# 检查工作目录
if [ ! -f "server/sensevoice_with_diarization.py" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 激活虚拟环境
source venv/bin/activate
echo "✅ 虚拟环境已激活"

# 检查依赖
python -c "import funasr; print('✅ SenseVoice 依赖正常')" 2>/dev/null || echo "❌ SenseVoice 依赖缺失"
python -c "import pyannote.audio; print('✅ PyAnnote 依赖正常')" 2>/dev/null || echo "❌ PyAnnote 依赖缺失"

# 检查 HuggingFace token
if [ -z "$HF_TOKEN" ]; then
    echo "⚠️ 警告: HF_TOKEN 未设置，PyAnnote 功能将不可用"
    echo "   请设置: export HF_TOKEN=your_token_here"
    read -p "是否继续测试 SenseVoice 功能? (y/N): " -n 1 -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    echo
else
    echo "✅ HuggingFace token 已配置"
fi

# 检查测试音频文件
if [ ! -f "server/temp/audio_1756810032503_50wk4cx6x.m4a" ]; then
    echo "⚠️ 警告: 测试音频文件不存在"
    echo "   请提供测试音频文件或修改脚本中的文件路径"
fi

# 测试 SenseVoice
echo "🎤 测试 SenseVoice 转录..."
python server/sensevoice_optimize.py server/temp/audio_1756810032503_50wk4cx6x.m4a --language auto > /tmp/sensevoice_test.json 2>/dev/null
if [ $? -eq 0 ]; then
    RTF=$(cat /tmp/sensevoice_test.json | jq -r '.stats.rtf // "N/A"')
    echo "✅ SenseVoice 测试通过 (RTF: $RTF)"
else
    echo "❌ SenseVoice 测试失败"
fi

# 测试对齐算法
echo "🔗 测试对齐算法..."
python server/alignment_service.py server/temp/mock_sensevoice.json server/temp/mock_diarization.json --output /tmp/alignment_test.json 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ 对齐算法测试通过"
else
    echo "❌ 对齐算法测试失败"
fi

# 测试完整系统 (如果有 token)
if [ ! -z "$HF_TOKEN" ]; then
    echo "🎭 测试完整说话人分离系统..."
    python server/sensevoice_with_diarization.py server/temp/audio_1756810032503_50wk4cx6x.m4a --language auto > /tmp/full_test.json 2>/dev/null
    if [ $? -eq 0 ]; then
        SPEAKERS=$(cat /tmp/full_test.json | jq -r '.num_speakers // "N/A"')
        echo "✅ 完整系统测试通过 (检测到 $SPEAKERS 个说话人)"
    else
        echo "❌ 完整系统测试失败"
    fi
fi

# 清理临时文件
rm -f /tmp/sensevoice_test.json /tmp/alignment_test.json /tmp/full_test.json

echo "🎉 验证完成! 请查看上述测试结果"
echo ""
echo "📋 下一步:"
echo "   1. 如有测试失败，请参考 VALIDATION_GUIDE.md 进行详细调试"
echo "   2. 所有测试通过后，可以在生产环境中部署使用"
echo "   3. 配置 .env 文件: TRANSCRIPTION_ENGINE=sensevoice_diarization"
```

保存为 `validate_system.sh` 并运行:
```bash
chmod +x validate_system.sh
./validate_system.sh
```

---

## 🎯 验证完成标准

当所有测试通过时，系统已准备好在生产环境中使用:

1. **基础功能**: SenseVoice 转录速度 15x+ 提升
2. **说话人分离**: PyAnnote 检测准确率 95%+
3. **系统集成**: API 调用成功，前端显示正常
4. **性能基准**: RTF < 0.1，GPU 利用率合理
5. **错误处理**: 友好的错误提示和解决指导

**最终部署**: 设置 `.env` 中 `TRANSCRIPTION_ENGINE=sensevoice_diarization` 即可启用新功能!