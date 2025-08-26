// 双语内容配置
const translations = {
    zh: {
        title: "Podcast提取器",
        subtitle: "只需提供Podcast音频链接，即可获得高质量的文字转录和AI智能总结",
        urlLabel: "Podcast音频链接",
        urlHelper: "支持 Apple Podcasts、小宇宙、RSS订阅源和直接音频链接",
        operationLabel: "操作类型",
        option1Title: "转录并总结",
        option1Desc: "获得转录文本和AI总结",
        option2Title: "仅转录",
        option2Desc: "只获得转录文本",
        audioLangLabel: "音频语言",
        outputLangLabel: "总结语言",
        autoDetect: "自动检测",
        chineseOption: "中文",
        englishOption: "English",
        submitText: "🚀 开始处理",
        resultsTitle: "处理结果",
        transcriptTitle: "转录文本",
        summaryTitle: "AI总结",
        loadingText: "正在处理您的播客...",
        errorText: "处理过程中出现错误",
        estimatedTime: "预计需要 10-15 分钟...",
        processingTips: "处理中，请耐心等待：",
        tipKeepOpen: "页面请保持打开状态",
        tipLargeFile: "大文件需要更长时间处理",
        tipAutoShow: "处理完成后会自动显示结果",
        stepDownload: "下载音频文件",
        stepTranscribe: "AI语音转录中...",
        stepSummarize: "生成智能总结",
        processingComplete: "处理完成！",
        remainingTime: "预计还需",
        minutes: "分钟",
        almostDone: "即将完成...",
        langFlag: "🇨🇳",
        langText: "中文"
    },
    en: {
        title: "Podcast Transcriber",
        subtitle: "Just provide a podcast audio link to get high-quality transcription and AI-powered summary",
        urlLabel: "Podcast Audio Link",
        urlHelper: "Supports Apple Podcasts, RSS feeds, Xiaoyuzhou, and direct audio links",
        operationLabel: "Operation Type",
        option1Title: "Transcribe & Summarize",
        option1Desc: "Get transcription and AI summary",
        option2Title: "Transcribe Only",
        option2Desc: "Get transcription text only",
        audioLangLabel: "Audio Language",
        outputLangLabel: "Summary Language",
        autoDetect: "Auto Detect",
        chineseOption: "Chinese",
        englishOption: "English",
        submitText: "🚀 Start Processing",
        resultsTitle: "Results",
        transcriptTitle: "Transcript",
        summaryTitle: "AI Summary",
        loadingText: "Processing your podcast...",
        errorText: "An error occurred during processing",
        estimatedTime: "Estimated 10-15 minutes...",
        processingTips: "Processing, please wait patiently:",
        tipKeepOpen: "Keep this page open",
        tipLargeFile: "Large files require more processing time",
        tipAutoShow: "Results will display automatically when complete",
        stepDownload: "Download audio file",
        stepTranscribe: "AI transcription in progress...",
        stepSummarize: "Generate smart summary",
        processingComplete: "Processing complete!",
        remainingTime: "Estimated",
        minutes: "minutes remaining",
        almostDone: "Almost done...",
        langFlag: "🇺🇸",
        langText: "English"
    }
};

// 检测浏览器语言设置
function detectBrowserLanguage() {
    // 尝试从localStorage获取用户之前的选择
    const savedLang = localStorage.getItem('podcast-transcriber-language');
    if (savedLang && (savedLang === 'zh' || savedLang === 'en')) {
        return savedLang;
    }
    
    // 检测浏览器语言
    const browserLang = navigator.language || navigator.userLanguage || 'en';
    
    // 如果是中文（包括简体、繁体、香港、台湾等），返回中文
    if (browserLang.toLowerCase().startsWith('zh')) {
        return 'zh';
    }
    
    // 默认返回英文
    return 'en';
}

// 当前语言状态 - 根据浏览器语言自动检测
let currentLang = detectBrowserLanguage();

// 语言切换功能
function toggleLanguage() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    
    // 保存用户的语言选择
    localStorage.setItem('podcast-transcriber-language', currentLang);
    
    updateUI();
    updateLanguageToggle();
    
    // 更新HTML lang属性
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
}

