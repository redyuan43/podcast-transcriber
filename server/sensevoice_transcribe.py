#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
SenseVoice 转录脚本 - 高效音频转文字
支持多语言、情感识别、音频事件检测
"""

import sys
import json
import os
import argparse
import time
from pathlib import Path
from funasr import AutoModel
from funasr.utils.postprocess_utils import rich_transcription_postprocess
from modelscope import snapshot_download

# 设置缓存目录
cache_dir = os.path.expanduser("~/.cache/funasr")
os.makedirs(cache_dir, exist_ok=True)

def download_model():
    """下载 SenseVoice 模型"""
    try:
        import contextlib
        from io import StringIO

        # 捕获模型下载的stdout输出
        f = StringIO()
        with contextlib.redirect_stdout(f):
            model_dir = snapshot_download(
                "iic/SenseVoiceSmall",
                cache_dir=cache_dir
            )

        # 将下载信息输出到stderr
        download_info = f.getvalue()
        if download_info.strip():
            print(f"📦 模型下载信息: {download_info.strip()}", file=sys.stderr)

        return model_dir
    except Exception as e:
        print(f"❌ 模型下载失败: {e}", file=sys.stderr)
        # 如果下载失败，尝试使用本地缓存
        local_model = os.path.join(cache_dir, "hub", "models--iic--SenseVoiceSmall")
        if os.path.exists(local_model):
            print(f"📦 使用本地缓存模型", file=sys.stderr)
            return local_model
        raise

def format_timestamp(seconds):
    """将秒数转换为 HH:MM:SS 格式"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"

def transcribe_audio(audio_path, language="auto", use_itn=True, batch_size=64):
    """
    使用 SenseVoice 转录音频

    参数:
        audio_path: 音频文件路径
        language: 语言设置 (auto/zh/en/yue/ja/ko)
        use_itn: 是否使用数字规范化 (ITN)
        batch_size: 批处理大小
    """
    start_time = time.time()

    print(f"🎤 开始转录: {os.path.basename(audio_path)}", file=sys.stderr)
    print(f"📊 配置: 语言={language}, ITN={use_itn}, 批大小={batch_size}", file=sys.stderr)

    try:
        # 下载或获取模型路径
        model_dir = download_model()

        # 选择最佳GPU设备
        import torch
        if torch.cuda.is_available():
            # 选择显存最多的GPU
            gpu_count = torch.cuda.device_count()
            best_gpu = 0
            if gpu_count > 1:
                max_memory = 0
                for i in range(gpu_count):
                    memory = torch.cuda.get_device_properties(i).total_memory
                    if memory > max_memory:
                        max_memory = memory
                        best_gpu = i
            device = f"cuda:{best_gpu}"
            print(f"🎯 使用GPU: {torch.cuda.get_device_name(best_gpu)} (设备 {best_gpu})", file=sys.stderr)
        else:
            device = "cpu"
            print(f"⚠️ 未检测到CUDA，使用CPU", file=sys.stderr)

        # 初始化 SenseVoice 模型（优化配置）
        print(f"🔄 加载 SenseVoice 模型到 {device}...", file=sys.stderr)

        # 捕获模型初始化的输出
        import contextlib
        from io import StringIO
        f2 = StringIO()
        with contextlib.redirect_stdout(f2):
            model = AutoModel(
                model=model_dir,
                trust_remote_code=True,
                remote_code="./model.py",
                vad_model="fsmn-vad",
                vad_kwargs={
                    "max_single_segment_time": 30000,
                    "max_end_silence_time": 800,  # 减少静音检测时间
                },
                device=device
            )

        # 将模型初始化信息输出到stderr
        init_info = f2.getvalue()
        if init_info.strip():
            print(f"🏗️ 模型初始化: {init_info.strip()}", file=sys.stderr)

        # 执行转录（优化参数）
        print(f"🎯 正在转录...", file=sys.stderr)
        res = model.generate(
            input=audio_path,
            cache={},
            language=language,
            use_itn=use_itn,
            batch_size_s=batch_size,
            merge_vad=True,
            merge_length_s=30,  # 增加合并长度，减少片段数量
            pred_timestamp=True,  # 启用时间戳预测
        )

        # 处理结果
        if not res or len(res) == 0:
            raise ValueError("转录结果为空")

        # 提取转录文本和片段
        full_text = res[0]["text"] if isinstance(res[0], dict) else res[0].get("text", "")

        # 应用后处理（如果需要）
        if use_itn:
            full_text = rich_transcription_postprocess(full_text)

        # 检测语言
        detected_language = res[0].get("language", language if language != "auto" else "zh")

        # 提取情感信息（如果存在）
        emotion = res[0].get("emotion", None)
        events = res[0].get("event", [])

        # 构建片段信息（SenseVoice 可能返回 VAD 分割的片段）
        segments = []
        if "segments" in res[0]:
            for seg in res[0]["segments"]:
                segment = {
                    "start": seg.get("start", 0),
                    "end": seg.get("end", 0),
                    "text": seg.get("text", ""),
                }
                if "speaker" in seg:
                    segment["speaker"] = seg["speaker"]
                segments.append(segment)
        else:
            # 如果没有片段信息，创建一个完整片段
            segments = [{
                "start": 0,
                "end": len(full_text) * 0.17,  # 估算时长（每字符约0.17秒）
                "text": full_text
            }]

        elapsed_time = time.time() - start_time
        print(f"✅ 转录完成: {len(full_text)} 字符, 耗时 {elapsed_time:.2f} 秒", file=sys.stderr)

        # 构建结果
        result = {
            "success": True,
            "text": full_text,
            "segments": segments,
            "language": detected_language,
            "duration": elapsed_time,
            "model": "SenseVoiceSmall",
            "stats": {
                "total_characters": len(full_text),
                "total_segments": len(segments),
                "processing_time": elapsed_time,
                "audio_file": os.path.basename(audio_path)
            }
        }

        # 添加额外信息（如果存在）
        if emotion:
            result["emotion"] = emotion
        if events:
            result["events"] = events

        return result

    except Exception as e:
        print(f"❌ 转录失败: {str(e)}", file=sys.stderr)
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "segments": []
        }

