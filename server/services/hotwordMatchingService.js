/**
 * 专业热词匹配服务
 * 根据主题加载对应热词库并匹配文本中的专业术语
 */

const fs = require('fs').promises;
const path = require('path');

// 热词库缓存
const hotwordCache = new Map();

/**
 * 加载热词库
 */
async function loadHotwordDatabase(domain) {
    // 检查缓存
    if (hotwordCache.has(domain)) {
        return hotwordCache.get(domain);
    }
    
    try {
        // 根据主题映射到文件
        const domainFileMap = {
            '科技': 'tech-ai.json',
            '人工智能': 'tech-ai.json',
            'AI': 'tech-ai.json',
            '商业': 'business.json',
            '创业': 'business.json',
            '投资': 'business.json',
            '教育': 'education.json',
            '职场': 'education.json',
            '学习': 'education.json'
        };
        
        const filename = domainFileMap[domain] || 'tech-ai.json'; // 默认使用AI词库
        const filepath = path.join(__dirname, '..', 'data', 'hotwords', filename);
        
        const data = await fs.readFile(filepath, 'utf-8');
        const hotwords = JSON.parse(data);
        
        // 缓存
        hotwordCache.set(domain, hotwords);
        
        console.log(`✅ 加载热词库: ${hotwords.domain} (${hotwords.terms.length}个术语)`);
        return hotwords;
    } catch (error) {
        console.error(`❌ 加载热词库失败: ${error.message}`);
        return null;
    }
}

/**
 * 构建热词搜索模式
 */
function buildSearchPatterns(hotwords) {
    const patterns = [];
    
    for (const term of hotwords.terms) {
        // 添加主要术语
        patterns.push({
            pattern: term.english,
            term: term,
            type: 'english'
        });
        
        patterns.push({
            pattern: term.chinese,
            term: term,
            type: 'chinese'
        });
        
        // 添加变体
        if (term.variants) {
            for (const variant of term.variants) {
                patterns.push({
                    pattern: variant,
                    term: term,
                    type: 'variant'
                });
            }
        }
    }
    
    // 按长度降序排序，优先匹配长词
    patterns.sort((a, b) => b.pattern.length - a.pattern.length);
    
    return patterns;
}

/**
 * 在文本中查找热词
 */
function findHotwordsInText(text, patterns) {
    const foundTerms = new Map(); // 使用Map去重
    const matches = [];
    
    // 转换为小写进行匹配（保留原始大小写用于显示）
    const lowerText = text.toLowerCase();
    
    for (const patternObj of patterns) {
        const pattern = patternObj.pattern.toLowerCase();
        let startIndex = 0;
        
        // 查找所有出现位置
        while (true) {
            const index = lowerText.indexOf(pattern, startIndex);
            if (index === -1) break;
            
            // 检查是否是完整的词（避免部分匹配）
            const beforeChar = index > 0 ? lowerText[index - 1] : ' ';
            const afterChar = index + pattern.length < lowerText.length ? 
                             lowerText[index + pattern.length] : ' ';
            
            // 中文不需要词边界检查，英文需要
            const isChinesePattern = /[\u4e00-\u9fa5]/.test(pattern);
            const isWordBoundary = isChinesePattern || 
                                  (!isAlphanumeric(beforeChar) && !isAlphanumeric(afterChar));
            
            if (isWordBoundary) {
                const match = {
                    term: patternObj.term.english || patternObj.term.chinese,
                    chinese: patternObj.term.chinese,
                    english: patternObj.term.english,
                    matchedText: text.substring(index, index + pattern.length),
                    position: index,
                    length: pattern.length,
                    type: patternObj.type
                };
                
                matches.push(match);
                
                // 记录找到的术语（去重）
                const termKey = `${patternObj.term.english}-${patternObj.term.chinese}`;
                if (!foundTerms.has(termKey)) {
                    foundTerms.set(termKey, patternObj.term);
                }
            }
            
            startIndex = index + 1;
        }
    }
    
    return {
        matches: matches,
        uniqueTerms: Array.from(foundTerms.values())
    };
}

/**
 * 在带时间戳的片段中查找热词
 */
function findHotwordsInSegments(segments, patterns) {
    const allMatches = [];
    const termOccurrences = new Map(); // 记录每个术语出现的时间点
    
    for (const segment of segments) {
        const { matches, uniqueTerms } = findHotwordsInText(segment.text, patterns);
        
        // 为每个匹配添加时间戳
        for (const match of matches) {
            const enhancedMatch = {
                ...match,
                timestamp: formatTime(segment.start),
                startTime: segment.start,
                endTime: segment.end,
                segmentText: segment.text
            };
            
            allMatches.push(enhancedMatch);
            
            // 记录术语出现的时间点
            const termKey = `${match.english}-${match.chinese}`;
            if (!termOccurrences.has(termKey)) {
                termOccurrences.set(termKey, {
                    term: match.english || match.chinese,
                    chinese: match.chinese,
                    english: match.english,
                    timestamps: []
                });
            }
            termOccurrences.get(termKey).timestamps.push(formatTime(segment.start));
        }
    }
    
    // 转换为数组并排序
    const hotwordSummary = Array.from(termOccurrences.values()).map(item => ({
        ...item,
        count: item.timestamps.length,
        timestamps: [...new Set(item.timestamps)] // 去重时间戳
    })).sort((a, b) => b.count - a.count); // 按出现次数排序
    
    return {
        matches: allMatches,
        summary: hotwordSummary,
        totalMatches: allMatches.length,
        uniqueTermCount: termOccurrences.size
    };
}

