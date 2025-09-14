#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
PyAnnote 说话人分离模块
使用 pyannote.audio 进行专业级说话人分割
"""

import sys
import json
import os
import argparse
import time
from pathlib import Path
import torch
from pyannote.audio import Pipeline
import warnings

# 禁用所有警告输出到 stdout
warnings.filterwarnings("ignore")

# 重定向标准输出，确保只有JSON输出到stdout
import contextlib
import io

def format_timestamp(seconds):
    """将秒数转换为 HH:MM:SS.mmm 格式"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"

def diarize_audio(audio_path, num_speakers=None, min_speakers=1, max_speakers=10):
    """
    使用 pyannote.audio 进行说话人分离

    参数:
        audio_path: 音频文件路径
        num_speakers: 指定说话人数量（None表示自动检测）
        min_speakers: 最少说话人数量
        max_speakers: 最多说话人数量
    """
    start_time = time.time()

    print(f"🎤 开始说话人分离: {os.path.basename(audio_path)}", file=sys.stderr)

    # 捕获和重定向所有非关键的输出
    captured_output = io.StringIO()

    try:
        # 检查CUDA可用性
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"🎯 使用设备: {device}", file=sys.stderr)

        # 初始化说话人分离管道
        print(f"🔄 加载 pyannote.audio 管道...", file=sys.stderr)

        # 重定向stdout避免模型输出污染
        with contextlib.redirect_stdout(captured_output):
            # 使用预训练的说话人分离模型
            token = os.getenv('HF_TOKEN') or True

            # 尝试加载模型，按优先级依次尝试
            models_to_try = [
                "pyannote/speaker-diarization@2022.07",  # 先尝试稳定版本
                "pyannote/speaker-diarization-3.1"       # 然后尝试最新版本
            ]

            pipeline = None
            for model_name in models_to_try:
                try:
                    print(f"📡 尝试加载模型: {model_name}", file=sys.stderr)
                    pipeline = Pipeline.from_pretrained(model_name, use_auth_token=token)
                    print(f"✅ 成功加载模型: {model_name}", file=sys.stderr)
                    break
                except Exception as e:
                    print(f"❌ 模型 {model_name} 加载失败: {e}", file=sys.stderr)
                    continue

            if pipeline is None:
                raise Exception("所有 PyAnnote 模型加载失败。请确保已接受所有必要的模型条款并正确认证。")

            # 设置设备
            if device == "cuda":
                pipeline.to(torch.device("cuda"))

        print(f"✅ 管道加载完成", file=sys.stderr)

        # 配置说话人数量参数
        if num_speakers is not None:
            print(f"🎯 指定说话人数量: {num_speakers}", file=sys.stderr)
            diarization = pipeline(
                audio_path,
                num_speakers=num_speakers
            )
        else:
            print(f"🔍 自动检测说话人 (范围: {min_speakers}-{max_speakers})", file=sys.stderr)
            diarization = pipeline(
                audio_path,
                min_speakers=min_speakers,
                max_speakers=max_speakers
            )

        # 处理分离结果
        segments = []
        speaker_labels = set()

        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segment = {
                "start": float(turn.start),
                "end": float(turn.end),
                "duration": float(turn.end - turn.start),
                "speaker": speaker,
                "start_formatted": format_timestamp(turn.start),
                "end_formatted": format_timestamp(turn.end)
            }
            segments.append(segment)
            speaker_labels.add(speaker)

        # 按时间排序
        segments.sort(key=lambda x: x["start"])

        elapsed_time = time.time() - start_time

        print(f"✅ 说话人分离完成!", file=sys.stderr)
        print(f"📊 检测到 {len(speaker_labels)} 个说话人: {', '.join(sorted(speaker_labels))}", file=sys.stderr)
        print(f"🎬 分割为 {len(segments)} 个片段", file=sys.stderr)
        print(f"⏱️ 处理时间: {elapsed_time:.2f} 秒", file=sys.stderr)

        # 构建结果
        result = {
            "success": True,
            "audio_file": os.path.basename(audio_path),
            "speakers": sorted(list(speaker_labels)),
            "num_speakers": len(speaker_labels),
            "segments": segments,
            "processing_time": elapsed_time,
            "stats": {
                "total_segments": len(segments),
                "total_speakers": len(speaker_labels),
                "audio_duration": max([seg["end"] for seg in segments]) if segments else 0,
                "avg_segment_duration": sum([seg["duration"] for seg in segments]) / len(segments) if segments else 0
            }
        }

        return result

    except Exception as e:
        error_msg = str(e)
        print(f"❌ 说话人分离失败: {error_msg}", file=sys.stderr)

        # 检查是否是认证错误
        if "auth" in error_msg.lower() or "token" in error_msg.lower():
            print("💡 提示: 需要 HuggingFace token 来使用预训练模型", file=sys.stderr)
            print("   1. 访问 https://huggingface.co/settings/tokens", file=sys.stderr)
            print("   2. 创建 token 并设置环境变量: export HF_TOKEN=your_token", file=sys.stderr)
            print("   3. 或运行: huggingface-cli login", file=sys.stderr)

        return {
            "success": False,
            "error": error_msg,
            "audio_file": os.path.basename(audio_path),
            "speakers": [],
            "segments": []
        }

