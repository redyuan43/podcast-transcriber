const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { parseRSSFeed, discoverRSSFromPage, getXiaoyuzhouRSS } = require('./rssParser');

/**
 * 下载播客音频文件
 * @param {string} url - 播客链接
 * @returns {Promise<string>} 下载的音频文件路径
 */
async function downloadPodcastAudio(url) {
    try {
        console.log(`开始处理播客链接: ${url}`);

        // 检测链接类型并获取音频URL
        const audioUrl = await extractAudioUrl(url);
        
        if (!audioUrl) {
            throw new Error('无法提取音频链接 / Cannot extract audio URL');
        }

        console.log(`提取到音频URL: ${audioUrl}`);

        // 下载音频文件
        const audioFilePath = await downloadAudioFile(audioUrl);
        
        return audioFilePath;

    } catch (error) {
        console.error('下载播客音频错误:', error);
        throw error;
    }
}

/**
 * 从播客链接提取音频URL
 * @param {string} url - 播客链接
 * @returns {Promise<string>} 音频文件URL
 */
async function extractAudioUrl(url) {
    try {
        // 直接音频文件链接
        if (isDirectAudioUrl(url)) {
            return url;
        }

        // Apple Podcasts链接处理
        if (url.includes('podcasts.apple.com')) {
            return await extractApplePodcastAudio(url);
        }

        // 小宇宙链接处理
        if (url.includes('xiaoyuzhoufm.com') || url.includes('小宇宙')) {
            return await extractXiaoyuzhouAudio(url);
        }

        // 通用RSS/播客平台处理
        return await extractGenericPodcastAudio(url);

    } catch (error) {
        console.error('提取音频URL错误:', error);
        throw error;
    }
}

/**
 * 检查是否为直接音频文件链接
 */
function isDirectAudioUrl(url) {
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.wma'];
    return audioExtensions.some(ext => url.toLowerCase().includes(ext));
}

/**
 * 处理Apple Podcasts链接 - 标准iTunes API → RSS → enclosure流程
 */
async function extractApplePodcastAudio(url) {
    try {
        console.log('处理Apple Podcasts链接（iTunes API → RSS解析）...');
        
        // 提取节目ID
        const podcastIdMatch = url.match(/id(\d+)/);
        if (!podcastIdMatch) {
            throw new Error('无法从URL中提取节目ID');
        }
        
        const podcastId = podcastIdMatch[1];
        const episodeIdMatch = url.match(/i=(\d+)/);
        const episodeId = episodeIdMatch ? episodeIdMatch[1] : null;
        
        console.log(`节目ID: ${podcastId}${episodeId ? `, Episode ID: ${episodeId}` : ''}`);
        
        // 使用iTunes API查询RSS feed
        const itunesApiUrl = `https://itunes.apple.com/lookup?id=${podcastId}&entity=podcast`;
        console.log(`查询iTunes API: ${itunesApiUrl}`);
        
        const itunesResponse = await axios.get(itunesApiUrl, { timeout: 10000 });
        
        if (!itunesResponse.data?.results?.length) {
            throw new Error('iTunes API未返回有效结果');
        }
        
        const feedUrl = itunesResponse.data.results[0].feedUrl;
        if (!feedUrl) {
            throw new Error('未找到RSS feed URL');
        }
        
        console.log(`获取到RSS feed: ${feedUrl}`);
        
        // 解析RSS feed
        const audioItems = await parseRSSFeed(feedUrl);
        if (!audioItems?.length) {
            throw new Error('RSS feed中未找到音频项目');
        }
        
        console.log(`RSS中找到 ${audioItems.length} 个音频项目`);
        
        // 如果有episode ID，智能匹配特定episode
        if (episodeId) {
            console.log(`查找episode ID: ${episodeId}`);
            
            // 尝试匹配特定episode
            let matchedItem = audioItems.find(item => {
                // 在RSS的各个字段中查找episode ID
                return item.audioUrl?.includes(episodeId) || 
                       item.guid?.includes(episodeId) ||
                       item.title?.includes(episodeId) ||
                       item.link?.includes(episodeId);
            });
            
            if (matchedItem) {
                console.log(`✅ 找到匹配episode: ${matchedItem.title}`);
                return matchedItem.audioUrl;
            } else {
                console.warn(`⚠️ 未找到episode ${episodeId}的匹配项，使用最新episode`);
            }
        }
        
        // 返回第一个episode（最新）
        const firstItem = audioItems[0];
        console.log(`使用最新episode: ${firstItem.title}`);
        return firstItem.audioUrl;

    } catch (error) {
        console.error('Apple Podcasts解析失败:', error);
        throw new Error(`Apple Podcasts音频解析失败: ${error.message}`);
    }
}

