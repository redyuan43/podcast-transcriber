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
        translationTitle: "翻译",
        loadingText: "正在处理您的播客...",
        errorText: "处理过程中出现错误",
        estimatedTime: "预计需要 3-8 分钟...",
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
        translationTitle: "Translation",
        loadingText: "Processing your podcast...",
        errorText: "An error occurred during processing",
        estimatedTime: "Estimated 3-8 minutes...",
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
    
    // 进度条现在由智能进度条系统统一管理，无需在此处更新
    
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
    
    // 生成唯一的会话ID
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const data = {
        url: formData.get('podcastUrl') || document.getElementById('podcastUrl').value,
        operation: formData.get('operation'),
        audioLanguage: document.getElementById('audioLanguage').value,
        outputLanguage: document.getElementById('outputLanguage').value,
        sessionId: sessionId
    };
    
    console.log('Processing podcast with data:', data);
    
    // 显示结果区域和加载状态
    showResults();
    showLoadingWithProgress();
    
    // 建立SSE连接接收进度更新
    let eventSource = null;
    try {
        eventSource = new EventSource(`/api/progress/${sessionId}`);
        setupProgressListener(eventSource);
    } catch (sseError) {
        console.warn('SSE连接失败，使用模拟进度:', sseError);
    }
    
    try {
        // 调用后端API，设置15分钟超时
        const controller = new AbortController();
        // 移除超时限制以支持长音频处理
        
        // 步骤1: 先获取音频时长估算，带进度反馈
        let estimatedDuration = null;
        
        // 显示预估阶段的进度（使用新的智能进度条）
        
        // 预估开始：使用智能进度条
        if (!smartProgressBar) initializeProgressBar();
        smartProgressBar.updateProgress(7, 'Analyzing audio...', false);
        
        try {
            console.log('🔍 正在预估音频时长...');
            // 为预估接口使用独立的超时控制（30秒）
            const estimateController = new AbortController();
            const estimateTimeoutId = setTimeout(() => estimateController.abort(), 30000);
            
            // 预估中：使用智能进度条
            if (smartProgressBar) {
                smartProgressBar.updateProgress(8, 'Estimating duration...', false);
            }
            
            const estimateResponse = await fetch('/api/estimate-duration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: data.url }),
                signal: estimateController.signal
            });
            
            clearTimeout(estimateTimeoutId);
            
            if (estimateResponse.ok) {
                const estimateResult = await estimateResponse.json();
                if (estimateResult.success) {
                    estimatedDuration = estimateResult.estimatedDuration;
                    console.log(`📊 获取到音频时长估算: ${Math.round(estimatedDuration / 60)} 分钟`);
                    
                    // 预估完成：使用智能进度条
                    if (smartProgressBar) {
                        smartProgressBar.updateProgress(9, 'Duration estimated', false);
                    }
                }
            }
        } catch (estimateError) {
            console.warn('⚠️ 音频时长预估失败，使用默认估算:', estimateError.message);
            // 预估失败：使用智能进度条
            if (smartProgressBar) {
                smartProgressBar.updateProgress(8, 'Using default estimation', false);
            }
        }
        
        // 步骤2: 启动进度模拟（使用真实音频时长）
        startProgressSimulation(estimatedDuration);
        
        const response = await fetch('/api/process-podcast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            signal: controller.signal
        });
        
        // 已移除超时限制
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 停止进度模拟
        stopProgressSimulation();
        
        if (result.success) {
            // 处理时长信息（支持估算时长和真实时长）
            const processingMinutes = smartProgressBar ? 
                (Date.now() - smartProgressBar.smartProgress.startTime) / 1000 / 60 : 0;
            
            if (result.data.actualDuration) {
                // 有真实时长，更新学习数据
                const audioMinutes = result.data.actualDuration / 60;
                const actualRatio = processingMinutes / audioMinutes;
                
                console.log(`✅ 真实音频时长: ${audioMinutes.toFixed(1)} 分钟`);
                console.log(`⏱️ 实际处理时间: ${processingMinutes.toFixed(1)} 分钟`);
                console.log(`📊 实际处理比率: ${actualRatio.toFixed(2)}x`);
                
                // 保存处理比率，用于改进未来预估
                localStorage.setItem('audioProcessingRatio', actualRatio.toString());
                
                // 显示时长对比信息
                if (result.data.estimatedDuration) {
                    const estimatedMinutes = result.data.estimatedDuration / 60;
                    console.log(`📏 初始估算: ${estimatedMinutes.toFixed(1)} 分钟 | 真实时长: ${audioMinutes.toFixed(1)} 分钟`);
                }
            } else if (result.data.estimatedDuration) {
                // 只有估算时长
                const estimatedMinutes = result.data.estimatedDuration / 60;
                console.log(`📊 基于文件大小估算: ${estimatedMinutes.toFixed(1)} 分钟`);
            }
            
            showResultsContent(result.data, data.operation);
        } else {
            showError(result.error || 'Unknown error occurred');
        }
        
        // 关闭SSE连接
        if (eventSource) {
            eventSource.close();
            console.log('🔌 SSE连接已关闭');
        }
        
    } catch (error) {
        console.error('Error processing podcast:', error);
        stopProgressSimulation();
        
        // 关闭SSE连接
        if (eventSource) {
            eventSource.close();
            console.log('🔌 SSE连接已关闭（错误）');
        }
        
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
    
    // 重置进度条（使用新的智能进度条）
    
    // 重置智能进度条
    if (!smartProgressBar) initializeProgressBar();
    smartProgressBar.reset();
}

