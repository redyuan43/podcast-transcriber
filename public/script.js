// 双语内容配置
const translations = {
    zh: {
        title: "Podcast提取器",
        subtitle: "只需提供Podcast音频链接，即可获得高质量的文字转录和AI智能总结",
        urlLabel: "Podcast音频链接",
        urlHelper: "支持 Apple Podcasts 和小宇宙播客链接",
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
        langFlag: "🇨🇳",
        langText: "中文"
    },
    en: {
        title: "Podcast Extractor",
        subtitle: "Just provide a podcast audio link to get high-quality transcription and AI-powered summary",
        urlLabel: "Podcast Audio Link",
        urlHelper: "Supports Apple Podcasts and Xiaoyuzhou podcast links",
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
        langFlag: "🇺🇸",
        langText: "English"
    }
};

// 当前语言状态
let currentLang = 'zh';

// 语言切换功能
function toggleLanguage() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    updateUI();
    
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
        : 'https://example.com/podcast/episode';
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
    showLoading();
    
    try {
        // 调用后端API
        const response = await fetch('/api/process-podcast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showResultsContent(result.data);
        } else {
            showError(result.error || 'Unknown error occurred');
        }
        
    } catch (error) {
        console.error('Error processing podcast:', error);
        showError(error.message);
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

// 显示结果内容
function showResultsContent(data) {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('resultsContent').classList.remove('hidden');
    
    // 显示转录文本
    const transcriptText = document.getElementById('transcriptText');
    transcriptText.textContent = data.transcript || 'No transcript available';
    
    // 显示总结（如果有）
    const summarySection = document.getElementById('summarySection');
    const summaryText = document.getElementById('summaryText');
    
    if (data.summary) {
        summarySection.classList.remove('hidden');
        summaryText.textContent = data.summary;
    } else {
        summarySection.classList.add('hidden');
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
    // 小宇宙 URL pattern (假设格式)
    const xiaoyuzhouPattern = /^https:\/\/(www\.)?xiaoyuzhou\.fm\//;
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

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    updateUI();
    
    // 监听操作类型变化，显示/隐藏总结语言选择
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
});
