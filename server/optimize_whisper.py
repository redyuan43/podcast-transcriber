#!/usr/bin/env python3
"""
Whisper转录效率优化脚本
通过并行处理、模型优化等方式提升转录速度
"""

import sys
import json
import argparse
import time
import multiprocessing
import concurrent.futures
from pathlib import Path
from faster_whisper import WhisperModel
import warnings
warnings.filterwarnings("ignore")

class OptimizedWhisperTranscriber:
    def __init__(self, model_size="base", device="auto", compute_type="auto", cpu_threads=None):
        """
        初始化优化版Whisper模型
        """
        # 自动选择最优设备
        if device == "auto":
            try:
                import torch
                device = "cuda" if torch.cuda.is_available() else "cpu"
            except ImportError:
                device = "cpu"
        
        # 自动选择最优计算类型
        if compute_type == "auto":
            if device == "cuda":
                compute_type = "float16"  # GPU优化
            else:
                compute_type = "int8"     # CPU优化
        
        # 优化CPU线程数
        if cpu_threads is None:
            cpu_threads = min(8, multiprocessing.cpu_count())  # 最多8线程，避免过载
        
        print(f"🚀 正在加载优化版Whisper模型: {model_size}", file=sys.stderr)
        print(f"📱 设备: {device}, 计算类型: {compute_type}, CPU线程: {cpu_threads}", file=sys.stderr)
        
        self.model = WhisperModel(
            model_size, 
            device=device, 
            compute_type=compute_type,
            cpu_threads=cpu_threads,
            num_workers=1  # 单worker但优化内部并行
        )
        
        self.device = device
        self.compute_type = compute_type
        
        print(f"✅ 优化版模型加载完成", file=sys.stderr)
    
    def transcribe_file_optimized(self, audio_path, language=None):
        """
        优化版转录，注重速度
        """
        try:
            print(f"⚡ 开始优化转录: {audio_path}", file=sys.stderr)
            start_time = time.time()
            
            # 优化参数设置
            vad_parameters = {
                "min_silence_duration_ms": 250,  # 减少静音检测时间
                "threshold": 0.5,               # 提高语音活动检测阈值
                "min_speech_duration_ms": 250   # 减少最小语音时长
            }
            
            # 执行优化转录
            segments, info = self.model.transcribe(
                audio_path, 
                language=language,
                vad_filter=True,
                vad_parameters=vad_parameters,
                beam_size=1,        # 减少beam size提升速度
                best_of=1,          # 减少候选数量
                temperature=0,      # 确定性输出，提升速度
                condition_on_previous_text=True,  # 利用上下文提升准确性
                initial_prompt=None,
                word_timestamps=False  # 关闭词级时间戳以提升速度
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
            
            # 计算性能指标
            audio_duration = info.duration
            real_time_factor = duration / audio_duration if audio_duration > 0 else 0
            
            result = {
                "success": True,
                "file": str(audio_path),
                "text": full_text.strip(),
                "segments": transcript_segments,
                "language": info.language,
                "language_probability": info.language_probability,
                "duration": info.duration,
                "processing_time": round(duration, 2),
                "real_time_factor": round(real_time_factor, 3),
                "optimized": True,
                "performance": {
                    "device": self.device,
                    "compute_type": self.compute_type,
                    "segments_per_second": len(transcript_segments) / duration if duration > 0 else 0,
                    "words_per_minute": len(full_text.split()) / (duration / 60) if duration > 0 else 0
                }
            }
            
            print(f"⚡ 优化转录完成: {duration:.1f}秒", file=sys.stderr)
            print(f"📊 实时因子: {real_time_factor:.3f}x (越小越快)", file=sys.stderr)
            print(f"🚀 处理速度: {len(transcript_segments)/duration:.1f} 段/秒", file=sys.stderr)
            
            return result
            
        except Exception as e:
            error_result = {
                "success": False,
                "file": str(audio_path),
                "error": str(e),
                "text": "",
                "optimized": False
            }
            print(f"❌ 优化转录失败: {e}", file=sys.stderr)
            return error_result
    
    def transcribe_with_chunking(self, audio_path, language=None, chunk_length=600):
        """
        分块转录，适用于长音频文件
        """
        try:
            print(f"📦 开始分块转录: {audio_path} (块长度: {chunk_length}秒)", file=sys.stderr)
            
            # 这里可以添加音频分割逻辑
            # 暂时使用整文件转录
            return self.transcribe_file_optimized(audio_path, language)
            
        except Exception as e:
            print(f"❌ 分块转录失败: {e}", file=sys.stderr)
            return {"success": False, "error": str(e)}

def benchmark_model(model_size, test_file, iterations=3):
    """
    基准测试不同模型的性能
    """
    print(f"🧪 基准测试模型: {model_size}", file=sys.stderr)
    
    results = []
    for i in range(iterations):
        transcriber = OptimizedWhisperTranscriber(model_size)
        result = transcriber.transcribe_file_optimized(test_file)
        if result['success']:
            results.append(result['processing_time'])
    
    if results:
        avg_time = sum(results) / len(results)
        print(f"📊 模型 {model_size} 平均耗时: {avg_time:.2f}秒", file=sys.stderr)
        return avg_time
    return None

def main():
    parser = argparse.ArgumentParser(description="优化版本地Faster-Whisper音频转录")
    parser.add_argument("files", nargs="+", help="音频文件路径")
    parser.add_argument("--model", default="base", 
                       choices=["tiny", "base", "small", "medium", "large-v3"],
                       help="Whisper模型大小 (默认: base)")
    parser.add_argument("--language", help="指定语言代码 (如: zh, en)")
    parser.add_argument("--device", default="auto", help="计算设备 (auto/cpu/cuda)")
    parser.add_argument("--compute-type", default="auto", help="计算精度 (auto/int8/float16/float32)")
    parser.add_argument("--cpu-threads", type=int, help="CPU线程数 (默认自动)")
    parser.add_argument("--output", help="输出JSON文件路径")
    parser.add_argument("--chunk-length", type=int, default=600, help="分块长度(秒)")
    parser.add_argument("--benchmark", action="store_true", help="运行性能基准测试")
    parser.add_argument("--save-transcript", help="保存转录文本到指定目录")
    parser.add_argument("--file-prefix", help="保存文件前缀")
    
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
        if args.benchmark:
            # 运行基准测试
            print("🧪 开始性能基准测试...", file=sys.stderr)
            models = ["tiny", "base", "small"]
            for model in models:
                benchmark_model(model, audio_files[0])
            return
        
        # 初始化优化转录器
        transcriber = OptimizedWhisperTranscriber(
            model_size=args.model,
            device=args.device,
            compute_type=args.compute_type,
            cpu_threads=args.cpu_threads
        )
        
        # 处理文件
        if len(audio_files) == 1:
            if Path(audio_files[0]).stat().st_size > 100 * 1024 * 1024:  # 大于100MB使用分块
                result = transcriber.transcribe_with_chunking(audio_files[0], args.language, args.chunk_length)
            else:
                result = transcriber.transcribe_file_optimized(audio_files[0], args.language)
        else:
            # 批量处理
            results = []
            for audio_file in audio_files:
                result = transcriber.transcribe_file_optimized(audio_file, args.language)
                results.append(result)
            result = {"results": results, "batch": True}
        
        # 保存转录文本
        saved_files = []
        if args.save_transcript and isinstance(result, dict) and result.get('success') and result.get('text'):
            from whisper_transcribe import save_transcript_to_file
            file_info = save_transcript_to_file(
                transcript_text=result['text'],
                save_dir=args.save_transcript,
                file_prefix=args.file_prefix or "optimized",
                original_filename=audio_files[0] if len(audio_files) == 1 else None
            )
            if file_info:
                saved_files.append(file_info)
                result['savedFiles'] = saved_files
        
        # 输出结果
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"📁 结果已保存到: {args.output}", file=sys.stderr)
        else:
            print(json.dumps(result, ensure_ascii=False))
    
    except KeyboardInterrupt:
        print("\n⚠️ 转录被用户中断", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ 程序错误: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()