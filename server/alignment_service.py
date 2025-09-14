#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
ASR 与说话人分割对齐服务
将转录结果与说话人分离结果进行时间对齐
"""

import sys
import json
import os
import argparse
from typing import List, Dict, Any, Optional

def parse_time(time_str):
    """解析时间字符串为秒数"""
    if isinstance(time_str, (int, float)):
        return float(time_str)

    if ':' in time_str:
        # HH:MM:SS.mmm 格式
        parts = time_str.split(':')
        if len(parts) == 3:
            hours, minutes, seconds = parts
            return float(hours) * 3600 + float(minutes) * 60 + float(seconds)
        elif len(parts) == 2:
            minutes, seconds = parts
            return float(minutes) * 60 + float(seconds)

    return float(time_str)

def format_timestamp(seconds):
    """将秒数转换为 HH:MM:SS 格式"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"

def find_overlapping_speaker(text_segment, speaker_segments, overlap_threshold=0.5):
    """
    为文本片段找到重叠最多的说话人

    参数:
        text_segment: ASR文本片段 {"start": float, "end": float, "text": str}
        speaker_segments: 说话人分离片段列表
        overlap_threshold: 重叠阈值（0.5表示需要50%重叠）

    返回:
        最匹配的说话人标签，如果没有足够重叠则返回None
    """
    text_start = parse_time(text_segment["start"])
    text_end = parse_time(text_segment["end"])
    text_duration = text_end - text_start

    best_speaker = None
    best_overlap = 0

    for speaker_seg in speaker_segments:
        speaker_start = parse_time(speaker_seg["start"])
        speaker_end = parse_time(speaker_seg["end"])

        # 计算重叠时间
        overlap_start = max(text_start, speaker_start)
        overlap_end = min(text_end, speaker_end)
        overlap_duration = max(0, overlap_end - overlap_start)

        if overlap_duration > 0:
            overlap_ratio = overlap_duration / text_duration
            if overlap_ratio > best_overlap:
                best_overlap = overlap_ratio
                best_speaker = speaker_seg["speaker"]

    # 只返回超过阈值的匹配
    return best_speaker if best_overlap >= overlap_threshold else None

def merge_adjacent_segments(segments, max_gap=2.0):
    """
    合并相邻的同说话人片段

    参数:
        segments: 对齐后的片段列表
        max_gap: 最大允许的间隔（秒）
    """
    if not segments:
        return segments

    merged = []
    current = segments[0].copy()

    for next_seg in segments[1:]:
        # 检查是否是同一说话人且时间间隔较小
        gap = parse_time(next_seg["start"]) - parse_time(current["end"])

        if (current["speaker"] == next_seg["speaker"] and
            gap <= max_gap):
            # 合并片段
            current["end"] = next_seg["end"]
            current["text"] += " " + next_seg["text"]
            current["duration"] = parse_time(current["end"]) - parse_time(current["start"])
        else:
            # 保存当前片段，开始新片段
            merged.append(current)
            current = next_seg.copy()

    # 添加最后一个片段
    merged.append(current)

    return merged

def align_asr_with_diarization(asr_segments, diarization_segments,
                               overlap_threshold=0.5, merge_gap=2.0):
    """
    将ASR结果与说话人分离结果对齐

    参数:
        asr_segments: ASR转录片段列表
        diarization_segments: 说话人分离片段列表
        overlap_threshold: 重叠阈值
        merge_gap: 合并间隔

    返回:
        对齐后的片段列表，包含文本和说话人信息
    """
    print(f"🔄 开始对齐 {len(asr_segments)} 个ASR片段和 {len(diarization_segments)} 个说话人片段", file=sys.stderr)

    aligned_segments = []
    unmatched_count = 0

    for i, text_seg in enumerate(asr_segments):
        # 为每个文本片段找到对应的说话人
        speaker = find_overlapping_speaker(text_seg, diarization_segments, overlap_threshold)

        # 创建对齐片段
        aligned_segment = {
            "start": text_seg["start"],
            "end": text_seg["end"],
            "duration": parse_time(text_seg["end"]) - parse_time(text_seg["start"]),
            "text": text_seg["text"],
            "speaker": speaker or f"未知说话人_{unmatched_count + 1}",
            "confidence": 1.0 if speaker else 0.0,
            "start_formatted": format_timestamp(parse_time(text_seg["start"])),
            "end_formatted": format_timestamp(parse_time(text_seg["end"]))
        }

        if not speaker:
            unmatched_count += 1

        aligned_segments.append(aligned_segment)

    print(f"✅ 对齐完成: {len(aligned_segments)} 个片段，{unmatched_count} 个未匹配", file=sys.stderr)

    # 合并相邻的同说话人片段
    if merge_gap > 0:
        print(f"🔄 合并相邻片段 (最大间隔: {merge_gap}秒)", file=sys.stderr)
        original_count = len(aligned_segments)
        aligned_segments = merge_adjacent_segments(aligned_segments, merge_gap)
        merged_count = original_count - len(aligned_segments)
        print(f"✅ 合并完成: 减少了 {merged_count} 个片段", file=sys.stderr)

    return aligned_segments