// ========================================
// 智能进度条系统 - 完全重写版本
// ========================================

class SmartProgressBar {
    constructor() {
        // DOM元素
        this.progressSection = document.getElementById('progressSection');
        this.progressTitle = document.getElementById('progressTitle');
        this.progressStatus = document.getElementById('progressStatus');
        this.progressFill = document.getElementById('progressFill');
        this.progressMessage = document.getElementById('progressMessage');
        
        // 进度状态
        this.currentProgress = 5;
        this.serverProgress = 0;
        this.currentStage = 'preparing';
        this.isActive = false;
        
        // 智能模拟
        this.smartProgress = {
            interval: null,
            startTime: null,
            estimatedDuration: null,
            lastServerUpdate: 0
        };
        
        // 阶段配置
        this.stageConfig = {
            'preparing': { speed: 0.5, maxProgress: 5, message: 'Preparing...' },
            'parsing': { speed: 0.8, maxProgress: 15, message: 'Parsing audio information...' },
            'downloading': { speed: 0.3, maxProgress: 35, message: 'Downloading audio...' },
            'transcribing': { speed: 0.2, maxProgress: 55, message: 'Transcribing audio...' },
            'optimizing': { speed: 0.5, maxProgress: 75, message: 'Optimizing transcript...' },
            'summarizing': { speed: 0.4, maxProgress: 95, message: 'Generating summary...' },
            'translating': { speed: 0.3, maxProgress: 98, message: 'Translating content...' },
            'complete': { speed: 0, maxProgress: 100, message: 'Processing complete!' }
        };
        
        // 多语言支持
        this.translations = {
            zh: {
                title: '处理进度',
                preparing: '准备中...',
                parsing: '解析音频信息...',
                downloading: '下载音频...',
                transcribing: '转录音频...',
                optimizing: '优化转录文本...',
                summarizing: '生成摘要...',
                translating: '翻译内容...',
                complete: '处理完成！'
            },
            en: {
                title: 'Processing Progress',
                preparing: 'Preparing...',
                parsing: 'Parsing audio information...',
                downloading: 'Downloading audio...',
                transcribing: 'Transcribing audio...',
                optimizing: 'Optimizing transcript...',
                summarizing: 'Generating summary...',
                translating: 'Translating content...',
                complete: 'Processing complete!'
            }
        };
    }
    
    // 主要进度更新入口
    updateProgress(progress, message, fromServer = false) {
        if (fromServer) {
            this.serverProgress = progress;
            this.smartProgress.lastServerUpdate = Date.now();
            
            // 识别阶段
            this.detectStage(message, progress);
            
            console.log(`📊 服务器进度更新: ${progress}% - ${message}`);
            
            // 服务器进度更新：始终跳跃到服务器进度（前进或后退）
            if (this.serverProgress !== this.currentProgress) {
                const direction = this.serverProgress > this.currentProgress ? '前进' : '后退';
                console.log(`🔄 进度${direction}: ${this.currentProgress}% → ${this.serverProgress}%`);
                this.currentProgress = this.serverProgress;
            }
        }
        
        // 更新显示
        this.updateProgressDisplay(this.currentProgress, message);
    }
    
