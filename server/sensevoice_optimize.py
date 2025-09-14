#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
SenseVoice 优化版转录脚本 - 针对多GPU高性能转录
支持GPU内存管理、批处理优化、并行处理
"""

import sys
import json
import os
import argparse
import time
import gc
from pathlib import Path
import torch
from funasr import AutoModel
from funasr.utils.postprocess_utils import rich_transcription_postprocess
from modelscope import snapshot_download

# 设置缓存目录
cache_dir = os.path.expanduser("~/.cache/funasr")
os.makedirs(cache_dir, exist_ok=True)

def get_optimal_gpu():
    """获取最优GPU设备"""
    if not torch.cuda.is_available():
        return "cpu"

    gpu_count = torch.cuda.device_count()
    if gpu_count == 0:
        return "cpu"

    # 选择显存最大且利用率最低的GPU
    best_gpu = 0
    best_score = -1

    for i in range(gpu_count):
        props = torch.cuda.get_device_properties(i)
        total_memory = props.total_memory

        # 检查当前显存使用情况
        torch.cuda.set_device(i)
        allocated = torch.cuda.memory_allocated(i)
        reserved = torch.cuda.memory_reserved(i)
        free_memory = total_memory - reserved

        # 计算分数：优先选择显存大且空闲的GPU
        score = free_memory / (1024**3)  # GB

        print(f"🎮 GPU {i}: {props.name}, 总显存: {total_memory/(1024**3):.1f}GB, 空闲: {free_memory/(1024**3):.1f}GB", file=sys.stderr)

        if score > best_score:
            best_score = score
            best_gpu = i

    return f"cuda:{best_gpu}"

def clear_gpu_cache():
    """清理GPU缓存"""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        gc.collect()

def optimize_model_settings(device):
    """根据设备优化模型设置"""
    settings = {
        "batch_size_s": 500,
        "merge_length_s": 30,
        "max_single_segment_time": 30000,
        "max_end_silence_time": 500,
    }

    if device.startswith("cuda"):
        # GPU优化设置
        gpu_num = int(device.split(":")[1])
        props = torch.cuda.get_device_properties(gpu_num)
        memory_gb = props.total_memory / (1024**3)

        if memory_gb >= 12:  # 12GB+ GPU
            settings.update({
                "batch_size_s": 1000,  # 增大批处理
                "merge_length_s": 60,   # 增大合并长度
            })
        elif memory_gb >= 8:   # 8GB+ GPU
            settings.update({
                "batch_size_s": 800,
                "merge_length_s": 45,
            })
    else:
        # CPU优化设置
        settings.update({
            "batch_size_s": 100,
            "merge_length_s": 15,
        })

    return settings

def transcribe_audio_optimized(audio_path, language="auto", use_itn=True):
    """
    优化版音频转录
    """
    start_time = time.time()

    print(f"🚀 SenseVoice优化转录: {os.path.basename(audio_path)}", file=sys.stderr)

    try:
        # 清理GPU缓存
        clear_gpu_cache()

        # 获取最优设备
        device = get_optimal_gpu()
        print(f"🎯 选定设备: {device}", file=sys.stderr)

        # 优化设置
        settings = optimize_model_settings(device)
        print(f"⚙️ 优化参数: batch_size={settings['batch_size_s']}, merge_length={settings['merge_length_s']}", file=sys.stderr)

        # 下载模型（重定向输出到stderr）
        import contextlib
        from io import StringIO

        # 捕获模型下载的stdout输出
        f = StringIO()
        with contextlib.redirect_stdout(f):
            model_dir = snapshot_download("iic/SenseVoiceSmall", cache_dir=cache_dir)

        # 将下载信息输出到stderr
        download_info = f.getvalue()
        if download_info.strip():
            print(f"📦 模型下载信息: {download_info.strip()}", file=sys.stderr)

        # 初始化模型
        print(f"🔄 加载SenseVoice模型到{device}...", file=sys.stderr)

        # 设置PyTorch优化
        if device.startswith("cuda"):
            torch.backends.cudnn.benchmark = True  # 优化CUDNN性能
            torch.backends.cudnn.deterministic = False

        # 捕获模型初始化的输出
        f2 = StringIO()
        with contextlib.redirect_stdout(f2):
            model = AutoModel(
                model=model_dir,
                trust_remote_code=True,
                remote_code="./model.py",
                vad_model="fsmn-vad",
                vad_kwargs={
                    "max_single_segment_time": settings["max_single_segment_time"],
                    "max_end_silence_time": settings["max_end_silence_time"],
                },
                device=device,
                # 添加性能优化参数
                ncpu=4 if device == "cpu" else 1,  # CPU线程数
            )

        # 将模型初始化信息输出到stderr
        init_info = f2.getvalue()
        if init_info.strip():
            print(f"🏗️ 模型初始化信息: {init_info.strip()}", file=sys.stderr)

        print(f"✅ 模型加载完成，开始转录...", file=sys.stderr)

        # 执行转录
        res = model.generate(
            input=audio_path,
            cache={},
            language=language,
            use_itn=use_itn,
            batch_size_s=settings["batch_size_s"],
            merge_vad=True,
            merge_length_s=settings["merge_length_s"],
            pred_timestamp=True,
            # 性能优化参数
            disable_pbar=False,  # 显示进度条
        )

        # 处理结果
        if not res or len(res) == 0:
            raise ValueError("转录结果为空")

        full_text = res[0]["text"] if isinstance(res[0], dict) else res[0].get("text", "")

        # 后处理
        if use_itn:
            full_text = rich_transcription_postprocess(full_text)

        # 提取信息
        detected_language = res[0].get("language", language if language != "auto" else "zh")
        emotion = res[0].get("emotion", None)
        events = res[0].get("event", [])

        # 构建片段
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
            segments = [{
                "start": 0,
                "end": len(full_text) * 0.15,  # 优化估算
                "text": full_text
            }]

        elapsed_time = time.time() - start_time

        # 计算性能指标
        audio_duration = segments[-1]["end"] if segments else 0
        rtf = elapsed_time / max(audio_duration, 1)  # 实时因子

        print(f"🎉 转录完成!", file=sys.stderr)
        print(f"📊 性能统计: {len(full_text)}字符, {elapsed_time:.1f}秒, RTF={rtf:.3f}", file=sys.stderr)

        # 清理内存
        del model
        clear_gpu_cache()

        result = {
            "success": True,
            "text": full_text,
            "segments": segments,
            "language": detected_language,
            "duration": elapsed_time,
            "model": "SenseVoiceSmall-Optimized",
            "stats": {
                "total_characters": len(full_text),
                "total_segments": len(segments),
                "processing_time": elapsed_time,
                "rtf": rtf,
                "audio_duration": audio_duration,
                "device": device,
                "batch_size": settings["batch_size_s"],
                "audio_file": os.path.basename(audio_path)
            }
        }

        if emotion:
            result["emotion"] = emotion
        if events:
            result["events"] = events

        return result

    except Exception as e:
        clear_gpu_cache()
        print(f"❌ 转录失败: {str(e)}", file=sys.stderr)
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "segments": []
        }

def main():
    parser = argparse.ArgumentParser(description='SenseVoice 优化版转录工具')
    parser.add_argument('audio_file', help='音频文件路径')
    parser.add_argument('--language', default='auto',
                      choices=['auto', 'zh', 'en', 'yue', 'ja', 'ko'],
                      help='语言设置 (默认: auto)')
    parser.add_argument('--no-itn', action='store_true',
                      help='禁用数字规范化（ITN）')
    parser.add_argument('--save-transcript', help='保存转录文本的目录')
    parser.add_argument('--file-prefix', default='sensevoice-opt',
                      help='保存文件的前缀')
    parser.add_argument('--podcast-title', default='Untitled',
                      help='播客标题')
    parser.add_argument('--source-url', default='',
                      help='源URL（可选）')

    args = parser.parse_args()

    # 检查音频文件
    if not os.path.exists(args.audio_file):
        print(json.dumps({
            "success": False,
            "error": f"音频文件不存在: {args.audio_file}",
            "text": "",
            "segments": []
        }, ensure_ascii=False))
        sys.exit(1)

    # 执行转录
    result = transcribe_audio_optimized(
        args.audio_file,
        language=args.language,
        use_itn=not args.no_itn
    )

    # 保存文件（复用原脚本的保存函数）
    if args.save_transcript and result["success"]:
        from sensevoice_transcribe import save_transcript_files
        saved_files = save_transcript_files(
            result,
            args.save_transcript,
            args.file_prefix,
            args.podcast_title
        )
        result["savedFiles"] = saved_files

    # 输出结果
    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()