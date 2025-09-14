#!/usr/bin/env python3
"""
专门测试 pyannote/speaker-diarization-3.1 的脚本
"""

import os
import sys
import torch

def test_3_1_loading():
    """测试3.1版本加载的详细过程"""

    print("🔧 测试 pyannote/speaker-diarization-3.1 加载过程")
    print("=" * 60)

    # 设置认证
    print("🔐 设置认证...")
    token = os.getenv('HF_TOKEN') or True
    print(f"Token 类型: {type(token)}")

    # 检查 GPU
    print(f"🎮 CUDA 可用: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU 数量: {torch.cuda.device_count()}")
        for i in range(torch.cuda.device_count()):
            print(f"GPU {i}: {torch.cuda.get_device_name(i)}")

    try:
        print("\n📡 步骤 1: 导入 Pipeline...")
        from pyannote.audio import Pipeline
        print("✅ Pipeline 导入成功")

        print("\n📡 步骤 2: 加载 3.1 版本...")
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=token
        )
        print("✅ Pipeline 对象创建成功")
        print(f"Pipeline 类型: {type(pipeline)}")
        print(f"Pipeline: {pipeline}")

        print("\n📡 步骤 3: 设置 GPU 设备...")
        if torch.cuda.is_available():
            device = torch.device("cuda")
            pipeline.to(device)
            print("✅ Pipeline 已移到 GPU")
        else:
            print("ℹ️ 使用 CPU 模式")

        print("\n🎉 3.1 版本加载完全成功!")
        return pipeline

    except Exception as e:
        print(f"\n❌ 加载失败: {type(e).__name__}: {e}")

        # 详细调试信息
        import traceback
        print("\n🔍 详细错误信息:")
        traceback.print_exc()

        return None

def test_dependencies():
    """测试3.1版本的依赖模型"""

    print("\n🔍 测试依赖模型...")

    dependencies = [
        "pyannote/segmentation-3.0",
        "pyannote/wespeaker-voxceleb-resnet34-LM"
    ]

    token = os.getenv('HF_TOKEN') or True

    for dep in dependencies:
        try:
            print(f"📡 测试 {dep}...")
            from pyannote.audio import Model
            model = Model.from_pretrained(dep, use_auth_token=token)
            print(f"✅ {dep} 可用")
        except Exception as e:
            print(f"❌ {dep} 失败: {e}")

def test_with_audio():
    """使用真实音频测试"""

    print("\n🎵 使用音频文件测试...")

    audio_file = "server/temp/audio_1756810032503_50wk4cx6x.m4a"

    if not os.path.exists(audio_file):
        print(f"❌ 音频文件不存在: {audio_file}")
        return

    pipeline = test_3_1_loading()
    if pipeline is None:
        print("❌ Pipeline 加载失败，跳过音频测试")
        return

    try:
        print(f"🎤 处理音频文件: {os.path.basename(audio_file)}")

        # 执行说话人分离
        diarization = pipeline(audio_file)

        print("✅ 说话人分离成功!")

        # 统计结果
        speakers = set()
        segments = 0

        for turn, _, speaker in diarization.itertracks(yield_label=True):
            speakers.add(speaker)
            segments += 1

        print(f"📊 结果统计:")
        print(f"   - 检测到 {len(speakers)} 个说话人")
        print(f"   - 分割为 {segments} 个片段")
        print(f"   - 说话人列表: {sorted(speakers)}")

        return True

    except Exception as e:
        print(f"❌ 音频处理失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("🎭 PyAnnote 3.1 专项测试")

    # 测试依赖
    test_dependencies()

    # 测试加载
    pipeline = test_3_1_loading()

    if pipeline:
        # 测试音频处理
        success = test_with_audio()

        if success:
            print("\n🎉 所有测试通过! 3.1 版本完全可用")
            return True

    print("\n❌ 测试失败")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)