// 更新UI文本
function updateUI() {
    const texts = translations[currentLang];
    
    // 更新所有文本元素
    Object.keys(texts).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            if (key === 'autoDetect' || key === 'chineseOption' || key === 'englishOption') {
                element.textContent = texts[key];
            } else {
                element.textContent = texts[key];
            }
        }
    });
    
    // 更新placeholder
    const urlInput = document.getElementById('podcastUrl');
    urlInput.placeholder = currentLang === 'zh' 
        ? 'https://example.com/podcast/episode'
        : 'https://example.com/podcast/example';
    
    // 更新进度页面的文本元素
    const progressElements = {
        'stepDownloadText': 'stepDownload',
        'stepTranscribeText': 'stepTranscribe', 
        'stepSummarizeText': 'stepSummarize',
        'processingTipsText': 'processingTips',
        'tipLargeFileText': 'tipLargeFile',
        'tipKeepOpenText': 'tipKeepOpen',
        'tipAutoShowText': 'tipAutoShow'
    };
    
    Object.keys(progressElements).forEach(elementId => {
        const element = document.getElementById(elementId);
        const textKey = progressElements[elementId];
        if (element && texts[textKey]) {
            element.textContent = texts[textKey];
        }
    });
    
    // 如果进度条在显示中，更新预计时间文本
    const estimatedTime = document.getElementById('estimatedTime');
    if (estimatedTime && !estimatedTime.textContent.includes('%')) {
        // 只在不是具体时间时更新（避免覆盖动态时间）
        if (estimatedTime.textContent.includes('预计需要') || estimatedTime.textContent.includes('Estimated')) {
            estimatedTime.textContent = texts.estimatedTime;
        } else if (estimatedTime.textContent.includes('完成') || estimatedTime.textContent.includes('complete')) {
            estimatedTime.textContent = texts.processingComplete;
        } else if (estimatedTime.textContent.includes('即将') || estimatedTime.textContent.includes('Almost')) {
            estimatedTime.textContent = texts.almostDone;
        }
    }
    
    // 如果有下载按钮显示，重新生成以更新语言
    const downloadSection = document.getElementById('downloadSection');
    if (downloadSection && !downloadSection.classList.contains('hidden')) {
        // 获取当前的savedFiles数据并重新生成下载按钮
        updateDownloadButtonsLanguage();
    }
}

