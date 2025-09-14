#!/usr/bin/env python3
"""
PyAnnote 模型访问权限检查脚本
"""

import os
import sys

def check_hf_auth():
    """检查 HuggingFace 认证状态"""
    print("🔐 检查 HuggingFace 认证状态...")

    # 检查环境变量
    token = os.getenv('HF_TOKEN')
    if token:
        print(f"✅ 发现 HF_TOKEN 环境变量 (长度: {len(token)})")
    else:
        print("❌ 未找到 HF_TOKEN 环境变量")

    # 检查 huggingface_hub 认证
    try:
        from huggingface_hub import HfApi
        api = HfApi()
        user_info = api.whoami()
        if user_info:
            print(f"✅ HuggingFace 已登录: {user_info.get('name', 'Unknown')}")
            return True
        else:
            print("❌ HuggingFace 未登录")
            return False
    except Exception as e:
        print(f"❌ 认证检查失败: {e}")
        return False

def test_model_access():
    """测试模型访问权限"""
    print("\n🎭 测试 PyAnnote 模型访问权限...")

    try:
        from pyannote.audio import Pipeline

        # 测试主要模型
        print("📡 尝试加载 pyannote/speaker-diarization-3.1...")
        token = os.getenv('HF_TOKEN') or True

        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=token
        )
        print("✅ pyannote/speaker-diarization-3.1 加载成功!")
        return True, "pyannote/speaker-diarization-3.1"

    except Exception as e:
        print(f"❌ 主要模型加载失败: {e}")

        # 尝试备用模型
        try:
            print("📡 尝试加载备用模型 pyannote/speaker-diarization...")
            pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization",
                use_auth_token=token
            )
            print("✅ 备用模型加载成功!")
            return True, "pyannote/speaker-diarization"

        except Exception as e2:
            print(f"❌ 备用模型也加载失败: {e2}")
            return False, None

def main():
    print("🔧 PyAnnote 模型访问权限检查")
    print("=" * 50)

    # 检查认证
    auth_ok = check_hf_auth()

    if not auth_ok:
        print("\n💡 认证问题解决方案:")
        print("1. 设置环境变量: export HF_TOKEN=your_token_here")
        print("2. 或使用 CLI: hf auth login")
        print("3. 获取 token: https://huggingface.co/settings/tokens")
        return False

    # 测试模型访问
    model_ok, model_name = test_model_access()

    if not model_ok:
        print("\n💡 模型访问问题解决方案:")
        print("1. 访问 https://hf.co/pyannote/speaker-diarization-3.1")
        print("2. 点击 'Agree and access repository'")
        print("3. 接受用户协议")
        print("4. 重新运行此脚本验证")
        return False

    print(f"\n🎉 所有检查通过! 可用模型: {model_name}")
    print("✅ PyAnnote 说话人分离功能已准备就绪")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)