    // 检测处理阶段
    detectStage(message, progress) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('download') || lowerMessage.includes('下载')) {
            this.currentStage = 'downloading';
        } else if (lowerMessage.includes('transcrib') || lowerMessage.includes('转录')) {
            this.currentStage = 'transcribing';
        } else if (lowerMessage.includes('optim') || lowerMessage.includes('优化')) {
            this.currentStage = 'optimizing';
        } else if (lowerMessage.includes('summar') || lowerMessage.includes('总结')) {
            this.currentStage = 'summarizing';
        } else if (lowerMessage.includes('translat') || lowerMessage.includes('翻译')) {
            this.currentStage = 'translating';
        } else if (lowerMessage.includes('complete') || lowerMessage.includes('完成')) {
            this.currentStage = 'complete';
        } else if (progress >= 95) {
            this.currentStage = 'complete';
        } else if (progress >= 10) {
            // 如果进度超过10%但没有明确阶段，至少切换到parsing阶段
            if (this.currentStage === 'preparing') {
                this.currentStage = 'parsing';
            }
        }
    }
    
    // 更新进度显示
    updateProgressDisplay(progress, message = null) {
        const roundedProgress = Math.round(progress * 10) / 10;
        const lang = currentLang || 'en';
        
        // 更新百分比
        if (this.progressStatus) {
            this.progressStatus.textContent = `${roundedProgress}%`;
        }
        
        // 更新进度条
        if (this.progressFill) {
            this.progressFill.style.width = `${roundedProgress}%`;
            this.progressFill.setAttribute('aria-valuenow', roundedProgress);
        }
        
        // 更新标题
        if (this.progressTitle) {
            this.progressTitle.textContent = this.translations[lang].title;
        }
        
        // 更新消息 - 始终使用本地化文本，忽略服务器文本
        if (this.progressMessage) {
            let displayMessage;
            if (this.currentStage) {
                displayMessage = this.translations[lang][this.currentStage] || 
                                this.stageConfig[this.currentStage].message;
            } else {
                displayMessage = this.translations[lang].preparing;
            }
            this.progressMessage.textContent = displayMessage;
        }
    }
    
    // 启动智能进度模拟
    startSmartProgress(estimatedDuration = null) {
        this.isActive = true;
        this.smartProgress.startTime = Date.now();
        this.smartProgress.estimatedDuration = estimatedDuration;
        this.currentProgress = Math.max(this.currentProgress, 5);
        
        console.log('🚀 启动智能进度模拟');
        
        this.smartProgress.interval = setInterval(() => {
            this.simulateProgress();
        }, 500); // 每500ms更新一次，更平滑
        
        // 初始显示
        this.updateProgressDisplay(this.currentProgress);
    }
    
    // 智能进度模拟
    simulateProgress() {
        if (!this.isActive || this.currentProgress >= 100) return;
        
        // 计算增量
        const increment = this.calculateProgressIncrement();
        const newProgress = this.currentProgress + increment;
        
        // 设置上限：如果有服务器进度，不超过服务器进度+25%；否则根据阶段设置合理上限
        let maxAllowed = 95;
        if (this.serverProgress > 0) {
            maxAllowed = Math.min(this.serverProgress + 25, 95);
        } else {
            // 没有服务器进度时，根据阶段设置合理的初始上限
            const stageMaxLimits = {
                'preparing': 8,      // 准备阶段最多到8%
                'parsing': 15,       // 解析阶段最多到15%
                'downloading': 25,   // 下载阶段最多到25%
                'transcribing': 35,  // 转录阶段最多到35%
                'optimizing': 55,    // 优化阶段最多到55%
                'summarizing': 75,   // 摘要阶段最多到75%
                'translating': 85,   // 翻译阶段最多到85%
                'complete': 100      // 完成阶段到100%
            };
            maxAllowed = stageMaxLimits[this.currentStage] || 95;
        }
        
        this.currentProgress = Math.min(newProgress, maxAllowed);
        
        // 更新显示
        this.updateProgressDisplay(this.currentProgress);
    }
    
    // 计算进度增量
    calculateProgressIncrement() {
        const stageMultipliers = {
            'preparing': 0.6,     // 准备阶段中等速度
            'parsing': 0.8,       // 解析阶段较快
            'downloading': 0.3,   // 下载阶段较慢
            'transcribing': 0.2,  // 转录阶段最慢
            'optimizing': 0.5,    // 优化阶段中等
            'summarizing': 0.4,   // 摘要阶段中等
            'translating': 0.3,   // 翻译阶段较慢
            'complete': 0         // 完成阶段不增长
        };
        
        const baseIncrement = 0.5; // 基础增量
        const multiplier = stageMultipliers[this.currentStage] || 0.3;
        const randomFactor = 0.5 + Math.random() * 0.5; // 0.5-1.0的随机因子
        
        return baseIncrement * multiplier * randomFactor;
}