/**
 * 处理小宇宙链接 - 使用RSS解析
 */
async function extractXiaoyuzhouAudio(url) {
    try {
        console.log('处理小宇宙链接（RSS解析）...');
        
        // 方法1: 直接从网页抓取音频链接（替代需要认证的API）
        try {
            console.log('从小宇宙网页抓取音频链接...');
            const pageResponse = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 15000
            });
            
            // 从og:audio meta标签提取音频链接
            const ogAudioMatch = pageResponse.data.match(/<meta\s+property="og:audio"\s+content="([^"]+)"/);
            if (ogAudioMatch) {
                const audioUrl = ogAudioMatch[1];
                console.log('从小宇宙网页og:audio成功获取到音频链接');
                return audioUrl;
            }
            
            // 备用方案：从JSON-LD结构化数据提取
            const jsonLdMatch = pageResponse.data.match(/"contentUrl":"([^"]+\.m4a)"/);
            if (jsonLdMatch) {
                const audioUrl = jsonLdMatch[1];
                console.log('从小宇宙JSON-LD数据获取到音频链接');
                return audioUrl;
            }
            
        } catch (pageError) {
            console.log('小宇宙网页抓取失败，尝试其他方法:', pageError.message);
        }

        // 方法2: 尝试RSS feed
        try {
            const rssUrl = await getXiaoyuzhouRSS(url);
            if (rssUrl) {
                const audioItems = await parseRSSFeed(rssUrl);
                if (audioItems && audioItems.length > 0) {
                    console.log('从小宇宙RSS获取到音频链接');
                    return audioItems[0].audioUrl; // 返回第一个音频项目
                }
            }
        } catch (rssError) {
            console.log('小宇宙RSS解析失败:', rssError.message);
        }

        // 方法3: 尝试从页面发现RSS
        try {
            const discoveredRSS = await discoverRSSFromPage(url);
            if (discoveredRSS) {
                const audioItems = await parseRSSFeed(discoveredRSS);
                if (audioItems && audioItems.length > 0) {
                    console.log('从发现的RSS获取到音频链接');
                    return audioItems[0].audioUrl;
                }
            }
        } catch (discoverError) {
            console.log('RSS发现失败:', discoverError.message);
        }

        // 所有解析方法都失败了
        throw new Error('无法从小宇宙获取音频链接，请检查链接是否有效');

    } catch (error) {
        console.error('小宇宙解析错误:', error);
        throw new Error(`小宇宙音频解析失败: ${error.message}`);
    }
}

/**
 * 处理通用播客链接 - 支持RSS
 */