/**
 * 步骤4主函数：执行热词匹配
 */
async function matchHotwords(transcript, segments, topic) {
    console.log(`🔍 开始热词匹配 (主题: ${topic.mainTopic})`);
    
    // 加载对应领域的热词库
    const hotwords = await loadHotwordDatabase(topic.mainTopic);
    if (!hotwords) {
        console.log('⚠️ 无法加载热词库');
        return {
            matches: [],
            summary: [],
            totalMatches: 0,
            uniqueTermCount: 0
        };
    }
    
    // 构建搜索模式
    const patterns = buildSearchPatterns(hotwords);
    console.log(`📋 准备匹配 ${patterns.length} 个模式`);
    
    // 在片段中查找热词
    const result = findHotwordsInSegments(segments, patterns);
    
    console.log(`✅ 热词匹配完成: 找到 ${result.uniqueTermCount} 个独特术语, 共 ${result.totalMatches} 处匹配`);
    
    // 输出前10个高频术语
    if (result.summary.length > 0) {
        console.log('📊 高频专业术语:');
        result.summary.slice(0, 10).forEach((term, idx) => {
            console.log(`  ${idx + 1}. ${term.chinese || term.english} (${term.count}次)`);
        });
    }
    
    return result;
}

/**
 * 为章节匹配热词
 */
async function matchHotwordsForChapters(chapters, segments, topic) {
    console.log(`📚 为 ${chapters.length} 个章节匹配热词`);
    
    // 加载热词库
    const hotwords = await loadHotwordDatabase(topic.mainTopic);
    if (!hotwords) {
        return chapters; // 返回原始章节
    }
    
    const patterns = buildSearchPatterns(hotwords);
    const enhancedChapters = [];
    
    for (const chapter of chapters) {
        // 提取章节对应的片段
        const chapterSegments = extractChapterSegments(
            segments,
            chapter.start,
            chapter.end
        );
        
        // 匹配热词
        const hotwordResult = findHotwordsInSegments(chapterSegments, patterns);
        
        // 增强章节数据
        enhancedChapters.push({
            ...chapter,
            hotwords: hotwordResult.summary.slice(0, 10), // 前10个高频术语
            hotwordCount: hotwordResult.uniqueTermCount,
            professionalDensity: calculateProfessionalDensity(
                chapterSegments,
                hotwordResult.totalMatches
            )
        });
    }
    
    return enhancedChapters;
}

/**
 * 计算专业术语密度
 */
function calculateProfessionalDensity(segments, matchCount) {
    const totalWords = segments.reduce((sum, seg) => {
        // 简单的中英文分词统计
        const chineseChars = (seg.text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = (seg.text.match(/[a-zA-Z]+/g) || []).length;
        return sum + chineseChars + englishWords;
    }, 0);
    
    if (totalWords === 0) return 0;
    
    // 计算每百词的专业术语数
    return Math.round((matchCount / totalWords) * 100 * 10) / 10;
}

/**
 * 辅助函数
 */
function isAlphanumeric(char) {
    return /[a-zA-Z0-9]/.test(char);
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function timeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
}

function extractChapterSegments(segments, startTime, endTime) {
    const startSec = typeof startTime === 'string' ? timeToSeconds(startTime) : startTime;
    const endSec = typeof endTime === 'string' ? timeToSeconds(endTime) : endTime;
    
    return segments.filter(seg => {
        return seg.start >= startSec && seg.end <= endSec;
    });
}

/**
 * 获取所有可用的热词库列表
 */
async function getAvailableHotwordDatabases() {
    try {
        const hotwordsDir = path.join(__dirname, '..', 'data', 'hotwords');
        const files = await fs.readdir(hotwordsDir);
        const databases = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filepath = path.join(hotwordsDir, file);
                const data = await fs.readFile(filepath, 'utf-8');
                const db = JSON.parse(data);
                databases.push({
                    filename: file,
                    domain: db.domain,
                    termCount: db.terms.length,
                    version: db.version
                });
            }
        }
        
        return databases;
    } catch (error) {
        console.error('获取热词库列表失败:', error);
        return [];
    }
}

module.exports = {
    loadHotwordDatabase,
    matchHotwords,
    matchHotwordsForChapters,
    findHotwordsInText,
    findHotwordsInSegments,
    getAvailableHotwordDatabases
};