// 停止进度模拟
    stopSmartProgress() {
        this.isActive = false;
        
        if (this.smartProgress.interval) {
            clearInterval(this.smartProgress.interval);
            this.smartProgress.interval = null;
        }
        
        // 设置为完成状态
        this.currentProgress = 100;
        this.currentStage = 'complete';
        this.updateProgressDisplay(100);
        
        console.log('🏁 进度模拟已停止');
    }
    
    // 重置进度条
    reset() {
        this.stopSmartProgress();
        this.currentProgress = 5;
        this.serverProgress = 0;
        this.currentStage = 'preparing';
        this.smartProgress.lastServerUpdate = 0;
        this.updateProgressDisplay(5);
    }
}

// 全局进度条实例
let smartProgressBar = null;

// 初始化进度条
function initializeProgressBar() {
    smartProgressBar = new SmartProgressBar();
}

// 兼容性函数 - 保持与现有代码的接口
function startProgressSimulation(audioDuration = null) {
    if (!smartProgressBar) initializeProgressBar();
    smartProgressBar.startSmartProgress(audioDuration);
}

function stopProgressSimulation() {
    if (smartProgressBar) {
        smartProgressBar.stopSmartProgress();
    }
}

// 显示结果内容
function showResultsContent(data, operation = 'transcribe_only') {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('resultsContent').classList.remove('hidden');
    
    // 显示播客标题（如果有）
    if (data.podcastTitle) {
        const podcastTitleSection = document.getElementById('podcastTitleSection');
        const podcastTitleText = document.getElementById('podcastTitleText');
        
        podcastTitleText.textContent = data.podcastTitle;
        podcastTitleSection.classList.remove('hidden');
    }
    
    // 准备标签页数据
    const tabs = [];
    
    // AI总结标签（如果有）
    if (data.summary) {
        tabs.push({
            id: 'summary',
            icon: '🤖',
            title: currentLang === 'zh' ? 'AI总结' : 'AI Summary',
            content: data.summary,
            contentId: 'summaryTabContent'
        });
    }
    
    // 转录文本标签（总是有）
    tabs.push({
        id: 'transcript',
        icon: '📝',
        title: currentLang === 'zh' ? '转录文本' : 'Transcript',
        content: data.transcript || 'No transcript available',
        contentId: 'transcriptTabContent'
    });
    
    // 翻译标签（如果需要且有翻译内容）
    if (data.needsTranslation && data.translation) {
        tabs.push({
            id: 'translation',
            icon: '🌍',
            title: currentLang === 'zh' ? '翻译' : 'Translation',
            content: data.translation,
            contentId: 'translationTabContent'
        });
        console.log('🌍 显示翻译内容');
    } else {
        console.log('✅ 无需显示翻译');
    }
    
    // 章节目录标签（如果有AI分析数据）
    if (data.analysisData && data.analysisData.chapters && data.analysisData.chapters.length > 0) {
        tabs.push({
            id: 'chapters',
            icon: '📚',
            title: currentLang === 'zh' ? '章节目录' : 'Chapters',
            content: null, // 章节内容通过特殊方式渲染
            contentId: 'chaptersTabContent'
        });
        console.log('📚 显示章节目录，共 ' + data.analysisData.chapters.length + ' 个章节');
    }
    
    // 创建标签页导航
    createTabNavigation(tabs);
    
    // 填充标签页内容
    populateTabContent(tabs, data.analysisData);
    
    // 渲染章节内容（如果有）
    if (data.analysisData && data.analysisData.chapters) {
        populateChaptersContent(data.analysisData.chapters, data.analysisData.metadata);
    }
    
    // 激活第一个标签页
    if (tabs.length > 0) {
        activateTab(tabs[0].id);
    }
    
    // 显示下载按钮（如果有保存的文件）
    showDownloadButtons(data.savedFiles || []);
    
    // 设置音频播放器（查找音频文件）
    console.log('🎵 所有保存的文件:', data.savedFiles);
    const audioFile = (data.savedFiles || []).find(file => 
        file.filename && (file.filename.includes('.mp3') || file.filename.includes('.m4a') || file.filename.includes('.wav'))
    );
    if (audioFile) {
        const audioUrl = `/api/download/${audioFile.filename}`;
        setupAudioPlayer(audioUrl);
        console.log('🎵 找到音频文件，设置播放器:', audioFile.filename);
        console.log('🎵 音频URL:', audioUrl);
    } else {
        console.log('🎵 未找到音频文件，播放器不可用');
        console.log('🎵 savedFiles详情:', data.savedFiles?.map(f => ({type: f.type, filename: f.filename})));
    }
    
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
        link.className = 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 no-underline';
        
        const buttonTextMap = {
            'transcript': currentLang === 'zh' ? 'Download Transcript' : 'Download Transcript',
            'summary': currentLang === 'zh' ? 'Download Summary' : 'Download Summary',
            'translation': currentLang === 'zh' ? 'Download Translation' : 'Download Translation'
        };
        
        const buttonText = buttonTextMap[file.type] || `Download ${file.type}`;
        
        // 创建文本内容
        const textSpan = document.createElement('span');
        textSpan.textContent = buttonText;
        
        // 添加到链接中
        link.appendChild(textSpan);
        
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
        } else if (filename.includes('_translation.')) {
            type = 'translation';
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

// 标签页相关函数
function createTabNavigation(tabs) {
    const tabNavigation = document.getElementById('tabNavigation');
    tabNavigation.innerHTML = '';
    
    tabs.forEach(tab => {
        const tabButton = document.createElement('button');
        tabButton.className = 'tab-button';
        tabButton.setAttribute('data-tab', tab.id);
        tabButton.innerHTML = `
            <span>${tab.icon}</span>
            <span>${tab.title}</span>
        `;
        
        tabButton.addEventListener('click', () => activateTab(tab.id));
        tabNavigation.appendChild(tabButton);
    });
}

function populateTabContent(tabs, analysisData = null) {
    tabs.forEach(tab => {
        const contentElement = document.getElementById(tab.contentId);
        if (contentElement) {
            const textElement = contentElement.querySelector('.prose');
            if (textElement && tab.content) {
                let processedContent = marked.parse(tab.content);
                
                // 如果是转录标签页且有分析数据，则高亮热词并添加索引
                if (tab.id === 'transcript' && analysisData && analysisData.professionalTerms) {
                    processedContent = highlightHotwords(processedContent, analysisData.professionalTerms);
                    
                    // 添加热词索引面板
                    const hotwordsIndex = createHotwordsIndex(analysisData.professionalTerms);
                    if (hotwordsIndex) {
                        // 将热词索引插入到转录内容之前
                        const container = textElement.parentElement;
                        container.insertBefore(hotwordsIndex, textElement);
                    }
                }
                
                textElement.innerHTML = processedContent;
            }
        }
    });
}

function activateTab(tabId) {
    // 移除所有活动状态
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // 激活选中的标签页
    const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(`${tabId}TabContent`);
    
    if (activeButton && activeContent) {
        activeButton.classList.add('active');
        activeContent.classList.remove('hidden');
    }
    
    // 显示下载区域
    const downloadSection = document.getElementById('downloadSection');
    if (downloadSection) {
        downloadSection.classList.remove('hidden');
    }
}

// SSE 进度监听函数
function setupProgressListener(eventSource) {
    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'progress') {
                // 使用新的智能进度条系统
                if (smartProgressBar) {
                    smartProgressBar.updateProgress(data.progress, data.stageText, true);
                }
                
                console.log(`📊 收到进度更新: ${data.progress}% - ${data.stageText}`);
            } else if (data.type === 'connected') {
                console.log('✅ SSE连接已建立:', data.sessionId);
            }
        } catch (error) {
            console.error('解析SSE数据失败:', error);
        }
    };
    
    eventSource.onerror = function(error) {
        console.error('SSE连接错误:', error);
        eventSource.close();
    };
}

