#!/usr/bin/env python3
"""
本地Faster-Whisper转录脚本
支持单文件和批量转录
"""

import sys
import json
import argparse
import time
from pathlib import Path
from faster_whisper import WhisperModel

class LocalWhisperTranscriber:
    def __init__(self, model_size="base", device="cpu", compute_type="int8"):
        """
        初始化Faster-Whisper模型
        
        Args:
            model_size: 模型大小 ("tiny", "base", "small", "medium", "large-v3")
            device: 设备类型 ("cpu", "cuda")
            compute_type: 计算类型 ("int8", "int16", "float16", "float32")
        """
        print(f"🔄 正在加载Whisper模型: {model_size}", file=sys.stderr)
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print(f"✅ 模型加载完成", file=sys.stderr)

    def transcribe_file(self, audio_path, language=None):
        """
        转录单个音频文件
        
        Args:
            audio_path: 音频文件路径
            language: 指定语言 (None为自动检测)
        
        Returns:
            dict: 转录结果
        """
        try:
            print(f"🎤 开始转录: {audio_path}", file=sys.stderr)
            start_time = time.time()
            
            # 执行转录
            segments, info = self.model.transcribe(
                audio_path, 
                language=language,
                vad_filter=True,  # 启用语音活动检测
                vad_parameters=dict(min_silence_duration_ms=500)
            )
            
            # 收集所有片段
            transcript_segments = []
            full_text = ""
            
            for segment in segments:
                segment_dict = {
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip()
                }
                transcript_segments.append(segment_dict)
                full_text += segment.text.strip() + " "
            
            duration = time.time() - start_time
            
            result = {
                "success": True,
                "file": str(audio_path),
                "text": full_text.strip(),
                "segments": transcript_segments,
                "language": info.language,
                "language_probability": info.language_probability,
                "duration": info.duration,
                "processing_time": round(duration, 2)
            }
            
            print(f"✅ 转录完成: {duration:.1f}秒", file=sys.stderr)
            return result
            
        except Exception as e:
            error_result = {
                "success": False,
                "file": str(audio_path),
                "error": str(e),
                "text": ""
            }
            print(f"❌ 转录失败: {e}", file=sys.stderr)
            return error_result

    def transcribe_multiple(self, audio_paths, language=None):
        """
        批量转录多个音频文件
        
        Args:
            audio_paths: 音频文件路径列表
            language: 指定语言
        
        Returns:
            list: 转录结果列表
        """
        results = []
        total_files = len(audio_paths)
        
        print(f"📄 开始批量转录 {total_files} 个文件", file=sys.stderr)
        
        for i, audio_path in enumerate(audio_paths, 1):
            print(f"🎵 处理文件 {i}/{total_files}: {Path(audio_path).name}", file=sys.stderr)
            result = self.transcribe_file(audio_path, language)
            results.append(result)
        
        return results

def main():
    parser = argparse.ArgumentParser(description="本地Faster-Whisper音频转录")
    parser.add_argument("files", nargs="+", help="音频文件路径")
    parser.add_argument("--model", default="base", 
                       choices=["tiny", "base", "small", "medium", "large-v3"],
                       help="Whisper模型大小 (默认: base)")
    parser.add_argument("--language", help="指定语言代码 (如: zh, en)")
    parser.add_argument("--device", default="cpu", 
                       choices=["cpu", "cuda"], help="计算设备")
    parser.add_argument("--compute-type", default="int8",
                       choices=["int8", "int16", "float16", "float32"],
                       help="计算精度")
    parser.add_argument("--output", help="输出JSON文件路径")
    
    args = parser.parse_args()
    
    # 验证文件存在
    audio_files = []
    for file_path in args.files:
        path = Path(file_path)
        if not path.exists():
            print(f"❌ 文件不存在: {file_path}", file=sys.stderr)
            sys.exit(1)
        audio_files.append(str(path.absolute()))
    
    try:
        # 初始化转录器
        transcriber = LocalWhisperTranscriber(
            model_size=args.model,
            device=args.device,
            compute_type=args.compute_type.replace("-", "_")
        )
        
        # 执行转录
        if len(audio_files) == 1:
            result = transcriber.transcribe_file(audio_files[0], args.language)
        else:
            result = transcriber.transcribe_multiple(audio_files, args.language)
        
        # 输出结果
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"📁 结果已保存到: {args.output}", file=sys.stderr)
        else:
            # 输出到stdout
            print(json.dumps(result, ensure_ascii=False))
    
    except KeyboardInterrupt:
        print("\n⚠️ 转录被用户中断", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ 程序错误: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