async function extractGenericPodcastAudio(url) {
    try {
        console.log('处理通用播客链接...');
        
        // 方法1: 检查是否直接是RSS feed
        if (url.includes('.xml') || url.includes('rss') || url.includes('feed')) {
            try {
                console.log('检测到RSS链接，直接解析...');
                const audioItems = await parseRSSFeed(url);
                if (audioItems && audioItems.length > 0) {
                    console.log('从RSS feed获取到音频链接');
                    return audioItems[0].audioUrl;
                }
            } catch (rssError) {
                console.log('直接RSS解析失败:', rssError.message);
            }
        }

        // 方法2: 尝试从页面获取内容
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        // 方法3: 如果响应是XML/RSS
        if (response.data.includes('<rss') || response.data.includes('<?xml')) {
            try {
                console.log('响应内容是RSS，解析...');
                const audioItems = await parseRSSFeed(url);
                if (audioItems && audioItems.length > 0) {
                    return audioItems[0].audioUrl;
                }
            } catch (xmlError) {
                console.log('XML解析失败:', xmlError.message);
            }
        }

        // 方法4: 查找各种可能的音频链接格式
        const patterns = [
            /(https?:\/\/[^"'\s]+\.(?:mp3|m4a|aac|wav|ogg)(?:\?[^"'\s]*)?)/i,
            /(?:src|href)=["']([^"']+\.(?:mp3|m4a|aac|wav|ogg)(?:\?[^"']*)?)/i,
            /"(https?:\/\/[^"]+(?:podcast|audio|media)[^"]*\.(?:mp3|m4a|aac))"/i,
            /<enclosure[^>]+url=["']([^"']+)["']/i
        ];

        for (const pattern of patterns) {
            const match = response.data.match(pattern);
            if (match) {
                console.log('从页面HTML中找到音频链接');
                return match[1];
            }
        }

        // 方法5: 尝试发现RSS feed
        try {
            const discoveredRSS = await discoverRSSFromPage(url);
            if (discoveredRSS) {
                console.log('发现RSS feed，解析...');
                const audioItems = await parseRSSFeed(discoveredRSS);
                if (audioItems && audioItems.length > 0) {
                    return audioItems[0].audioUrl;
                }
            }
        } catch (discoverError) {
            console.log('RSS发现失败:', discoverError.message);
        }

        throw new Error('无法找到音频链接 / Cannot find audio URL');

    } catch (error) {
        console.error('通用播客解析错误:', error);
        throw new Error(`通用播客音频解析失败: ${error.message}`);
    }
}

/**
 * 下载音频文件
 */
async function downloadAudioFile(audioUrl) {
    try {
        console.log(`开始下载音频文件: ${audioUrl}`);

        // 生成临时文件名
        const tempDir = path.join(__dirname, '../temp');
        const fileName = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const filePath = path.join(tempDir, fileName);

        // 下载文件
        const response = await axios({
            method: 'GET',
            url: audioUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 120000, // 120秒超时
            maxContentLength: 100 * 1024 * 1024, // 最大100MB
        });

        // 检查内容类型和长度
        const contentType = response.headers['content-type'];
        const contentLength = response.headers['content-length'];
        console.log(`内容类型: ${contentType}`);
        console.log(`内容长度: ${contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(2) + 'MB' : '未知'}`);
        
        // 预检查内容长度
        if (contentLength && parseInt(contentLength) < 1024) {
            throw new Error(`音频文件太小(${contentLength}字节)，可能不是有效的音频文件或链接已过期`);
        }

        // 确定文件扩展名
        let extension = '.mp3'; // 默认
        if (contentType) {
            if (contentType.includes('mp4') || contentType.includes('m4a')) {
                extension = '.m4a';
            } else if (contentType.includes('wav')) {
                extension = '.wav';
            } else if (contentType.includes('aac')) {
                extension = '.aac';
            }
        }

        const finalFilePath = filePath + extension;

        // 写入文件
        const writer = fs.createWriteStream(finalFilePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`音频文件下载完成: ${finalFilePath}`);
                
                // 检查文件大小
                const stats = fs.statSync(finalFilePath);
                const fileSizeMB = stats.size / 1024 / 1024;
                console.log(`文件大小: ${fileSizeMB.toFixed(2)}MB`);
                
                // 验证文件是否有效（至少应该有一些内容）
                if (stats.size < 1024) { // 小于1KB可能不是有效的音频文件
                    fs.unlinkSync(finalFilePath); // 删除无效文件
                    reject(new Error(`下载的文件太小(${stats.size}字节)，可能不是有效的音频文件。可能是链接过期或需要特殊认证。`));
                    return;
                }
                
                resolve(finalFilePath);
            });
            
            writer.on('error', (error) => {
                console.error('文件写入错误:', error);
                reject(error);
            });
            
            // 超时处理
            setTimeout(() => {
                writer.destroy();
                reject(new Error('下载超时 / Download timeout'));
            }, 180000); // 180秒超时（3分钟）
        });

    } catch (error) {
        console.error('下载音频文件错误:', error);
        
        // 不再使用假音频备用方案
        
        throw new Error(`下载失败: ${error.message} / Download failed: ${error.message}`);
    }
}

module.exports = {
    downloadPodcastAudio,
    extractAudioUrl,
    downloadAudioFile
};
