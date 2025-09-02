#!/usr/bin/env python3
"""
增强版本地Faster-Whisper转录脚本
支持说话人分离(Speaker Diarization)和情绪检测
"""

import sys
import json
import argparse
import time
import re
from pathlib import Path
from faster_whisper import WhisperModel
import warnings
warnings.filterwarnings("ignore")

class EnhancedWhisperTranscriber:
    def __init__(self, model_size="base", device="cpu", compute_type="int8"):
        """
        初始化增强版Whisper模型
        """
        print(f"🔄 正在加载Whisper模型: {model_size}", file=sys.stderr)
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print(f"✅ 模型加载完成", file=sys.stderr)
        
        # 情绪关键词字典
        self.emotion_keywords = {
            '笑': ['哈哈', '呵呵', '嘿嘿', '咯咯', '哈哈哈', '呵呵呵'],
            '感叹': ['哇', '哎呀', '天哪', '我的天', '哦', '啊'],
            '思考': ['嗯', '额', '这个', '那个', '就是说'],
            '赞同': ['对对对', '是的是的', '没错', '确实', '对啊'],
            '惊讶': ['什么', '真的吗', '不会吧', '这么厉害'],
            '停顿': ['..', '...', '....']
        }
    
    def detect_speaker_change(self, segments):
        """
        基于音频特征检测说话人变化的简化版本
        """
        speakers = []
        current_speaker = "主持人"
        speaker_count = 0
        
        for i, segment in enumerate(segments):
            text = segment['text'].strip()
            
            # 基于内容特征判断说话人切换
            speaker_change_indicators = [
                len(text) > 100,  # 长句子更可能是新说话人
                text.startswith(('好', '那', '所以', '其实', '但是')),  # 转折词
                i > 0 and segment['start'] - segments[i-1]['end'] > 2.0  # 长停顿
            ]
            
            if any(speaker_change_indicators) and i > 0:
                if current_speaker == "主持人":
                    current_speaker = "嘉宾"
                else:
                    current_speaker = "主持人"
            
            speakers.append(current_speaker)
        
        return speakers
    
    def detect_emotions(self, text):
        """
        检测文本中的情绪标记
        """
        emotions = []
        
        for emotion, keywords in self.emotion_keywords.items():
            for keyword in keywords:
                if keyword in text:
                    emotions.append(emotion)
                    break
        
        # 检测重复字符（表示强调或情绪）
        if re.search(r'(.)\1{2,}', text):
            emotions.append('强调')
        
        # 检测问号和感叹号
        if '?' in text or '？' in text:
            emotions.append('疑问')
        if '!' in text or '！' in text:
            emotions.append('激动')
        
        return list(set(emotions))
    
    def format_transcript_with_speakers_and_emotions(self, segments, speakers, podcast_title=None):
        """
        格式化转录文本，包含说话人和情绪信息
        """
        from datetime import datetime
        
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        if podcast_title:
            title = f"# 📝 {podcast_title} - 增强转录"
        else:
            title = "# 📝 播客增强转录"
        
        content = f"""{title}

**转录时间**: {current_time}
**功能**: 支持说话人分离和情绪检测

---

"""
        
        current_speaker = None
        for i, (segment, speaker) in enumerate(zip(segments, speakers)):
            text = segment['text'].strip()
            
            # 检测情绪
            emotions = self.detect_emotions(text)
            emotion_tags = ' '.join([f'[{e}]' for e in emotions]) if emotions else ''
            
            # 时间戳
            timestamp = f"[{self.seconds_to_time(segment['start'])} - {self.seconds_to_time(segment['end'])}]"
            
            # 如果说话人变化，添加分隔线
            if speaker != current_speaker:
                if current_speaker is not None:
                    content += "\n---\n\n"
                content += f"## {speaker}\n\n"
                current_speaker = speaker
            
            # 添加文本内容
            content += f"**{timestamp}** {emotion_tags} {text}\n\n"
        
        return content
    
    def seconds_to_time(self, seconds):
        """
        将秒数转换为时间格式
        """
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes:02d}:{secs:02d}"
    
    def transcribe_file_enhanced(self, audio_path, language=None):
        """
        增强版转录，支持说话人分离和情绪检测
        """
        try:
            print(f"🎤 开始增强转录: {audio_path}", file=sys.stderr)
            start_time = time.time()
            
            # 执行转录
            segments, info = self.model.transcribe(
                audio_path, 
                language=language,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500),
                word_timestamps=True  # 启用词级时间戳
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
            
            print(f"🎭 检测说话人变化...", file=sys.stderr)
            speakers = self.detect_speaker_change(transcript_segments)
            
            print(f"😊 检测情绪标记...", file=sys.stderr)
            
            duration = time.time() - start_time
            
            result = {
                "success": True,
                "file": str(audio_path),
                "text": full_text.strip(),
                "segments": transcript_segments,
                "speakers": speakers,
                "language": info.language,
                "language_probability": info.language_probability,
                "duration": info.duration,
                "processing_time": round(duration, 2),
                "enhanced": True
            }
            
            print(f"✅ 增强转录完成: {duration:.1f}秒", file=sys.stderr)
            print(f"🎭 检测到说话人变化: {len(set(speakers))}个", file=sys.stderr)
            
            return result
            
        except Exception as e:
            error_result = {
                "success": False,
                "file": str(audio_path),
                "error": str(e),
                "text": "",
                "enhanced": False
            }
            print(f"❌ 增强转录失败: {e}", file=sys.stderr)
            return error_result

