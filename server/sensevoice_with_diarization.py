#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
SenseVoice + PyAnnote 组合转录脚本
结合 SenseVoice 的高速转录和 PyAnnote 的精确说话人分离
"""

import sys
import json
import os
import argparse
import time
import subprocess
import tempfile
from pathlib import Path

def run_command(command, description=""):
    """运行命令并返回结果"""
    try:
        print(f"🔄 {description}", file=sys.stderr)
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            check=True
        )
        # 打印stderr到我们的stderr (用于调试)
        if result.stderr.strip():
            print(f"[DEBUG] {description} stderr: {result.stderr.strip()}", file=sys.stderr)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} 失败: {e}", file=sys.stderr)
        print(f"错误输出: {e.stderr}", file=sys.stderr)
        return None

def sensevoice_with_diarization(audio_path, language="auto", num_speakers=None,
                              save_dir=None, file_prefix="combined"):
    """
    使用 SenseVoice + PyAnnote 组合进行转录和说话人分离

    参数:
        audio_path: 音频文件路径
        language: SenseVoice 语言设置
        num_speakers: 指定说话人数量（None表示自动检测）
        save_dir: 保存目录
        file_prefix: 文件前缀
    """
    start_time = time.time()

    print(f"🚀 SenseVoice + PyAnnote 组合转录: {os.path.basename(audio_path)}", file=sys.stderr)

    # 检查音频格式，PyAnnote需要WAV格式
    audio_path_obj = Path(audio_path)
    if audio_path_obj.suffix.lower() in ['.m4a', '.mp4', '.aac']:
        print(f"🔄 音频格式转换: {audio_path_obj.suffix} -> .wav", file=sys.stderr)
        wav_path = audio_path_obj.with_suffix('.wav')

        # 使用ffmpeg转换格式
        convert_cmd = f'ffmpeg -i "{audio_path}" -ar 16000 -ac 1 "{wav_path}" -y'
        convert_result = subprocess.run(convert_cmd, shell=True, capture_output=True, text=True)

        if convert_result.returncode != 0:
            print(f"❌ 音频格式转换失败: {convert_result.stderr}", file=sys.stderr)
            # 继续使用原格式，让后续组件尝试处理
        else:
            audio_path = str(wav_path)  # 使用转换后的WAV文件
            print(f"✅ 音频格式转换成功: {wav_path}", file=sys.stderr)

    try:
        # 创建临时目录
        temp_dir = tempfile.mkdtemp()
        print(f"📁 临时目录: {temp_dir}", file=sys.stderr)

        # 步骤1: 使用 SenseVoice 进行转录
        print(f"🎤 步骤 1/3: SenseVoice 转录", file=sys.stderr)

        # 获取项目根目录的绝对路径
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        venv_python = project_root / "venv" / "bin" / "python"
        sensevoice_script = script_dir / "sensevoice_optimize.py"

        sensevoice_cmd = (
            f'"{venv_python}" "{sensevoice_script}" "{audio_path}" '
            f'--language {language} '
            f'--save-transcript "{temp_dir}" '
            f'--file-prefix "sensevoice_temp"'
        )

        sensevoice_output = run_command(sensevoice_cmd, "SenseVoice 转录")
        if not sensevoice_output:
            raise Exception("SenseVoice 转录失败")

        sensevoice_result = json.loads(sensevoice_output)
        if not sensevoice_result.get("success"):
            raise Exception(f"SenseVoice 错误: {sensevoice_result.get('error', 'Unknown error')}")

        print(f"✅ SenseVoice 转录完成: {len(sensevoice_result['text'])} 字符", file=sys.stderr)

        # 步骤2: 使用 PyAnnote 进行说话人分离
        print(f"🎭 步骤 2/3: PyAnnote 说话人分离", file=sys.stderr)
        pyannote_script = script_dir / "pyannote_diarization.py"

        diarization_cmd = (
            f'"{venv_python}" "{pyannote_script}" "{audio_path}" '
            f'--output-dir "{temp_dir}" '
            f'--file-prefix "pyannote_temp"'
        )

        if num_speakers:
            diarization_cmd += f' --num-speakers {num_speakers}'

        diarization_output = run_command(diarization_cmd, "PyAnnote 说话人分离")
        if not diarization_output:
            raise Exception("PyAnnote 说话人分离失败")

        diarization_result = json.loads(diarization_output)
        if not diarization_result.get("success"):
            raise Exception(f"PyAnnote 错误: {diarization_result.get('error', 'Unknown error')}")

        print(f"✅ 说话人分离完成: 检测到 {diarization_result['num_speakers']} 个说话人", file=sys.stderr)

        # 步骤3: 对齐 ASR 和说话人分离结果
        print(f"🔗 步骤 3/3: 对齐结果", file=sys.stderr)

        # 保存SenseVoice结果为临时JSON
        sensevoice_json = os.path.join(temp_dir, "sensevoice_temp.json")
        with open(sensevoice_json, 'w', encoding='utf-8') as f:
            json.dump(sensevoice_result, f, ensure_ascii=False, indent=2)

        # 保存PyAnnote结果为临时JSON
        diarization_json = os.path.join(temp_dir, "pyannote_temp.json")
        with open(diarization_json, 'w', encoding='utf-8') as f:
            json.dump(diarization_result, f, ensure_ascii=False, indent=2)

        # 执行对齐
        aligned_json = os.path.join(temp_dir, "aligned_result.json")
        alignment_script = script_dir / "alignment_service.py"

        alignment_cmd = (
            f'"{venv_python}" "{alignment_script}" '
            f'"{sensevoice_json}" "{diarization_json}" '
            f'--output "{aligned_json}"'
        )

        alignment_output = run_command(alignment_cmd, "结果对齐")
        if not alignment_output:
            raise Exception("结果对齐失败")

        aligned_result = json.loads(alignment_output)
        if not aligned_result.get("success"):
            raise Exception(f"对齐错误: {aligned_result.get('error', 'Unknown error')}")

        print(f"✅ 对齐完成: {len(aligned_result['segments'])} 个对齐片段", file=sys.stderr)

        # 构建最终结果
        elapsed_time = time.time() - start_time

        final_result = {
            "success": True,
            "audio_file": os.path.basename(audio_path),
            "text": sensevoice_result["text"],  # 完整文本
            "segments": aligned_result["segments"],  # 对齐后的片段
            "speakers": aligned_result["speakers"],  # 说话人列表
            "num_speakers": aligned_result["num_speakers"],
            "language": sensevoice_result.get("language", language),
            "duration": elapsed_time,
            "model": "SenseVoice + PyAnnote",
            "stats": {
                "total_characters": len(sensevoice_result["text"]),
                "total_segments": len(aligned_result["segments"]),
                "total_speakers": aligned_result["num_speakers"],
                "processing_time": elapsed_time,
                "sensevoice_time": sensevoice_result.get("duration", 0),
                "diarization_time": diarization_result.get("processing_time", 0),
                "alignment_time": elapsed_time - sensevoice_result.get("duration", 0) - diarization_result.get("processing_time", 0),
                "audio_file": os.path.basename(audio_path)
            }
        }

        # 保存到指定目录
        if save_dir:
            os.makedirs(save_dir, exist_ok=True)

            # 保存JSON结果
            json_file = os.path.join(save_dir, f"{file_prefix}_combined.json")
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(final_result, f, ensure_ascii=False, indent=2)

            # 保存Markdown结果
            md_file = os.path.join(save_dir, f"{file_prefix}_combined.md")
            save_markdown_transcript(final_result, md_file)

            final_result["savedFiles"] = [json_file, md_file]

        # 清理临时文件
        import shutil
        try:
            shutil.rmtree(temp_dir)
        except:
            pass

        print(f"🎉 组合转录完成!", file=sys.stderr)
        print(f"📊 性能统计: {final_result['stats']['total_characters']}字符, "
              f"{elapsed_time:.1f}秒, {final_result['stats']['total_speakers']}个说话人", file=sys.stderr)

        return final_result

    except Exception as e:
        error_msg = str(e)
        print(f"❌ 组合转录失败: {error_msg}", file=sys.stderr)

        return {
            "success": False,
            "error": error_msg,
            "text": "",
            "segments": [],
            "speakers": []
        }

def save_markdown_transcript(result, output_file):
    """保存Markdown格式的转录结果"""
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"# {result['audio_file']} - 组合转录结果\n\n")
            f.write(f"**模型**: {result['model']}  \n")
            f.write(f"**语言**: {result.get('language', 'auto')}  \n")
            f.write(f"**说话人数量**: {result['num_speakers']}  \n")
            f.write(f"**处理时间**: {result['duration']:.2f} 秒  \n\n")

            # 说话人统计
            if 'stats' in result and 'speaker_stats' in result['stats']:
                f.write("## 说话人统计\n\n")
                for speaker, stats in result['stats']['speaker_stats'].items():
                    f.write(f"- **{speaker}**: {stats['segments']} 段, {stats['duration']:.1f}s, {stats['words']} 词\n")
                f.write("\n")

            # 转录内容
            f.write("## 转录内容\n\n")
            current_speaker = None

            for seg in result["segments"]:
                if seg["speaker"] != current_speaker:
                    if current_speaker is not None:
                        f.write("\n---\n\n")
                    f.write(f"## {seg['speaker']}\n\n")
                    current_speaker = seg["speaker"]

                f.write(f"**[{seg['start_formatted']} - {seg['end_formatted']}]** {seg['text']}\n\n")

        print(f"💾 保存Markdown: {output_file}", file=sys.stderr)
        return True

    except Exception as e:
        print(f"❌ 保存Markdown失败: {e}", file=sys.stderr)
        return False

def main():
    parser = argparse.ArgumentParser(description='SenseVoice + PyAnnote 组合转录工具')
    parser.add_argument('audio_file', help='音频文件路径')
    parser.add_argument('--language', default='auto',
                      choices=['auto', 'zh', 'en', 'yue', 'ja', 'ko'],
                      help='SenseVoice 语言设置 (默认: auto)')
    parser.add_argument('--num-speakers', type=int,
                      help='指定说话人数量（留空则自动检测）')
    parser.add_argument('--save-transcript', help='保存转录文本的目录')
    parser.add_argument('--file-prefix', default='combined',
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
            "segments": [],
            "speakers": []
        }, ensure_ascii=False))
        sys.exit(1)

    # 执行组合转录
    result = sensevoice_with_diarization(
        args.audio_file,
        language=args.language,
        num_speakers=args.num_speakers,
        save_dir=args.save_transcript,
        file_prefix=args.file_prefix
    )

    # 输出结果（JSON格式）
    print(json.dumps(result, ensure_ascii=False, indent=2))

    # 返回状态码
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()