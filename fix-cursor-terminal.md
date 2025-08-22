# 🔧 修复 Cursor 终端问题

## 错误描述
```
The terminal process failed to launch: A native exception occurred during launch (posix_spawnp failed.)
```

## 解决步骤

### 1. 检查系统终端环境
在系统Terminal.app中运行：
```bash
# 检查shell
echo $SHELL
which zsh
which bash

# 检查Node环境
which node
which npm
node -v
npm -v

# 检查PATH
echo $PATH
```

### 2. 修复Cursor设置
打开Cursor设置（Cmd+,），搜索"terminal"：

**方法1：重置终端设置**
```json
{
  "terminal.integrated.defaultProfile.osx": "zsh",
  "terminal.integrated.profiles.osx": {
    "zsh": {
      "path": "/bin/zsh",
      "args": ["-l"]
    }
  }
}
```

**方法2：删除旧配置**
- 删除 `terminal.integrated.shell.osx`
- 删除自定义shell路径
- 重启Cursor

### 3. 环境变量问题
如果使用nvm/brew安装的Node：
```bash
# 在 ~/.zshrc 中添加
export PATH="/usr/local/bin:$PATH"
export PATH="$HOME/.nvm/versions/node/vXX.XX.X/bin:$PATH"

# 重新加载
source ~/.zshrc
```

### 4. 权限问题
```bash
# 修复权限
sudo xcode-select --install
sudo chmod -R 755 /usr/local/bin
```

### 5. 终极解决方案
如果以上都不行：
1. 完全退出Cursor
2. 删除Cursor设置：`~/Library/Application Support/Cursor`
3. 重新安装Cursor
4. 重启电脑

## 临时解决方案
始终使用系统Terminal.app：
```bash
cd /Users/moly-work/Downloads/podcast-to-text
npm start
```