def save_enhanced_transcript_to_file(result, save_dir, file_prefix=None, podcast_title=None, source_url=None):
    """
    保存增强转录文本到文件
    """
    try:
        save_path = Path(save_dir)
        save_path.mkdir(parents=True, exist_ok=True)
        
        # 生成文件名
        if file_prefix:
            filename = f"{file_prefix}_enhanced_transcript.md"
        else:
            timestamp = int(time.time())
            filename = f"enhanced_transcript_{timestamp}.md"
        
        file_path = save_path / filename
        
        # 创建转录器实例来格式化内容
        transcriber = EnhancedWhisperTranscriber()
        
        # 格式化为增强版Markdown
        if result.get('enhanced') and 'speakers' in result:
            markdown_content = transcriber.format_transcript_with_speakers_and_emotions(
                result['segments'], 
                result['speakers'], 
                podcast_title
            )
        else:
            # 降级到普通格式
            markdown_content = f"# 📝 {podcast_title or 'Podcast转录'}\n\n{result['text']}"
        
        # 添加来源链接
        if source_url:
            markdown_content += f"\n\n---\n\n**来源**: {source_url}\n"
        
        # 保存文件
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        # 获取文件信息
        file_size = file_path.stat().st_size
        
        file_info = {
            "type": "enhanced_transcript",
            "filename": filename,
            "path": str(file_path),
            "size": file_size
        }
        
        print(f"📄 增强转录文本已保存: {file_path} ({file_size/1024:.1f}KB)", file=sys.stderr)
        return file_info
        
    except Exception as e:
        print(f"❌ 保存增强转录文件失败: {e}", file=sys.stderr)
        return None

def main():
    parser = argparse.ArgumentParser(description="增强版本地Faster-Whisper音频转录")
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
    parser.add_argument("--save-transcript", help="直接保存转录文本到指定目录")
    parser.add_argument("--file-prefix", help="保存文件的前缀名称")
    parser.add_argument("--source-url", help="播客来源链接")
    parser.add_argument("--podcast-title", help="播客标题")
    parser.add_argument("--enhanced", action="store_true", help="启用增强模式（说话人分离+情绪检测）")
    
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
        if args.enhanced:
            print("🚀 启动增强转录模式", file=sys.stderr)
            transcriber = EnhancedWhisperTranscriber(
                model_size=args.model,
                device=args.device,
                compute_type=args.compute_type.replace("-", "_")
            )
            
            # 使用增强转录
            if len(audio_files) == 1:
                result = transcriber.transcribe_file_enhanced(audio_files[0], args.language)
            else:
                # 批量处理（暂时使用普通模式）
                print("⚠️ 批量模式暂不支持增强功能，使用普通转录", file=sys.stderr)
                from whisper_transcribe import LocalWhisperTranscriber
                basic_transcriber = LocalWhisperTranscriber(args.model, args.device, args.compute_type.replace("-", "_"))
                result = basic_transcriber.transcribe_multiple(audio_files, args.language)
        else:
            # 使用普通转录
            from whisper_transcribe import LocalWhisperTranscriber
            transcriber = LocalWhisperTranscriber(
                model_size=args.model,
                device=args.device,
                compute_type=args.compute_type.replace("-", "_")
            )
            
            if len(audio_files) == 1:
                result = transcriber.transcribe_file(audio_files[0], args.language)
            else:
                result = transcriber.transcribe_multiple(audio_files, args.language)
        
        # 处理转录文本保存
        saved_files = []
        if args.save_transcript and isinstance(result, dict) and result.get('success') and result.get('text'):
            if args.enhanced and result.get('enhanced'):
                file_info = save_enhanced_transcript_to_file(
                    result=result,
                    save_dir=args.save_transcript,
                    file_prefix=args.file_prefix,
                    podcast_title=args.podcast_title,
                    source_url=args.source_url
                )
            else:
                # 使用原有保存方法
                from whisper_transcribe import save_transcript_to_file
                file_info = save_transcript_to_file(
                    transcript_text=result['text'],
                    save_dir=args.save_transcript,
                    file_prefix=args.file_prefix,
                    original_filename=audio_files[0] if len(audio_files) == 1 else None,
                    source_url=args.source_url,
                    podcast_title=args.podcast_title
                )
            
            if file_info:
                saved_files.append(file_info)
        
        # 在结果中添加保存的文件信息
        if isinstance(result, dict):
            result['savedFiles'] = saved_files
        
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