def load_json_file(filepath):
    """加载JSON文件"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ 加载文件失败 {filepath}: {e}", file=sys.stderr)
        return None

def save_aligned_results(aligned_segments, speakers, output_file, audio_file=""):
    """保存对齐结果"""
    try:
        # 统计说话人信息
        speaker_stats = {}
        total_duration = 0

        for seg in aligned_segments:
            speaker = seg["speaker"]
            duration = seg["duration"]

            if speaker not in speaker_stats:
                speaker_stats[speaker] = {
                    "segments": 0,
                    "duration": 0,
                    "words": 0
                }

            speaker_stats[speaker]["segments"] += 1
            speaker_stats[speaker]["duration"] += duration
            speaker_stats[speaker]["words"] += len(seg["text"].split())
            total_duration += duration

        result = {
            "success": True,
            "audio_file": audio_file,
            "speakers": list(speaker_stats.keys()),
            "num_speakers": len(speaker_stats),
            "segments": aligned_segments,
            "stats": {
                "total_segments": len(aligned_segments),
                "total_duration": total_duration,
                "speaker_stats": speaker_stats
            }
        }

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"💾 保存对齐结果: {output_file}", file=sys.stderr)

        # 生成可视化Markdown
        md_file = output_file.replace('.json', '.md')
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write(f"# 对齐转录结果\n\n")
            f.write(f"**音频文件**: {audio_file}  \n")
            f.write(f"**说话人数量**: {len(speaker_stats)}  \n")
            f.write(f"**总片段数**: {len(aligned_segments)}  \n")
            f.write(f"**总时长**: {total_duration:.1f} 秒  \n\n")

            f.write("## 说话人统计\n\n")
            for speaker, stats in speaker_stats.items():
                percentage = (stats["duration"] / total_duration * 100) if total_duration > 0 else 0
                f.write(f"- **{speaker}**: {stats['segments']} 段, {stats['duration']:.1f}s ({percentage:.1f}%), {stats['words']} 词\n")

            f.write("\n## 转录内容\n\n")
            current_speaker = None
            for seg in aligned_segments:
                if seg["speaker"] != current_speaker:
                    if current_speaker is not None:
                        f.write("\n---\n\n")
                    f.write(f"## {seg['speaker']}\n\n")
                    current_speaker = seg["speaker"]

                f.write(f"**[{seg['start_formatted']} - {seg['end_formatted']}]** {seg['text']}\n\n")

        print(f"💾 保存Markdown: {md_file}", file=sys.stderr)

        return result

    except Exception as e:
        print(f"❌ 保存结果失败: {e}", file=sys.stderr)
        return None

def main():
    parser = argparse.ArgumentParser(description='ASR与说话人分离对齐工具')
    parser.add_argument('asr_file', help='ASR结果JSON文件路径')
    parser.add_argument('diarization_file', help='说话人分离结果JSON文件路径')
    parser.add_argument('--output', required=True, help='输出文件路径')
    parser.add_argument('--overlap-threshold', type=float, default=0.5,
                      help='重叠阈值 (默认: 0.5)')
    parser.add_argument('--merge-gap', type=float, default=2.0,
                      help='合并间隔（秒，默认: 2.0）')

    args = parser.parse_args()

    # 加载ASR结果
    asr_data = load_json_file(args.asr_file)
    if not asr_data or not asr_data.get("success"):
        print(json.dumps({
            "success": False,
            "error": f"无法加载ASR结果: {args.asr_file}"
        }))
        sys.exit(1)

    # 加载说话人分离结果
    diarization_data = load_json_file(args.diarization_file)
    if not diarization_data or not diarization_data.get("success"):
        print(json.dumps({
            "success": False,
            "error": f"无法加载说话人分离结果: {args.diarization_file}"
        }))
        sys.exit(1)

    # 执行对齐
    aligned_segments = align_asr_with_diarization(
        asr_data["segments"],
        diarization_data["segments"],
        args.overlap_threshold,
        args.merge_gap
    )

    # 保存结果
    audio_file = asr_data.get("audio_file", "") or diarization_data.get("audio_file", "")
    result = save_aligned_results(
        aligned_segments,
        diarization_data["speakers"],
        args.output,
        audio_file
    )

    if result:
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()