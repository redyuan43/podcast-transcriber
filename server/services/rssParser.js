const axios = require('axios');
const xml2js = require('xml2js');

/**
 * RSS解析服务
 * 专门处理播客RSS feeds
 */

/**
 * 解析RSS feed并提取音频链接
 * @param {string} rssUrl - RSS feed URL
 * @returns {Promise<Object[]>} 音频项目数组
 */
async function parseRSSFeed(rssUrl) {
    try {
        console.log(`解析RSS feed: ${rssUrl}`);
        
        const response = await axios.get(rssUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 0, // 无超时限制
            maxContentLength: Infinity, // 无大小限制
            maxBodyLength: Infinity
        });

        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
        
        // 检查RSS结构
        const channel = result.rss?.channel?.[0] || result.feed;
        if (!channel) {
            throw new Error('无效的RSS格式');
        }

        const items = channel.item || channel.entry || [];
        const audioItems = [];

        for (const item of items) {
            const audioItem = extractAudioFromRSSItem(item);
            if (audioItem) {
                audioItems.push(audioItem);
            }
        }

        console.log(`从RSS中提取到 ${audioItems.length} 个音频项目`);
        return audioItems;

    } catch (error) {
        console.error('RSS解析错误:', error);
        throw new Error(`RSS解析失败: ${error.message}`);
    }
}

/**
 * 从RSS项目中提取音频信息
 * @param {Object} item - RSS项目
 * @returns {Object|null} 音频信息
 */
function extractAudioFromRSSItem(item) {
    try {
        // 提取标题
        const title = extractText(item.title);
        
        // 提取描述
        const description = extractText(item.description) || extractText(item.summary);
        
        // 提取音频URL - 支持多种RSS格式
        let audioUrl = null;
        
        // 方式1: enclosure标签 (最常见)
        if (item.enclosure && item.enclosure[0] && item.enclosure[0].$.url) {
            audioUrl = item.enclosure[0].$.url;
        }
        
        // 方式2: media:content (iTunes/Spotify)
        if (!audioUrl && item['media:content']) {
            const mediaContent = item['media:content'][0];
            if (mediaContent && mediaContent.$.url) {
                audioUrl = mediaContent.$.url;
            }
        }
        
        // 方式3: link标签直接指向音频
        if (!audioUrl && item.link) {
            const link = extractText(item.link);
            if (link && isAudioFile(link)) {
                audioUrl = link;
            }
        }
        
        // 方式4: guid如果是音频链接
        if (!audioUrl && item.guid) {
            const guid = extractText(item.guid);
            if (guid && isAudioFile(guid)) {
                audioUrl = guid;
            }
        }

        if (!audioUrl) {
            return null;
        }

        return {
            title: title || 'Untitled',
            description: description || '',
            audioUrl: audioUrl,
            pubDate: extractText(item.pubDate) || extractText(item.published)
        };

    } catch (error) {
        console.warn('解析RSS项目失败:', error);
        return null;
    }
}

/**
 * 提取文本内容（处理CDATA等）
 */
function extractText(textNode) {
    if (!textNode) return null;
    
    if (typeof textNode === 'string') {
        return textNode.trim();
    }
    
    if (Array.isArray(textNode) && textNode.length > 0) {
        return extractText(textNode[0]);
    }
    
    if (typeof textNode === 'object' && textNode._) {
        return textNode._.trim();
    }
    
    return null;
}

/**
 * 检查是否为音频文件链接
 */
function isAudioFile(url) {
    if (!url || typeof url !== 'string') return false;
    
    const audioExtensions = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.wma'];
    const lowerUrl = url.toLowerCase();
    
    return audioExtensions.some(ext => lowerUrl.includes(ext)) || 
           lowerUrl.includes('audio') || 
           lowerUrl.includes('podcast');
}

/**
 * 尝试从播客页面URL构建RSS URL
 * @param {string} pageUrl - 播客页面URL
 * @returns {Promise<string|null>} RSS URL
 */
async function discoverRSSFromPage(pageUrl) {
    try {
        console.log(`尝试从页面发现RSS: ${pageUrl}`);
        
        const response = await axios.get(pageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 0 // 无超时限制
        });

        const html = response.data;
        
        // 查找RSS链接的常见模式
        const rssPatterns = [
            /<link[^>]*type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["']/i,
            /<link[^>]*href=["']([^"']*rss[^"']*)["']/i,
            /<link[^>]*href=["']([^"']*feed[^"']*)["']/i,
            /href=["']([^"']*\.xml)["']/i
        ];

        for (const pattern of rssPatterns) {
            const match = html.match(pattern);
            if (match) {
                let rssUrl = match[1];
                
                // 处理相对URL
                if (rssUrl.startsWith('/')) {
                    const baseUrl = new URL(pageUrl);
                    rssUrl = `${baseUrl.protocol}//${baseUrl.host}${rssUrl}`;
                }
                
                console.log(`发现RSS链接: ${rssUrl}`);
                return rssUrl;
            }
        }

        return null;

    } catch (error) {
        console.error('RSS发现失败:', error);
        return null;
    }
}

/**
 * 小宇宙专用RSS获取
 * @param {string} episodeUrl - 小宇宙剧集URL
 * @returns {Promise<string|null>} RSS URL
 */
async function getXiaoyuzhouRSS(episodeUrl) {
    try {
        // 从URL中提取节目信息
        const episodeIdMatch = episodeUrl.match(/episode\/([a-f0-9]+)/);
        if (!episodeIdMatch) {
            throw new Error('无法从URL中提取剧集ID');
        }

        const episodeId = episodeIdMatch[1];
        console.log(`小宇宙剧集ID: ${episodeId}`);

        // 尝试获取剧集API信息
        const apiUrl = `https://api.xiaoyuzhoufm.com/v1/episode/${episodeId}`;
        
        try {
            const response = await axios.get(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                timeout: 0 // 无超时限制
            });

            // 如果API返回了音频信息
            if (response.data && response.data.media && response.data.media.source) {
                return response.data.media.source.url;
            }

        } catch (apiError) {
            console.log('小宇宙API调用失败，尝试其他方法');
        }

        // 尝试构建RSS URL（基于常见模式）
        const podcastIdMatch = episodeUrl.match(/xiaoyuzhoufm\.com\/podcast\/([^\/]+)/);
        if (podcastIdMatch) {
            const podcastId = podcastIdMatch[1];
            const rssUrl = `https://www.xiaoyuzhoufm.com/podcast/${podcastId}/rss`;
            console.log(`尝试小宇宙RSS: ${rssUrl}`);
            return rssUrl;
        }

        return null;

    } catch (error) {
        console.error('小宇宙RSS获取失败:', error);
        return null;
    }
}

module.exports = {
    parseRSSFeed,
    discoverRSSFromPage,
    getXiaoyuzhouRSS,
    extractAudioFromRSSItem
};