// 表单提交处理
async function processPodcast(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const data = {
        url: formData.get('podcastUrl') || document.getElementById('podcastUrl').value,
        operation: formData.get('operation'),
        audioLanguage: document.getElementById('audioLanguage').value,
        outputLanguage: document.getElementById('outputLanguage').value
    };
    
    console.log('Processing podcast with data:', data);
    
    // 显示结果区域和加载状态
    showResults();
    showLoadingWithProgress();
    
    try {
        // 调用后端API，设置15分钟超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15 * 60 * 1000); // 15分钟超时
        
        // 启动进度模拟
        startProgressSimulation();
        
        const response = await fetch('/api/process-podcast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 停止进度模拟
        stopProgressSimulation();
        
        if (result.success) {
            showResultsContent(result.data, data.operation);
        } else {
            showError(result.error || 'Unknown error occurred');
        }
        
    } catch (error) {
        console.error('Error processing podcast:', error);
        stopProgressSimulation();
        
        if (error.name === 'AbortError') {
            // 超时后检查是否有文件已生成
            console.log('🔄 检测到超时，正在检查处理结果...');
            await checkForCompletedFiles();
        } else {
            showError(error.message);
        }
    }
}

// 检查是否有已完成的文件
async function checkForCompletedFiles() {
    try {
        // 显示检查状态
        showLoadingWithProgress();
        updateProgressText('正在检查处理结果... / Checking processing results...', '验证文件完整性 / Verifying file integrity');
        
        // 获取temp目录中的文件列表
        const response = await fetch('/api/temp-files');
        if (!response.ok) {
            throw new Error('无法获取文件列表');
        }
        
        const result = await response.json();
        
        // 查找最新的转录和总结文件
        const allFiles = result.files || [];
        const transcriptFiles = allFiles.filter(f => f.filename.includes('_transcript.md'));
        const summaryFiles = allFiles.filter(f => f.filename.includes('_summary.md'));
        
        if (transcriptFiles.length > 0) {
            // 找到了转录文件，构造成功响应
            const latestTranscript = transcriptFiles[transcriptFiles.length - 1];
            const latestSummary = summaryFiles.find(f => 
                f.filename.startsWith(latestTranscript.filename.split('_transcript')[0])
            );
            
            // 读取文件内容
            const transcriptContent = await fetchFileContent(latestTranscript.filename);
            
            const mockResult = {
                transcript: transcriptContent,
                summary: latestSummary ? await fetchFileContent(latestSummary.filename) : null,
                language: 'zh',
                savedFiles: [
                    {
                        type: 'transcript',
                        filename: latestTranscript.filename,
                        size: latestTranscript.size
                    }
                ]
            };
            
            if (latestSummary) {
                mockResult.savedFiles.push({
                    type: 'summary', 
                    filename: latestSummary.filename,
                    size: latestSummary.size
                });
            }
            
            stopProgressSimulation();
            
            // 显示成功结果
            const operation = latestSummary ? 'transcribe_summarize' : 'transcribe_only';
            showResultsContent(mockResult, operation);
            
            // 显示成功消息
            const successMsg = currentLang === 'zh' ? 
                '✅ 检测到处理已完成！文件已成功生成。' : 
                '✅ Processing completed! Files generated successfully.';
            console.log(successMsg);
            
        } else {
            // 没有找到文件，显示真正的超时错误
            showError('处理超时，请检查网络连接或稍后重试 / Processing timeout, please check network or retry later');
        }
        
    } catch (error) {
        console.error('检查文件时出错:', error);
        showError('处理超时，请检查网络连接或稍后重试 / Processing timeout, please check network or retry later');
    }
}

// 获取文件内容
async function fetchFileContent(filename) {
    try {
        const response = await fetch(`/api/download/${filename}`);
        if (!response.ok) {
            throw new Error(`无法读取文件: ${filename}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`读取文件 ${filename} 失败:`, error);
        return '文件内容读取失败';
    }
}

// 显示结果区域
function showResults() {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// 显示加载状态
function showLoading() {
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('resultsContent').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    
    // 禁用提交按钮
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
}

// 显示带进度的加载状态
function showLoadingWithProgress() {
    showLoading();
    
    // 重置进度条
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const estimatedTime = document.getElementById('estimatedTime');
    
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
    }
    
    if (progressText) {
        progressText.textContent = '0%';
    }
    
    if (estimatedTime) {
        estimatedTime.textContent = translations[currentLang].estimatedTime;
    }
}

// 进度模拟变量
let progressInterval = null;
let currentProgress = 0;

// 启动进度模拟
function startProgressSimulation() {
    currentProgress = 0;
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const estimatedTime = document.getElementById('estimatedTime');
    
    progressInterval = setInterval(() => {
        // 模拟进度增长：前期快速增长，后期缓慢
        if (currentProgress < 20) {
            currentProgress += Math.random() * 3; // 0-20%: 快速
        } else if (currentProgress < 60) {
            currentProgress += Math.random() * 1.5; // 20-60%: 中等
        } else if (currentProgress < 85) {
            currentProgress += Math.random() * 0.8; // 60-85%: 缓慢
        } else if (currentProgress < 95) {
            currentProgress += Math.random() * 0.3; // 85-95%: 很缓慢
        }
        
        // 确保不超过95%（留最后5%给实际完成）
        currentProgress = Math.min(currentProgress, 95);
        
        // 更新UI
        if (progressBar) {
            progressBar.style.width = `${currentProgress}%`;
            progressBar.setAttribute('aria-valuenow', Math.floor(currentProgress));
        }
        
        if (progressText) {
            progressText.textContent = `${Math.floor(currentProgress)}%`;
        }
        
        // 更新预计时间
        if (estimatedTime) {
            const remaining = Math.max(1, Math.floor((100 - currentProgress) * 0.15)); // 假设每1%需要0.15分钟
            if (remaining > 1) {
                estimatedTime.textContent = `${translations[currentLang].remainingTime} ${remaining} ${translations[currentLang].minutes}...`;
            } else {
                estimatedTime.textContent = translations[currentLang].almostDone;
            }
        }
    }, 1000); // 每秒更新一次
}

// 停止进度模拟
function stopProgressSimulation() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    // 设置为100%完成
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const estimatedTime = document.getElementById('estimatedTime');
    
    if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.setAttribute('aria-valuenow', '100');
    }
    
    if (progressText) {
        progressText.textContent = '100%';
    }
    
    if (estimatedTime) {
        estimatedTime.textContent = translations[currentLang].processingComplete;
    }
}

// 显示结果内容
function showResultsContent(data, operation = 'transcribe_only') {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('resultsContent').classList.remove('hidden');
    
    // 获取区域元素
    const transcriptSection = document.getElementById('transcriptSection');
    const summarySection = document.getElementById('summarySection');
    
    // 显示转录文本（Markdown渲染）
    const transcriptText = document.getElementById('transcriptText');
    const transcript = data.transcript || 'No transcript available';
    transcriptText.innerHTML = marked.parse(transcript);
    
    // 显示总结（如果有）
    const summaryText = document.getElementById('summaryText');
    
    if (data.summary) {
        summarySection.classList.remove('hidden');
        summaryText.innerHTML = marked.parse(data.summary);
    } else {
        summarySection.classList.add('hidden');
    }
    
    // 根据操作模式调整显示顺序
    const downloadSection = document.getElementById('downloadSection');
    
    if (operation === 'transcribe_summarize' && data.summary) {
        // 转录+总结模式：下载 → 总结 → 转录
        downloadSection.style.order = '1';
        summarySection.style.order = '2';
        transcriptSection.style.order = '3';
        const orderMsg = currentLang === 'zh' ? 
            '📋 显示顺序：下载 → AI总结 → 转录文本' : 
            '📋 Display order: Download → AI Summary → Transcript';
        console.log(orderMsg);
    } else {
        // 仅转录模式：下载 → 转录（AI总结区域隐藏，不参与排序）
        downloadSection.style.order = '1';
        transcriptSection.style.order = '2';
        // summarySection 已被隐藏，不需要设置order
        const orderMsg = currentLang === 'zh' ? 
            '📝 显示顺序：下载 → 转录文本' : 
            '📝 Display order: Download → Transcript';
        console.log(orderMsg);
    }
    
    // 显示下载按钮（如果有保存的文件）
    showDownloadButtons(data.savedFiles || []);
    
    // 重新启用提交按钮
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
}

// 显示错误状态
function showError(errorMessage) {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('resultsContent').classList.add('hidden');
    document.getElementById('errorState').classList.remove('hidden');
    
    const errorDetails = document.getElementById('errorDetails');
    errorDetails.textContent = errorMessage;
    
    // 重新启用提交按钮
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
}

// 验证播客链接格式
function validatePodcastUrl(url) {
    // Apple Podcasts URL pattern
    const applePodcastsPattern = /^https:\/\/podcasts\.apple\.com\//;
    // 小宇宙 URL pattern (修正域名)
    const xiaoyuzhouPattern = /^https:\/\/(www\.)?xiaoyuzhoufm\.com\//;
    // 通用音频文件URL
    const audioFilePattern = /\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i;
    
    return applePodcastsPattern.test(url) || 
           xiaoyuzhouPattern.test(url) || 
           audioFilePattern.test(url) ||
           url.includes('podcast') ||
           url.includes('audio');
}

// 表单验证
document.getElementById('podcastUrl').addEventListener('input', function(e) {
    const url = e.target.value;
    if (url && !validatePodcastUrl(url)) {
        e.target.setCustomValidity(currentLang === 'zh' 
            ? '请输入有效的播客链接' 
            : 'Please enter a valid podcast link');
    } else {
        e.target.setCustomValidity('');
    }
});

// 监听操作类型变化的函数（将在主初始化中调用）
function setupOperationTypeListeners() {
    const operationRadios = document.querySelectorAll('input[name="operation"]');
    operationRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const outputLanguageContainer = document.getElementById('outputLanguage').closest('div');
            if (this.value === 'transcribe_only') {
                outputLanguageContainer.style.opacity = '0.5';
                document.getElementById('outputLanguage').disabled = true;
            } else {
                outputLanguageContainer.style.opacity = '1';
                document.getElementById('outputLanguage').disabled = false;
            }
        });
    });
}

// 显示下载按钮
function showDownloadButtons(savedFiles) {
    const downloadSection = document.getElementById('downloadSection');
    const downloadButtons = document.getElementById('downloadButtons');
    
    if (!savedFiles || savedFiles.length === 0) {
        downloadSection.classList.add('hidden');
        return;
    }
    
    // 清空之前的链接
    downloadButtons.innerHTML = '';
    
    // 为每个保存的文件创建下载链接（过滤掉原始转录）
    savedFiles.forEach(file => {
        // 只显示优化后的转录和AI总结，不显示原始转录
        if (file.type === 'original_transcript') {
            return; // 跳过原始转录文件
        }
        
        const link = document.createElement('a');
        link.href = `/api/download/${file.filename}`;
        link.download = file.filename;
        link.className = 'text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors font-medium';
        
        const nameMap = {
            'transcript': currentLang === 'zh' ? '转录文本' : 'Transcript',
            'summary': currentLang === 'zh' ? 'AI总结' : 'AI Summary'
        };
        
        const downloadText = currentLang === 'zh' ? '下载' : 'Download';
        const fileName = nameMap[file.type] || file.type;
        const sizeText = formatFileSize(file.size);
        
        link.textContent = `${downloadText} ${fileName} (${sizeText})`;
        
        downloadButtons.appendChild(link);
    });
    
    // 显示下载区域
    downloadSection.classList.remove('hidden');
}

// 更新下载按钮的语言
function updateDownloadButtonsLanguage() {
    const downloadButtons = document.getElementById('downloadButtons');
    if (!downloadButtons) return;
    
    // 从现有链接中提取文件信息
    const links = downloadButtons.querySelectorAll('a[download]');
    const savedFiles = [];
    
    links.forEach(link => {
        const filename = link.getAttribute('download');
        const linkText = link.textContent;
        
        // 根据文件名判断类型
        let type = 'unknown';
        if (filename.includes('_transcript.')) {
            type = 'transcript';
        } else if (filename.includes('_summary.')) {
            type = 'summary';
        }
        
        // 从链接文本中提取文件大小（提取括号中的内容）
        let size = 0;
        const sizeMatch = linkText.match(/\((\d+\.?\d*)\s*(KB|MB|GB)\)/);
        if (sizeMatch) {
            const value = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2];
            if (unit === 'KB') size = value * 1024;
            else if (unit === 'MB') size = value * 1024 * 1024;
            else if (unit === 'GB') size = value * 1024 * 1024 * 1024;
        }
        
        savedFiles.push({
            filename: filename,
            type: type,
            size: size
        });
    });
    
    // 重新生成下载链接
    if (savedFiles.length > 0) {
        showDownloadButtons(savedFiles);
    }
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 语言切换功能已在上方定义，此处移除重复

// 更新语言切换按钮
function updateLanguageToggle() {
    const toggle = document.getElementById('languageToggle');
    const texts = translations[currentLang];
    if (toggle && texts) {
        toggle.innerHTML = `<span class="mr-2">${texts.langFlag}</span>${texts.langText}`;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 设置正确的语言属性
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
    
    // 根据浏览器语言设置总结语言的默认值
    const outputLanguageSelect = document.getElementById('outputLanguage');
    if (outputLanguageSelect) {
        outputLanguageSelect.value = currentLang; // 使用浏览器检测的语言
    }
    
    updateUI();
    updateLanguageToggle();
    
    // 设置操作类型监听器
    setupOperationTypeListeners();
});

// 移除了自动检查已完成文件的功能，让用户每次都有干净的开始