def save_diarization_results(result, output_dir, file_prefix):
    """保存说话人分离结果到文件"""
    saved_files = []

    try:
        # 确保输出目录存在
        os.makedirs(output_dir, exist_ok=True)

        # 保存 JSON 格式
        json_file = os.path.join(output_dir, f"{file_prefix}_diarization.json")
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        saved_files.append(json_file)
        print(f"💾 保存JSON: {json_file}", file=sys.stderr)

        if result["success"]:
            # 保存 CSV 格式
            csv_file = os.path.join(output_dir, f"{file_prefix}_diarization.csv")
            with open(csv_file, 'w', encoding='utf-8') as f:
                f.write("start,end,duration,speaker,start_formatted,end_formatted\n")
                for seg in result["segments"]:
                    f.write(f"{seg['start']:.3f},{seg['end']:.3f},{seg['duration']:.3f},"
                           f"{seg['speaker']},{seg['start_formatted']},{seg['end_formatted']}\n")
            saved_files.append(csv_file)
            print(f"💾 保存CSV: {csv_file}", file=sys.stderr)

            # 保存可视化 Markdown
            md_file = os.path.join(output_dir, f"{file_prefix}_diarization.md")
            with open(md_file, 'w', encoding='utf-8') as f:
                f.write(f"# 说话人分离结果\n\n")
                f.write(f"**音频文件**: {result['audio_file']}  \n")
                f.write(f"**说话人数量**: {result['num_speakers']}  \n")
                f.write(f"**分割片段**: {len(result['segments'])}  \n")
                f.write(f"**处理时间**: {result['processing_time']:.2f} 秒  \n\n")

                f.write("## 说话人列表\n\n")
                for i, speaker in enumerate(result['speakers'], 1):
                    speaker_segments = [seg for seg in result['segments'] if seg['speaker'] == speaker]
                    total_time = sum(seg['duration'] for seg in speaker_segments)
                    f.write(f"- **{speaker}**: {len(speaker_segments)} 个片段, 总时长 {total_time:.1f} 秒\n")

                f.write("\n## 时间线\n\n")
                for seg in result['segments']:
                    f.write(f"**[{seg['start_formatted'][:8]} - {seg['end_formatted'][:8]}]** "
                           f"{seg['speaker']} ({seg['duration']:.1f}s)\n\n")

            saved_files.append(md_file)
            print(f"💾 保存Markdown: {md_file}", file=sys.stderr)

        return saved_files

    except Exception as e:
        print(f"❌ 保存文件失败: {str(e)}", file=sys.stderr)
        return saved_files

def main():
    parser = argparse.ArgumentParser(description='PyAnnote 说话人分离工具')
    parser.add_argument('audio_file', help='音频文件路径')
    parser.add_argument('--num-speakers', type=int, help='指定说话人数量（留空则自动检测）')
    parser.add_argument('--min-speakers', type=int, default=1, help='最少说话人数量')
    parser.add_argument('--max-speakers', type=int, default=10, help='最多说话人数量')
    parser.add_argument('--output-dir', help='保存结果的目录')
    parser.add_argument('--file-prefix', default='pyannote',
                      help='保存文件的前缀')

    args = parser.parse_args()

    # 检查音频文件是否存在
    if not os.path.exists(args.audio_file):
        print(json.dumps({
            "success": False,
            "error": f"音频文件不存在: {args.audio_file}",
            "speakers": [],
            "segments": []
        }, ensure_ascii=False))
        sys.exit(1)

    # 执行说话人分离
    result = diarize_audio(
        args.audio_file,
        num_speakers=args.num_speakers,
        min_speakers=args.min_speakers,
        max_speakers=args.max_speakers
    )

    # 保存文件（如果指定）
    if args.output_dir and result["success"]:
        saved_files = save_diarization_results(
            result,
            args.output_dir,
            args.file_prefix
        )
        result["savedFiles"] = saved_files

    # 输出结果（JSON格式到stdout，用于管道通信）
    print(json.dumps(result, ensure_ascii=False))

    # 返回状态码
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()