// 兼容性函数 - 更新进度显示
function updateProgressDisplay() {
    // 新系统中由 SmartProgressBar 内部处理
    if (smartProgressBar) {
        smartProgressBar.updateProgressDisplay(smartProgressBar.currentProgress);
    }
}

// ========================================
// 章节目录相关函数
// ========================================

// 渲染Speaker时间轴内容
function populateChaptersContent(chapters, metadata) {
    const speakerSegments = document.getElementById('speakerSegments');
    const noChaptersMessage = document.getElementById('noChaptersMessage');
    const timelineStats = document.getElementById('timelineStats');
    const leftSpeakerLabel = document.getElementById('leftSpeakerLabel');
    const rightSpeakerLabel = document.getElementById('rightSpeakerLabel');
    
    if (!chapters || chapters.length === 0) {
        speakerSegments.innerHTML = '';
        noChaptersMessage.classList.remove('hidden');
        return;
    }
    
    noChaptersMessage.classList.add('hidden');
    speakerSegments.innerHTML = '';
    
    // 更新统计信息
    const speakers = [...new Set(chapters.map(ch => ch.speaker))];
    timelineStats.textContent = `共 ${chapters.length} 个对话段落`;
    
    // 更新说话人标签
    if (speakers.length >= 2) {
        leftSpeakerLabel.textContent = speakers[0] || '主持人';
        rightSpeakerLabel.textContent = speakers[1] || '嘉宾';
    }
    
    // 创建时间轴段落
    chapters.forEach((chapter, index) => {
        const segmentElement = createSpeakerSegmentElement(chapter, index);
        speakerSegments.appendChild(segmentElement);
    });
    
    // 设置音频播放器关闭按钮事件
    const closePlayerBtn = document.getElementById('closePlayer');
    if (closePlayerBtn) {
        closePlayerBtn.onclick = () => {
            const audioPlayerSection = document.getElementById('audioPlayerSection');
            audioPlayerSection.classList.add('hidden');
        };
    }
}