def save_transcript_files(result, output_dir, file_prefix, podcast_title):
    """保存转录结果到文件"""
    saved_files = []

    try:
        # 确保输出目录存在
        os.makedirs(output_dir, exist_ok=True)

        # 保存纯文本文件
        txt_file = os.path.join(output_dir, f"{file_prefix}_transcript.txt")
        with open(txt_file, 'w', encoding='utf-8') as f:
            f.write(result["text"])
        saved_files.append(txt_file)
        print(f"💾 保存文本: {txt_file}", file=sys.stderr)

        # 保存 JSON 格式（包含时间戳）
        json_file = os.path.join(output_dir, f"{file_prefix}_transcript.json")
        json_data = {
            "title": podcast_title,
            "model": result.get("model", "SenseVoiceSmall"),
            "language": result.get("language", "auto"),
            "duration": result.get("duration", 0),
            "text": result["text"],
            "segments": result["segments"],
            "stats": result.get("stats", {})
        }

        # 添加额外信息
        if "emotion" in result:
            json_data["emotion"] = result["emotion"]
        if "events" in result:
            json_data["events"] = result["events"]

        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)
        saved_files.append(json_file)
        print(f"💾 保存JSON: {json_file}", file=sys.stderr)

        # 保存 Markdown 格式（带时间戳）
        md_file = os.path.join(output_dir, f"{file_prefix}_transcript.md")
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write(f"# {podcast_title}\n\n")
            f.write(f"**模型**: {result.get('model', 'SenseVoiceSmall')}  \n")
            f.write(f"**语言**: {result.get('language', 'auto')}  \n")
            f.write(f"**处理时间**: {result.get('duration', 0):.2f} 秒  \n\n")

            if "emotion" in result:
                f.write(f"**情感**: {result['emotion']}  \n\n")

            f.write("## 转录内容\n\n")

            # 按段落输出
            if result["segments"]:
                for seg in result["segments"]:
                    timestamp = format_timestamp(seg["start"])
                    text = seg["text"].strip()
                    if text:
                        f.write(f"**[{timestamp}]** {text}\n\n")
            else:
                f.write(result["text"])

        saved_files.append(md_file)
        print(f"💾 保存Markdown: {md_file}", file=sys.stderr)

        return saved_files

    except Exception as e:
        print(f"❌ 保存文件失败: {str(e)}", file=sys.stderr)
        return saved_files

def main():
    parser = argparse.ArgumentParser(description='SenseVoice 音频转录工具')
    parser.add_argument('audio_file', help='音频文件路径')
    parser.add_argument('--language', default='auto',
                      choices=['auto', 'zh', 'en', 'yue', 'ja', 'ko'],
                      help='语言设置 (默认: auto)')
    parser.add_argument('--no-itn', action='store_true',
                      help='禁用数字规范化（ITN）')
    parser.add_argument('--batch-size', type=int, default=64,
                      help='批处理大小（默认: 64）')
    parser.add_argument('--save-transcript', help='保存转录文本的目录')
    parser.add_argument('--file-prefix', default='sensevoice',
                      help='保存文件的前缀')
    parser.add_argument('--podcast-title', default='Untitled',
                      help='播客标题')
    parser.add_argument('--source-url', default='',
                      help='源URL（可选）')

    args = parser.parse_args()

    # 检查音频文件是否存在
    if not os.path.exists(args.audio_file):
        print(json.dumps({
            "success": False,
            "error": f"音频文件不存在: {args.audio_file}",
            "text": "",
            "segments": []
        }, ensure_ascii=False))
        sys.exit(1)

    # 执行转录
    result = transcribe_audio(
        args.audio_file,
        language=args.language,
        use_itn=not args.no_itn,
        batch_size=args.batch_size
    )

    # 保存文件（如果指定）
    if args.save_transcript and result["success"]:
        saved_files = save_transcript_files(
            result,
            args.save_transcript,
            args.file_prefix,
            args.podcast_title
        )
        result["savedFiles"] = saved_files

    # 输出结果（JSON格式）
    print(json.dumps(result, ensure_ascii=False, indent=2))

    # 返回状态码
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()