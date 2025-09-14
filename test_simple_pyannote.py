#!/usr/bin/env python3
"""
简化的 PyAnnote 测试脚本
专注于测试基本功能
"""

import os
import sys
import torch

def simple_test():
    """简单的 PyAnnote 测试"""

    print("🎭 简化 PyAnnote 测试")
    print("=" * 40)

    # 音频文件 (使用WAV格式)
    audio_file = "server/temp/audio_1756810032503_50wk4cx6x.wav"

    if not os.path.exists(audio_file):
        print(f"❌ 音频文件不存在: {audio_file}")
        return False

    try:
        print("📡 加载 PyAnnote 管道...")
        from pyannote.audio import Pipeline

        # 尝试3.1版本 (更兼容新版本的库)
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=True
        )

        print("✅ 管道加载成功")

        # 移到 GPU
        if torch.cuda.is_available():
            pipeline.to(torch.device("cuda"))
            print("✅ 已移到 GPU")

        print(f"🎤 处理音频文件: {os.path.basename(audio_file)}")

        # 执行说话人分离 - 不指定说话人数量，让它自动检测
        diarization = pipeline(audio_file)

        print("✅ 说话人分离完成!")

        # 收集结果
        segments = []
        speakers = set()

        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segment = {
                "start": float(turn.start),
                "end": float(turn.end),
                "duration": float(turn.end - turn.start),
                "speaker": speaker
            }
            segments.append(segment)
            speakers.add(speaker)

        print(f"📊 分离结果:")
        print(f"   - 检测到 {len(speakers)} 个说话人: {sorted(speakers)}")
        print(f"   - 分割为 {len(segments)} 个片段")

        # 显示前几个片段
        print(f"   - 前3个片段:")
        for i, seg in enumerate(segments[:3]):
            print(f"     {i+1}. [{seg['start']:.1f}s-{seg['end']:.1f}s] {seg['speaker']}")

        # 构建标准输出格式
        result = {
            "success": True,
            "audio_file": os.path.basename(audio_file),
            "speakers": sorted(list(speakers)),
            "num_speakers": len(speakers),
            "segments": segments[:5],  # 只显示前5个片段
            "stats": {
                "total_segments": len(segments),
                "total_speakers": len(speakers)
            }
        }

        import json
        print("\n📄 标准格式输出:")
        print(json.dumps(result, indent=2, ensure_ascii=False))

        return True

    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = simple_test()
    sys.exit(0 if success else 1)