// 创建Speaker段落元素
function createSpeakerSegmentElement(chapter, index) {
    const segmentDiv = document.createElement('div');
    segmentDiv.className = 'timeline-segment relative flex items-start';
    segmentDiv.setAttribute('data-segment-index', index);
    
    // 确定位置（左侧或右侧）
    const isLeft = chapter.position === 'left';
    const speakerColor = isLeft ? 'bg-blue-500' : 'bg-green-500';
    const bgColor = isLeft ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';
    const textColor = isLeft ? 'text-blue-900' : 'text-green-900';
    
    // 解析时间
    const startTime = chapter.startTime || 0;
    const endTime = chapter.endTime || startTime;
    const duration = Math.round(endTime - startTime);
    
    segmentDiv.innerHTML = `
        <!-- Timeline Dot -->
        <div class="absolute left-1/2 transform -translate-x-1/2 -translate-y-1 z-20">
            <div class="w-4 h-4 ${speakerColor} rounded-full border-2 border-white shadow-sm"></div>
        </div>
        
        <!-- Content Container -->
        <div class="w-1/2 ${isLeft ? 'pr-8' : 'pl-8 ml-auto'}">
            <div class="speaker-segment-card ${bgColor} border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                 data-start-time="${startTime}" 
                 data-end-time="${endTime}"
                 data-speaker="${chapter.speaker}">
                
                <!-- Header -->
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-2">
                        <div class="w-3 h-3 ${speakerColor} rounded-full"></div>
                        <h4 class="font-semibold ${textColor} text-sm">
                            ${chapter.speaker}
                        </h4>
                    </div>
                    <div class="text-xs text-gray-500">
                        ${formatTimeFromSeconds(startTime)} (${duration}s)
                    </div>
                </div>
                
                <!-- Summary -->
                <div class="segment-summary text-gray-700 text-sm leading-relaxed mb-3">
                    ${chapter.summary || '暂无摘要'}
                </div>
                
                <!-- Metadata -->
                <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>${chapter.segmentCount || 1} 个语句</span>
                    <button class="play-segment-btn text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1"
                            title="播放此段落">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9-5.89a1.5 1.5 0 000-2.538l-9-5.89z" />
                        </svg>
                        <span>播放</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 添加点击事件
    const segmentCard = segmentDiv.querySelector('.speaker-segment-card');
    segmentCard.addEventListener('click', () => {
        jumpToSpeakerSegment(startTime, endTime, chapter.speaker);
    });
    
    const playButton = segmentDiv.querySelector('.play-segment-btn');
    playButton.addEventListener('click', (e) => {
        e.stopPropagation();
        jumpToSpeakerSegment(startTime, endTime, chapter.speaker);
    });
    
    return segmentDiv;
}

// 跳转到Speaker段落
function jumpToSpeakerSegment(startTime, endTime, speaker) {
    const audioPlayer = document.getElementById('podcastAudioPlayer');
    const audioPlayerSection = document.getElementById('audioPlayerSection');
    const currentSegmentInfo = document.getElementById('currentSegmentInfo');
    const audioSource = document.getElementById('audioSource');
    
    // 检查音频是否加载
    if (!audioPlayer) {
        alert(currentLang === 'zh' ? '播放器未找到' : 'Audio player not found');
        return;
    }
    
    // 检查音频源是否设置
    if (!audioSource.src || audioSource.src === '') {
        alert(currentLang === 'zh' ? '音频文件尚未加载' : 'Audio file not loaded');
        console.log('🎵 音频源未设置，当前src:', audioSource.src);
        return;
    }
    
    // 显示音频播放器
    audioPlayerSection.classList.remove('hidden');
    
    // 等待音频加载完成再跳转
    const playSegment = () => {
        audioPlayer.currentTime = startTime;
        audioPlayer.play().catch(e => {
            console.warn('播放失败:', e);
            alert(currentLang === 'zh' ? '播放失败，请稍后重试' : 'Playback failed, please try again');
        });
        
        // 更新当前段落信息
        currentSegmentInfo.textContent = `正在播放：${speaker} - ${formatTimeFromSeconds(startTime)}`;
        
        // 高亮当前段落
        highlightCurrentSegment(startTime);
        
        console.log(`🎵 跳转到${speaker}的段落: ${formatTimeFromSeconds(startTime)} - ${formatTimeFromSeconds(endTime)}`);
    };
    
    if (audioPlayer.readyState >= 2) { // 已加载足够数据
        playSegment();
    } else {
        // 等待加载
        const loadHandler = () => {
            playSegment();
            audioPlayer.removeEventListener('canplay', loadHandler);
        };
        audioPlayer.addEventListener('canplay', loadHandler);
        audioPlayer.load(); // 强制重新加载
    }
}

// 高亮当前播放的段落
function highlightCurrentSegment(currentTime) {
    const allSegments = document.querySelectorAll('.speaker-segment-card');
    allSegments.forEach(segment => {
        const startTime = parseFloat(segment.dataset.startTime);
        const endTime = parseFloat(segment.dataset.endTime);
        
        segment.classList.remove('ring-2', 'ring-blue-400', 'ring-green-400');
        
        if (currentTime >= startTime && currentTime <= endTime) {
            const speaker = segment.dataset.speaker;
            const ringColor = speaker === '主持人' ? 'ring-blue-400' : 'ring-green-400';
            segment.classList.add('ring-2', ringColor);
        }
    });
}

// 格式化秒数为时间字符串
function formatTimeFromSeconds(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 跳转到指定章节（保留兼容性）
function jumpToChapter(timeString, chapterTitle) {
    const audioPlayer = document.getElementById('podcastAudioPlayer');
    const currentChapterInfo = document.getElementById('currentChapterInfo');
    
    if (!audioPlayer || !audioPlayer.src) {
        alert(currentLang === 'zh' ? '音频文件尚未加载' : 'Audio file not loaded');
        return;
    }
    
    // 解析时间字符串 (格式: HH:MM 或 MM:SS)
    const timeSeconds = parseTimeString(timeString);
    
    // 跳转到指定时间
    audioPlayer.currentTime = timeSeconds;
    audioPlayer.play().catch(e => {
        console.warn('自动播放失败:', e);
    });
    
    // 更新当前章节信息
    if (currentChapterInfo) {
        currentChapterInfo.textContent = `正在播放: ${chapterTitle}`;
    }
    
    // 高亮当前章节
    highlightCurrentChapter(timeString);
    
    console.log(`🎵 跳转到章节: ${chapterTitle} (${timeString})`);
}

// 解析时间字符串为秒数
function parseTimeString(timeString) {
    const parts = timeString.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1]; // MM:SS
    } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    }
    return 0;
}

// 高亮当前播放章节
function highlightCurrentChapter(timeString) {
    // 移除所有高亮
    document.querySelectorAll('.chapter-item').forEach(item => {
        item.classList.remove('ring-2', 'ring-purple-400', 'bg-purple-50');
    });
    
    // 高亮当前章节
    const playButton = document.querySelector(`[data-start-time="${timeString}"]`);
    if (playButton) {
        const chapterItem = playButton.closest('.chapter-item');
        chapterItem.classList.add('ring-2', 'ring-purple-400', 'bg-purple-50');
    }
}

// 设置音频播放器
function setupAudioPlayer(audioUrl) {
    const audioPlayerSection = document.getElementById('audioPlayerSection');
    const audioSource = document.getElementById('audioSource');
    const audioPlayer = document.getElementById('podcastAudioPlayer');
    
    if (!audioUrl) {
        console.log('🎵 没有音频URL，隐藏播放器');
        audioPlayerSection.classList.add('hidden');
        return;
    }
    
    audioSource.src = audioUrl;
    audioPlayer.load();
    audioPlayerSection.classList.remove('hidden');
    
    console.log('🎵 音频播放器已设置:', audioUrl);
}

// ========================================
// 热词高亮相关函数
// ========================================

// 高亮专业热词
function highlightHotwords(htmlContent, professionalTerms) {
    if (!professionalTerms || !professionalTerms.fullList || professionalTerms.fullList.length === 0) {
        return htmlContent;
    }
    
    let highlightedContent = htmlContent;
    
    // 按长度排序，长词优先匹配
    const sortedTerms = professionalTerms.fullList
        .filter(term => term.chinese || term.english)
        .sort((a, b) => {
            const aText = a.chinese || a.english || '';
            const bText = b.chinese || b.english || '';
            return bText.length - aText.length;
        });
    
    sortedTerms.forEach((term, index) => {
        const chinese = term.chinese || '';
        const english = term.english || '';
        
        // 创建匹配模式
        const patterns = [];
        if (chinese) patterns.push(escapeRegex(chinese));
        if (english) patterns.push(escapeRegex(english));
        
        patterns.forEach(pattern => {
            if (pattern.length < 2) return; // 跳过太短的词
            
            // 使用全词匹配，避免部分匹配
            const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
            
            // 生成高亮HTML
            const highlightClass = getHotwordHighlightClass(index);
            const tooltip = chinese && english ? `${chinese} | ${english}` : (chinese || english);
            
            highlightedContent = highlightedContent.replace(regex, (match) => {
                return `<span class="${highlightClass}" title="${tooltip}" data-hotword="${match}">${match}</span>`;
            });
        });
    });
    
    return highlightedContent;
}

// 转义正则表达式特殊字符
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 获取热词高亮样式类
function getHotwordHighlightClass(index) {
    const colors = [
        'bg-yellow-200 text-yellow-800 border-yellow-400',
        'bg-blue-200 text-blue-800 border-blue-400',
        'bg-green-200 text-green-800 border-green-400',
        'bg-purple-200 text-purple-800 border-purple-400',
        'bg-pink-200 text-pink-800 border-pink-400',
        'bg-indigo-200 text-indigo-800 border-indigo-400'
    ];
    
    const colorIndex = index % colors.length;
    return `hotword-highlight ${colors[colorIndex]} px-1 py-0.5 rounded text-sm font-medium border border-dashed cursor-help transition-all hover:shadow-md`;
}

// 创建热词索引面板
function createHotwordsIndex(professionalTerms) {
    if (!professionalTerms || !professionalTerms.fullList || professionalTerms.fullList.length === 0) {
        return null;
    }
    
    const indexPanel = document.createElement('div');
    indexPanel.className = 'hotwords-index bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-4 border border-yellow-200';
    
    indexPanel.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <h4 class="text-lg font-semibold text-yellow-800">
                <span class="mr-2">🔍</span>
                专业术语索引 (${professionalTerms.totalCount}个)
            </h4>
            <button id="toggleHotwordsIndex" class="text-yellow-600 hover:text-yellow-800 text-sm font-medium">
                收起
            </button>
        </div>
        <div id="hotwordsIndexContent" class="hotwords-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            ${professionalTerms.fullList.map((term, index) => {
                const chinese = term.chinese || '';
                const english = term.english || '';
                const display = chinese && english ? `${chinese} | ${english}` : (chinese || english);
                const highlightClass = getHotwordHighlightClass(index);
                
                return `
                    <div class="hotword-index-item ${highlightClass} p-2 rounded cursor-pointer transition-all hover:shadow-sm"
                         data-term="${chinese || english}"
                         title="点击高亮此术语">
                        <div class="text-sm font-medium">${display}</div>
                        ${term.frequency ? `<div class="text-xs opacity-75">出现 ${term.frequency} 次</div>` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    // 添加交互功能
    setTimeout(() => {
        const toggleButton = indexPanel.querySelector('#toggleHotwordsIndex');
        const content = indexPanel.querySelector('#hotwordsIndexContent');
        
        if (toggleButton && content) {
            toggleButton.addEventListener('click', () => {
                const isHidden = content.classList.contains('hidden');
                if (isHidden) {
                    content.classList.remove('hidden');
                    toggleButton.textContent = '收起';
                } else {
                    content.classList.add('hidden');
                    toggleButton.textContent = '展开';
                }
            });
        }
        
        // 点击术语高亮功能
        indexPanel.querySelectorAll('.hotword-index-item').forEach(item => {
            item.addEventListener('click', () => {
                const term = item.dataset.term;
                highlightSpecificHotword(term);
            });
        });
    }, 100);
    
    return indexPanel;
}

// 高亮特定热词
function highlightSpecificHotword(term) {
    // 移除之前的特殊高亮
    document.querySelectorAll('.hotword-special-highlight').forEach(el => {
        el.classList.remove('hotword-special-highlight', 'ring-2', 'ring-red-400', 'bg-red-100');
    });
    
    // 找到所有匹配的热词并高亮
    document.querySelectorAll(`[data-hotword="${term}"]`).forEach(el => {
        el.classList.add('hotword-special-highlight', 'ring-2', 'ring-red-400', 'bg-red-100');
        
        // 滚动到第一个匹配项
        if (document.querySelectorAll('.hotword-special-highlight').length === 1) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
    
    // 3秒后移除特殊高亮
    setTimeout(() => {
        document.querySelectorAll('.hotword-special-highlight').forEach(el => {
            el.classList.remove('hotword-special-highlight', 'ring-2', 'ring-red-400', 'bg-red-100');
        });
    }, 3000);
    
    console.log(`🔍 已高亮术语: ${term}`);
}
