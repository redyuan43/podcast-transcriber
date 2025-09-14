#!/usr/bin/env python3
"""
PyAnnote 模型批量下载脚本
手动下载所有依赖模型到本地缓存
"""

import os
import sys
from pathlib import Path

def download_models():
    """下载 PyAnnote 所需的所有模型"""

    print("🚀 开始下载 PyAnnote 模型...")
    print("=" * 50)

    # 需要下载的模型列表
    models_to_download = [
        # 主要的说话人分离管道
        "pyannote/speaker-diarization-3.1",
        "pyannote/speaker-diarization@2022.07",

        # 依赖的底层模型
        "pyannote/segmentation-3.0",
        "pyannote/segmentation",
        "pyannote/speaker-change-detection",
        "pyannote/overlapped-speech-detection",
        "pyannote/voice-activity-detection",

        # 嵌入模型
        "pyannote/embedding",
        "pyannote/wespeaker-voxceleb-resnet34-LM"
    ]

    downloaded = []
    failed = []

    for model_name in models_to_download:
        print(f"\n📡 下载模型: {model_name}")
        try:
            if "speaker-diarization" in model_name:
                # 说话人分离管道
                from pyannote.audio import Pipeline
                pipeline = Pipeline.from_pretrained(model_name, use_auth_token=True)
                print(f"✅ 管道下载成功: {model_name}")
                downloaded.append(model_name)
            else:
                # 普通模型
                from pyannote.audio import Model
                model = Model.from_pretrained(model_name, use_auth_token=True)
                print(f"✅ 模型下载成功: {model_name}")
                downloaded.append(model_name)

        except Exception as e:
            print(f"❌ 下载失败: {model_name}")
            print(f"   错误: {str(e)[:100]}...")
            failed.append((model_name, str(e)))

    # 总结报告
    print("\n" + "=" * 50)
    print("📊 下载总结:")
    print(f"✅ 成功: {len(downloaded)} 个模型")
    print(f"❌ 失败: {len(failed)} 个模型")

    if downloaded:
        print("\n✅ 成功下载的模型:")
        for model in downloaded:
            print(f"   - {model}")

    if failed:
        print("\n❌ 下载失败的模型:")
        for model, error in failed:
            print(f"   - {model}: {error[:50]}...")

    return len(failed) == 0

def check_cache():
    """检查本地模型缓存"""
    print("\n🔍 检查本地模型缓存...")

    # HuggingFace 缓存目录
    cache_dirs = [
        Path.home() / ".cache" / "huggingface",
        Path.home() / ".cache" / "pyannote",
        Path("/tmp/pyannote")  # 可能的临时缓存
    ]

    for cache_dir in cache_dirs:
        if cache_dir.exists():
            print(f"📁 发现缓存目录: {cache_dir}")

            # 查找 pyannote 相关文件
            pyannote_files = list(cache_dir.glob("**/pyannote*"))
            if pyannote_files:
                print(f"   找到 {len(pyannote_files)} 个 pyannote 文件")
                for f in pyannote_files[:5]:  # 只显示前5个
                    print(f"   - {f.name}")
                if len(pyannote_files) > 5:
                    print(f"   - ... 还有 {len(pyannote_files)-5} 个文件")

def test_downloaded_models():
    """测试下载的模型是否可用"""
    print("\n🧪 测试已下载的模型...")

    test_models = [
        "pyannote/speaker-diarization@2022.07",
        "pyannote/speaker-diarization-3.1"
    ]

    working_models = []

    for model_name in test_models:
        try:
            print(f"🔬 测试模型: {model_name}")
            from pyannote.audio import Pipeline
            pipeline = Pipeline.from_pretrained(model_name, use_auth_token=True)
            print(f"✅ 模型可用: {model_name}")
            working_models.append(model_name)
        except Exception as e:
            print(f"❌ 模型测试失败: {model_name}")
            print(f"   错误: {str(e)[:100]}...")

    return working_models

def main():
    print("🔧 PyAnnote 模型下载工具")
    print("=" * 50)

    # 检查认证状态
    try:
        from huggingface_hub import HfApi
        api = HfApi()
        user_info = api.whoami()
        if user_info:
            print(f"✅ HuggingFace 已登录: {user_info.get('name', 'Unknown')}")
        else:
            print("❌ HuggingFace 未登录")
            print("请先运行: hf auth login")
            return False
    except Exception as e:
        print(f"❌ 认证检查失败: {e}")
        return False

    # 检查现有缓存
    check_cache()

    # 下载模型
    success = download_models()

    # 测试模型
    if success:
        working_models = test_downloaded_models()

        if working_models:
            print(f"\n🎉 成功! 可用模型: {len(working_models)} 个")
            print("现在可以运行 PyAnnote 说话人分离了!")
            return True
        else:
            print("\n⚠️ 模型下载完成但测试失败")
            return False
    else:
        print("\n❌ 部分模型下载失败")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)