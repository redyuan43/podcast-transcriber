# 🎙️ 播客平台支持说明 / Podcast Platform Support

## 📊 当前支持状态 / Current Support Status

### ✅ **完全支持 / Fully Supported**

#### 🔗 **直接音频链接 / Direct Audio Links**
```
✅ 支持格式: .mp3, .m4a, .wav, .aac, .ogg, .wma
✅ 示例: https://example.com/audio.mp3
```

#### 📡 **RSS Feed链接 / RSS Feed Links**
```
✅ 标准RSS 2.0格式
✅ iTunes兼容RSS
✅ 自动发现页面中的RSS链接
✅ 示例: https://feeds.example.com/podcast.xml
```

### ⚠️ **部分支持 / Partial Support**

#### 🍎 **Apple Podcasts**
```
状态: 部分支持，通过RSS解析
支持方式: 
  - ✅ iTunes API查询RSS feed
  - ✅ 页面RSS自动发现
  - ❌ 直接剧集链接解析（受Apple限制）

测试链接: 
https://podcasts.apple.com/us/podcast/ted-talks-daily/id160904630

技术限制:
- Apple Podcasts不在页面直接暴露音频链接
- 需要通过RSS feed获取音频
- 部分播客可能有地域限制
```

#### 🚀 **小宇宙 (Xiaoyuzhou)**
```
状态: 部分支持，通过多种方式尝试
支持方式:
  - ⚠️ 尝试小宇宙API (可能需要认证)
  - ⚠️ RSS feed发现
  - ❌ 直接页面解析（有反爬虫保护）

测试链接:
https://www.xiaoyuzhoufm.com/episode/67e238d8dd11f9c8c1f0b2e8

技术限制:
- 小宇宙使用动态加载，页面不包含直接音频链接
- API可能需要特殊认证
- 有反爬虫机制
```

## 🛠️ 技术实现 / Technical Implementation

### RSS解析器特性:
- ✅ 支持标准RSS 2.0
- ✅ 支持iTunes播客扩展
- ✅ 自动内容类型检测
- ✅ 多种音频链接格式支持
- ✅ CDATA内容处理

### 解析策略:
1. **直接音频检测** - 检查URL是否直接指向音频文件
2. **RSS链接检测** - 检查URL是否为RSS feed
3. **平台特定解析** - Apple Podcasts / 小宇宙专用解析
4. **页面RSS发现** - 自动从页面发现RSS链接
5. **通用解析** - 处理其他播客平台

## 📈 推荐使用方式 / Recommended Usage

### ✅ **最佳支持的链接类型**:

1. **直接RSS Feed链接**
```
https://feeds.example.com/podcast.xml
https://anchor.fm/s/podcast-id/podcast/rss
```

2. **直接音频文件链接**  
```
https://traffic.libsyn.com/example/episode.mp3
https://cdn.example.com/audio/episode.m4a
```

3. **支持RSS的播客平台**
```
Spotify (通过RSS)
Anchor.fm
Libsyn
等等...
```

### ⚠️ **部分支持但可能不稳定**:
- Apple Podcasts (取决于RSS可用性)
- 小宇宙 (取决于API限制)

### ❌ **暂不支持**:
- YouTube音频 (需要特殊处理)
- 需要登录的私有播客
- DRM保护的音频内容

## 🔧 故障排除 / Troubleshooting

### 如果遇到解析失败:

1. **检查链接格式** - 确保是有效的播客或音频链接
2. **尝试RSS链接** - 如果有RSS feed，直接使用RSS链接
3. **使用备用链接** - 尝试从其他平台获取同一播客
4. **检查网络** - 确保网络连接正常

### 错误处理:
- 所有失败都会回退到测试音频
- 详细错误日志记录在服务器控制台
- 用户友好的错误提示

## 🚀 未来改进计划 / Future Improvements

- [ ] 更好的小宇宙API集成
- [ ] YouTube音频提取支持
- [ ] 更多播客平台支持
- [ ] 缓存机制减少重复下载
- [ ] 批量处理多个播客

## 💡 开发者注意事项 / Developer Notes

播客解析是一个复杂的过程，因为：
1. **各平台策略不同** - 有些开放RSS，有些需要API
2. **反爬虫机制** - 很多平台有保护措施
3. **动态内容** - JavaScript渲染的内容难以直接解析
4. **认证要求** - 部分内容需要登录或订阅

当前实现尽可能覆盖常见场景，对于无法解析的情况提供合理的备用方案。
