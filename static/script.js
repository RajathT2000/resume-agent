// Global state
let visitorName = "Guest";
let visitorCompany = "Unknown";
let chatHistory = [];
let recognition = null;
let isListening = false;
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let autoScrollEnabled = localStorage.getItem('autoScroll') !== 'false';
let typingIndicatorEnabled = localStorage.getItem('typingIndicator') !== 'false';
let smartSuggestionsEnabled = localStorage.getItem('smartSuggestions') !== 'false';
let userScrolledUp = false;
let currentInputSuggestion = '';
let messageReactions = {}; // Store reactions in memory
let chatHistoryIndex = -1; // For arrow key navigation
let messageTimestamps = {}; // Store timestamps for messages
let searchActive = false;
let currentSearchIndex = -1;
let searchMatches = [];
let textToSpeechEnabled = false;
let currentSpeech = null;
let editedMessages = {}; // Track edited messages

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const welcomeForm = document.getElementById('welcomeForm');
    if (welcomeForm) {
        console.log('Welcome form found, attaching handlers');
        welcomeForm.addEventListener('submit', handleWelcomeSubmit);
        welcomeForm.onsubmit = function(e) {
            console.log('onsubmit triggered');
            return handleWelcomeSubmit(e);
        };
        
        // Also attach to button click as backup
        const submitBtn = welcomeForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Button clicked');
                handleWelcomeSubmit(e);
            });
        }
    } else {
        console.error('Welcome form not found!');
    }
    
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', handleKeyPress);
        chatInput.addEventListener('input', handleInputChange);
        chatInput.addEventListener('keydown', handleKeyDown);
        
        // Auto-resize textarea
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
    
    // Initialize voice recognition
    initVoiceRecognition();
    
    // Apply dark mode if enabled
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        updateDarkModeIcon();
    }
    
    // Initialize keyboard shortcuts
    initKeyboardShortcuts();
    
    // Initialize conversation search
    initConversationSearch();
    
    // Initialize auto-scroll
    initAutoScroll();
    
    // Initialize settings
    initSettings();
    
    // Initialize smart suggestions
    if (smartSuggestionsEnabled) {
        initSmartSuggestions();
    }
});

// Animate elements on page load
function animateOnLoad() {
    const elements = document.querySelectorAll('.header-content, .welcome-banner, .main-content, .chat-section');
    elements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        setTimeout(() => {
            el.style.transition = 'opacity 1s ease, transform 1s ease';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 200);
    });
}

// Welcome Modal Handler
function handleWelcomeSubmit(e) {
    console.log('Form submitted!', e);
    
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    const nameInput = document.getElementById('visitorName');
    const companyInput = document.getElementById('visitorCompany');
    
    if (!nameInput || !companyInput) {
        console.error('Input fields not found');
        return false;
    }
    
    visitorName = nameInput.value.trim();
    visitorCompany = companyInput.value.trim();
    
    // Use defaults if empty (HTML5 required should prevent this, but just in case)
    if (!visitorName) visitorName = "Guest";
    if (!visitorCompany) visitorCompany = "Unknown";
    
    console.log('Visitor:', visitorName, 'Company:', visitorCompany);
    
    // Hide modal, show main app
    const modal = document.getElementById('welcomeModal');
    const mainApp = document.getElementById('mainApp');
    
    if (!modal) {
        console.error('Modal element not found');
        return false;
    }
    
    if (!mainApp) {
        console.error('MainApp element not found');
        return false;
    }
    
    console.log('Hiding modal, showing main app');
    modal.style.display = 'none';
    modal.classList.add('hidden');
    mainApp.style.display = 'block';
    mainApp.classList.remove('hidden');
    
    // Animate main app appearance
    setTimeout(() => {
        animateOnLoad();
    }, 100);
    
    // Update welcome banner
    const welcomeText = document.getElementById('welcomeText');
    if (welcomeText) {
        welcomeText.textContent = `👋 Welcome ${visitorName} from ${visitorCompany}! 🎉`;
    }
    
    // Load shared analysis if URL has parameters
    loadSharedAnalysis();
    
    // Show first tab by default (Job Analysis)
    switchTab('jobAnalysis');
    
    // Add welcome message to chat
    addWelcomeMessage();
    
    // Update floating button visibility
    setTimeout(() => {
        updateFloatingButtonVisibility();
    }, 500);
    
    return false;
}

// Switch Tabs
function switchTab(tabName) {
    // Remove active class from all tabs and contents
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    const tabBtn = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    const tabContent = document.getElementById(tabName);
    
    if (tabBtn && tabContent) {
        tabBtn.classList.add('active');
        tabContent.classList.add('active');
    }
}

// Analyze Company Fit
async function analyzeCompanyFit() {
    const resultBox = document.getElementById('companyFitResult');
    resultBox.innerHTML = '<div class="analysis-loading"><div class="loading-dots"><span></span><span></span><span></span></div><p>Analyzing...</p></div>';
    
    // Show section if hidden
    document.getElementById('companyFit').classList.remove('hidden');
    
    try {
        const response = await fetch('/api/analyze-company-fit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                company_name: visitorCompany,
                visitor_name: visitorName
            })
        });
        
        const data = await response.json();
        const analysisHtml = markdownToHtml(data.analysis);
        resultBox.innerHTML = `
            <div class="result-header">
                <span>Company Fit Analysis</span>
                <button class="btn-icon-small" onclick="copyToClipboard('companyFitContent')" title="Copy Result">
                    📋
                </button>
            </div>
            <div id="companyFitContent" class="analysis-content">${analysisHtml}</div>
        `;
    } catch (error) {
        console.error('Error analyzing company fit:', error);
        resultBox.innerHTML = '<div class="analysis-content"><p style="color: var(--error-color);">Error analyzing company fit. Please try again.</p></div>';
    }
}

// Analyze Job Description
async function analyzeJob() {
    const jobDescription = document.getElementById('jobDescription').value;
    if (!jobDescription.trim()) {
        alert('Please paste a job description first.');
        return;
    }
    
    const resultBox = document.getElementById('jobAnalysisResult');
    const contentBox = document.getElementById('jobAnalysisContent');
    contentBox.innerHTML = '<div class="analysis-loading"><div class="loading-dots"><span></span><span></span><span></span></div><p>Analyzing job match...</p></div>';
    resultBox.classList.remove('hidden');
    
    // Scroll to result
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    try {
        const response = await fetch('/api/analyze-job', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                job_description: jobDescription,
                company_name: visitorCompany
            })
        });
        
        const data = await response.json();
        const analysisHtml = markdownToHtml(data.analysis);
        contentBox.innerHTML = `<div class="analysis-content">${analysisHtml}</div>`;
    } catch (error) {
        console.error('Error analyzing job:', error);
        contentBox.innerHTML = '<div class="analysis-content"><p style="color: var(--error-color);">Error analyzing job description. Please try again.</p></div>';
    }
}

// Send Chat Message with Streaming/Typing Effect
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Clear input
    input.value = '';
    
    // Add user message to UI
    const userMessageId = addMessageToChat('user', message);
    
    // Add to history with messageId
    chatHistory.push({ role: 'user', content: message, messageId: userMessageId, timestamp: Date.now() });
    
    // Show typing indicator (non-blocking)
    showTypingIndicator();
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                history: chatHistory,
                visitor_name: visitorName,
                visitor_company: visitorCompany
            })
        });
        
        // Remove typing indicator
        hideTypingIndicator();
        
        // Create message container for streaming
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = Date.now();
        messageTimestamps[messageId] = timestamp;
        
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant fade-in';
        messageDiv.setAttribute('data-message-id', messageId);
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '🤖';
        
        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'message-wrapper';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = '';
        
        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'message-timestamp';
        timestampDiv.textContent = formatTimestamp(timestamp);
        timestampDiv.title = new Date(timestamp).toLocaleString();
        
        messageWrapper.appendChild(messageContent);
        messageWrapper.appendChild(timestampDiv);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageWrapper);
        chatMessages.appendChild(messageDiv);
        
        // Check if response is streaming (text/event-stream) or JSON
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('text/event-stream')) {
            // Stream response with typing effect
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            let buffer = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.chunk) {
                                fullResponse += data.chunk;
                                // Optimized streaming update (batched)
                                updateStreamingMessage(fullResponse, messageContent);
                            }
                            if (data.done) {
                                // Final update - remove confidence scores
                                const cleanedResponse = removeConfidenceScore(data.full_response || fullResponse);
                                messageContent.innerHTML = markdownToHtml(cleanedResponse);
                                scrollToBottom();
                                // Add reaction buttons
                                setTimeout(() => addReactionButtons(messageId), 500);
                                // Add to history with messageId and timestamp
                                chatHistory.push({ role: 'assistant', content: cleanedResponse, messageId: messageId, timestamp: timestamp });
                                // Auto-speak if TTS enabled
                                if (textToSpeechEnabled && 'speechSynthesis' in window) {
                                    setTimeout(() => speakText(cleanedResponse), 500);
                                }
                                return;
                            }
                        } catch (e) {
                            console.error('Error parsing stream:', e);
                        }
                    }
                }
            }
            
            // Fallback: if streaming fails, add full response
            if (fullResponse) {
                chatHistory.push({ role: 'assistant', content: fullResponse });
            }
        } else {
            // Fallback to non-streaming response
            const data = await response.json();
            let responseText = data.response || '';
            
            // Remove confidence scores
            responseText = removeConfidenceScore(responseText);
            
            // Optimized typing effect (batched updates)
            let typedText = '';
            for (let i = 0; i < responseText.length; i++) {
                typedText += responseText[i];
                // Update every 3 characters for better performance
                if (i % 3 === 0 || i === responseText.length - 1) {
                    messageContent.innerHTML = markdownToHtml(typedText);
                    scrollToBottom();
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            const messageId = messageDiv.getAttribute('data-message-id');
            const timestamp = messageTimestamps[messageId] || Date.now();
            
            // Update timestamp display
            const timestampDiv = messageDiv.querySelector('.message-timestamp');
            if (timestampDiv) {
                timestampDiv.textContent = formatTimestamp(timestamp);
                timestampDiv.title = new Date(timestamp).toLocaleString();
            }
            
            if (messageId) {
                setTimeout(() => addReactionButtons(messageId), 500);
            }
            
            chatHistory.push({ role: 'assistant', content: responseText, messageId: messageId, timestamp: timestamp });
            
            // Auto-speak if TTS enabled
            if (textToSpeechEnabled && 'speechSynthesis' in window) {
                setTimeout(() => speakText(responseText), 500);
            }
        }
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        addMessageToChat('assistant', 'Sorry, I encountered an error. Please try again.');
    }
}

// Send Example Query
function sendExample(exampleText) {
    document.getElementById('chatInput').value = exampleText;
    sendMessage();
}

// Add Message to Chat UI
function addMessageToChat(role, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role} fade-in`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    // Render markdown for assistant messages, plain text for user
    if (role === 'assistant') {
        messageContent.innerHTML = markdownToHtml(content);
    } else {
        messageContent.textContent = content;
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle Enter Key
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
        hideSuggestions();
    }
    // Shift+Enter for new line
    if (event.key === 'Enter' && event.shiftKey) {
        // Allow default behavior (new line)
        return true;
    }
}

// Show/Hide Typing Indicator
function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'message assistant typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';
    
    const typingContent = document.createElement('div');
    typingContent.className = 'message-content typing-content';
    typingContent.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(typingContent);
    chatMessages.appendChild(typingDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Remove confidence scores from text
function removeConfidenceScore(text) {
    if (!text) return text;
    
    // Remove patterns like "Confidence Score: 85%", "Confidence: 90%", etc.
    text = text.replace(/confidence\s*score\s*:?\s*\d+\s*%/gi, '');
    text = text.replace(/confidence\s*:?\s*\d+\s*%/gi, '');
    text = text.replace(/\d+\s*%\s*confidence/gi, '');
    text = text.replace(/confidence\s*level\s*:?\s*\d+\s*%/gi, '');
    
    // Clean up extra whitespace
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    text = text.trim();
    
    return text;
}

// Convert Markdown to HTML (simple converter)
function markdownToHtml(markdown) {
    if (!markdown) return '';
    
    // Remove confidence scores first
    markdown = removeConfidenceScore(markdown);
    
    let html = markdown;
    
    // Convert headers first (order matters - most specific first)
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
    
    // Convert bold **text** to <strong>
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Split into lines for processing
    const lines = html.split('\n');
    const result = [];
    let inList = false;
    let listItems = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line) {
            // Empty line - close list if open, add paragraph break
            if (inList) {
                result.push('<ul>' + listItems.join('') + '</ul>');
                listItems = [];
                inList = false;
            }
            continue;
        }
        
        // Check if it's a list item
        const bulletMatch = line.match(/^[\*\-\+]\s+(.+)$/);
        const numberMatch = line.match(/^\d+\.\s+(.+)$/);
        
        if (bulletMatch || numberMatch) {
            const content = bulletMatch ? bulletMatch[1] : numberMatch[1];
            listItems.push('<li>' + content + '</li>');
            inList = true;
        } else {
            // Not a list item
            if (inList) {
                result.push('<ul>' + listItems.join('') + '</ul>');
                listItems = [];
                inList = false;
            }
            
            // If it's already a tag (header), add as-is
            if (line.startsWith('<h') || line.startsWith('<p') || line.startsWith('<ul') || line.startsWith('<li')) {
                result.push(line);
            } else {
                // Regular paragraph
                result.push('<p>' + line + '</p>');
            }
        }
    }
    
    // Close any remaining list
    if (inList) {
        result.push('<ul>' + listItems.join('') + '</ul>');
    }
    
    return result.join('\n');
}

// Add Welcome Message
function addWelcomeMessage() {
    const welcomeMsg = `Hello ${visitorName}! 👋 I'm Rajath's AI Avatar, here to help you learn more about my background, skills, and experience. 

I can help you with:
• Analyzing how my skills match a job description
• Answering questions about my experience with Django, Python, AI, and more
• Discussing my projects and achievements
• Providing insights about my fit for your company

What would you like to know? Feel free to ask me anything! 💬`;
    
    // Add welcome message to chat
    const welcomeId = addMessageToChat('assistant', welcomeMsg);
    
    // Add to history with messageId
    chatHistory.push({ role: 'assistant', content: welcomeMsg, messageId: welcomeId, timestamp: Date.now() });
}

// Scroll to chat section
function scrollToChat() {
    const chatSection = document.querySelector('.chat-section');
    chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Focus on input after scroll
    setTimeout(() => {
        document.getElementById('chatInput').focus();
    }, 500);
}

// Hide/show floating button based on scroll position
function updateFloatingButtonVisibility() {
    const floatingBtn = document.getElementById('startChattingBtn');
    const chatSection = document.querySelector('.chat-section');
    
    if (!floatingBtn || !chatSection) return;
    
    const chatRect = chatSection.getBoundingClientRect();
    const isChatVisible = chatRect.top < window.innerHeight && chatRect.bottom > 0;
    
    if (isChatVisible) {
        floatingBtn.style.display = 'none';
    } else {
        floatingBtn.style.display = 'block';
    }
}

// Add scroll listener to hide/show floating button
window.addEventListener('scroll', updateFloatingButtonVisibility);
window.addEventListener('resize', updateFloatingButtonVisibility);

// Initialize Voice Recognition
function initVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('chatInput').value = transcript;
            stopVoiceInput();
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            stopVoiceInput();
        };
        
        recognition.onend = () => {
            stopVoiceInput();
        };
    }
}

// Toggle Voice Input
function toggleVoiceInput() {
    if (!recognition) {
        alert('Voice recognition is not supported in your browser.');
        return;
    }
    
    if (isListening) {
        stopVoiceInput();
    } else {
        startVoiceInput();
    }
}

// Start Voice Input
function startVoiceInput() {
    if (!recognition) return;
    
    isListening = true;
    const voiceBtn = document.getElementById('voiceBtn');
    const voiceStatus = document.getElementById('voiceStatus');
    
    voiceBtn.classList.add('listening');
    voiceStatus.classList.remove('hidden');
    voiceStatus.textContent = '🎤 Listening... Speak now!';
    voiceStatus.style.color = 'var(--primary-color)';
    
    recognition.start();
}

// Stop Voice Input
function stopVoiceInput() {
    if (!recognition) return;
    
    isListening = false;
    const voiceBtn = document.getElementById('voiceBtn');
    const voiceStatus = document.getElementById('voiceStatus');
    
    voiceBtn.classList.remove('listening');
    
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {}
    }
    
    setTimeout(() => {
        voiceStatus.classList.add('hidden');
    }, 2000);
}

// Dark Mode Toggle
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    updateDarkModeIcon();
    updateSettingsDarkModeButton();
}

function updateDarkModeIcon() {
    const darkModeBtn = document.getElementById('darkModeToggle');
    if (darkModeBtn) {
        darkModeBtn.textContent = isDarkMode ? '☀️' : '🌙';
    }
}

function updateSettingsDarkModeButton() {
    const btn = document.getElementById('settingsDarkModeToggle');
    if (btn) {
        btn.textContent = isDarkMode ? 'Disable Dark Mode' : 'Enable Dark Mode';
    }
}

// Export Chat as PDF
async function exportChatPDF() {
    try {
        const response = await fetch('/api/export-chat-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                history: chatHistory,
                visitor_name: visitorName
            })
        });
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error exporting chat:', error);
        alert('Failed to export conversation. Please try again.');
    }
}

// Copy Chat to Clipboard
async function copyChatToClipboard() {
    try {
        let chatText = `Rajath's AI Avatar - Conversation\n`;
        chatText += `Visitor: ${visitorName} | Company: ${visitorCompany}\n`;
        chatText += `${'='.repeat(50)}\n\n`;
        
        chatHistory.forEach(msg => {
            const role = msg.role === 'user' ? 'You' : "Rajath's AI Avatar";
            chatText += `[${role}]: ${msg.content}\n\n`;
        });
        
        await navigator.clipboard.writeText(chatText);
        
        // Show feedback
        const btn = event.target.closest('button');
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    } catch (error) {
        console.error('Error copying chat:', error);
        alert('Failed to copy conversation. Please try again.');
    }
}

// Copy Analysis Result to Clipboard
async function copyToClipboard(elementId) {
    try {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Get text content, stripping HTML
        const text = element.innerText || element.textContent;
        
        await navigator.clipboard.writeText(text);
        
        // Show feedback
        const btn = event.target.closest('button');
        const originalText = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    } catch (error) {
        console.error('Error copying:', error);
        alert('Failed to copy. Please try again.');
    }
}

// Share Analysis Link
function shareAnalysis(type) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', type);
    url.searchParams.set('visitor', visitorName);
    url.searchParams.set('company', visitorCompany);
    
    const shareUrl = url.toString();
    
    if (navigator.share) {
        navigator.share({
            title: `Rajath's AI Avatar - ${type === 'job' ? 'Job Analysis' : 'Company Fit Analysis'}`,
            text: `Check out this analysis from Rajath's AI Avatar`,
            url: shareUrl
        }).catch(err => {
            copyShareLink(shareUrl);
        });
    } else {
        copyShareLink(shareUrl);
    }
}

function copyShareLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('Shareable link copied to clipboard!');
    }).catch(() => {
        prompt('Copy this link:', url);
    });
}

// Load shared analysis from URL
function loadSharedAnalysis() {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    const visitor = urlParams.get('visitor');
    const company = urlParams.get('company');
    
    if (tab && (tab === 'job' || tab === 'company')) {
        if (visitor) visitorName = visitor;
        if (company) visitorCompany = company;
        
        setTimeout(() => {
            if (tab === 'job') {
                switchTab('jobAnalysis');
            } else {
                switchTab('companyFit');
                analyzeCompanyFit();
            }
        }, 1000);
    }
}

// ========== NEW FEATURES (1-7) ==========

// 1. Keyboard Shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+K or Cmd+K to focus chat input
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.focus();
            }
        }
        
        // Esc to close modals or clear input
        if (e.key === 'Escape') {
            const modal = document.getElementById('welcomeModal');
            if (modal && !modal.classList.contains('hidden')) {
                // Don't close welcome modal, but clear input
            }
            const chatInput = document.getElementById('chatInput');
            if (chatInput && document.activeElement === chatInput) {
                chatInput.value = '';
            }
        }
        
        // Arrow keys for chat history navigation
        const chatInput = document.getElementById('chatInput');
        if (chatInput && document.activeElement === chatInput) {
            if (e.key === 'ArrowUp' && chatHistory.length > 0) {
                e.preventDefault();
                chatHistoryIndex = Math.max(0, chatHistoryIndex - 1);
                const msg = chatHistory[chatHistoryIndex];
                if (msg && msg.role === 'user') {
                    chatInput.value = msg.content;
                }
            } else if (e.key === 'ArrowDown' && chatHistoryIndex >= 0) {
                e.preventDefault();
                chatHistoryIndex = Math.min(chatHistory.length - 1, chatHistoryIndex + 1);
                if (chatHistoryIndex < chatHistory.length) {
                    const msg = chatHistory[chatHistoryIndex];
                    chatInput.value = msg && msg.role === 'user' ? msg.content : '';
                } else {
                    chatInput.value = '';
                    chatHistoryIndex = -1;
                }
            }
        }
    });
}

function handleKeyDown(e) {
    // Tab to cycle through quick actions
    if (e.key === 'Tab' && !e.shiftKey) {
        const quickActions = document.querySelectorAll('.quick-action-btn');
        if (quickActions.length > 0 && document.activeElement.classList.contains('quick-action-btn')) {
            e.preventDefault();
            const currentIndex = Array.from(quickActions).indexOf(document.activeElement);
            const nextIndex = (currentIndex + 1) % quickActions.length;
            quickActions[nextIndex].focus();
        }
    }
}

function handleInputChange(e) {
    chatHistoryIndex = -1; // Reset history index when typing
    if (smartSuggestionsEnabled) {
        showSmartSuggestions(e.target.value);
    }
}

// 2. Auto-scroll with pause on user scroll
function initAutoScroll() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    // Create scroll to bottom button
    const scrollBtn = document.createElement('button');
    scrollBtn.className = 'scroll-to-bottom-btn';
    scrollBtn.innerHTML = '↓';
    scrollBtn.onclick = () => scrollToBottom(true);
    chatMessages.parentElement.style.position = 'relative';
    chatMessages.parentElement.appendChild(scrollBtn);
    
    let isUserScrolling = false;
    let scrollTimeout;
    
    chatMessages.addEventListener('scroll', () => {
        isUserScrolling = true;
        clearTimeout(scrollTimeout);
        
        // Check if user scrolled up
        const isAtBottom = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 50;
        userScrolledUp = !isAtBottom;
        
        // Show/hide scroll button
        if (userScrolledUp && autoScrollEnabled) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
        
        scrollTimeout = setTimeout(() => {
            isUserScrolling = false;
        }, 150);
    });
}

function scrollToBottom(force = false) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    if (force || (autoScrollEnabled && !userScrolledUp)) {
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
        userScrolledUp = false;
    }
}

// 3. Typing Indicators
function showTypingIndicator() {
    if (!typingIndicatorEnabled) return;
    
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    // Remove existing typing indicator
    hideTypingIndicator();
    
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'message assistant typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';
    
    const typingContent = document.createElement('div');
    typingContent.className = 'message-content typing-content';
    typingContent.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div><span style="margin-left: 8px; color: var(--text-secondary);">Rajath is typing...</span>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(typingContent);
    chatMessages.appendChild(typingDiv);
    
    scrollToBottom();
}

// 4. Message Reactions (moved to bottom of message)
function addReactionButtons(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv || messageDiv.querySelector('.message-reactions')) return;
    
    const reactionsDiv = document.createElement('div');
    reactionsDiv.className = 'message-reactions';
    
    const reactions = ['👍', '❤️', '💡', '🎯'];
    reactions.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'reaction-btn';
        btn.textContent = emoji;
        btn.onclick = () => toggleReaction(messageId, emoji);
        
        // Show if already reacted
        if (messageReactions[messageId] && messageReactions[messageId].includes(emoji)) {
            btn.classList.add('active');
        }
        
        reactionsDiv.appendChild(btn);
    });
    
    // Append to message content div (bottom) instead of message div
    const messageContent = messageDiv.querySelector('.message-content');
    if (messageContent) {
        messageContent.appendChild(reactionsDiv);
    } else {
        messageDiv.appendChild(reactionsDiv);
    }
}

function toggleReaction(messageId, emoji) {
    if (!messageReactions[messageId]) {
        messageReactions[messageId] = [];
    }
    
    const index = messageReactions[messageId].indexOf(emoji);
    if (index > -1) {
        messageReactions[messageId].splice(index, 1);
    } else {
        messageReactions[messageId].push(emoji);
    }
    
    // Update UI
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageDiv) {
        const btn = Array.from(messageDiv.querySelectorAll('.reaction-btn'))
            .find(b => b.textContent === emoji);
        if (btn) {
            btn.classList.toggle('active');
        }
    }
}

// 5. Smart Input Suggestions
function initSmartSuggestions() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.id = 'suggestionsDropdown';
    suggestionsDiv.className = 'suggestions-dropdown';
    chatInput.parentElement.appendChild(suggestionsDiv);
}

function showSmartSuggestions(input) {
    if (!smartSuggestionsEnabled || !input || input.length < 2) {
        hideSuggestions();
        return;
    }
    
    const suggestions = getSuggestions(input);
    const dropdown = document.getElementById('suggestionsDropdown');
    if (!dropdown) return;
    
    if (suggestions.length === 0) {
        hideSuggestions();
        return;
    }
    
    dropdown.innerHTML = '';
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = suggestion.replace(new RegExp(input, 'gi'), `<strong>$&</strong>`);
        item.onclick = () => {
            document.getElementById('chatInput').value = suggestion;
            hideSuggestions();
            document.getElementById('chatInput').focus();
        };
        dropdown.appendChild(item);
    });
    
    dropdown.classList.add('visible');
}

function hideSuggestions() {
    const dropdown = document.getElementById('suggestionsDropdown');
    if (dropdown) {
        dropdown.classList.remove('visible');
    }
}

function getSuggestions(input) {
    const commonQuestions = [
        'What is your experience with Django?',
        'Tell me about your AI projects.',
        'Where did you study?',
        'How would you approach building a scalable API?',
        'What are your strongest technical skills?',
        'Tell me about your work experience.',
        'What programming languages do you know?',
        'Describe your Python projects.',
        'What is your experience with machine learning?',
        'Tell me about your education background.'
    ];
    
    const lowerInput = input.toLowerCase();
    return commonQuestions
        .filter(q => q.toLowerCase().includes(lowerInput))
        .slice(0, 5);
}

// 6. Optimized Streaming (batch updates)
let streamingBuffer = '';
let streamingUpdateTimeout = null;

function updateStreamingMessage(content, messageContent) {
    streamingBuffer = content;
    
    // Clear existing timeout
    if (streamingUpdateTimeout) {
        clearTimeout(streamingUpdateTimeout);
    }
    
    // Batch updates every 50ms instead of every character
    streamingUpdateTimeout = setTimeout(() => {
        // Remove confidence scores from streaming content
        const cleanedContent = removeConfidenceScore(streamingBuffer);
        messageContent.innerHTML = markdownToHtml(cleanedContent);
        scrollToBottom();
        streamingBuffer = '';
    }, 50);
}

// 7. Initialize Settings
function initSettings() {
    // Load settings from localStorage
    const autoScrollToggle = document.getElementById('autoScrollToggle');
    const typingIndicatorToggle = document.getElementById('typingIndicatorToggle');
    const smartSuggestionsToggle = document.getElementById('smartSuggestionsToggle');
    
    if (autoScrollToggle) {
        autoScrollToggle.checked = autoScrollEnabled;
        autoScrollToggle.addEventListener('change', (e) => {
            autoScrollEnabled = e.target.checked;
            localStorage.setItem('autoScroll', autoScrollEnabled);
        });
    }
    
    if (typingIndicatorToggle) {
        typingIndicatorToggle.checked = typingIndicatorEnabled;
        typingIndicatorToggle.addEventListener('change', (e) => {
            typingIndicatorEnabled = e.target.checked;
            localStorage.setItem('typingIndicator', typingIndicatorEnabled);
        });
    }
    
    if (smartSuggestionsToggle) {
        smartSuggestionsToggle.checked = smartSuggestionsEnabled;
        smartSuggestionsToggle.addEventListener('change', (e) => {
            smartSuggestionsEnabled = e.target.checked;
            localStorage.setItem('smartSuggestions', smartSuggestionsEnabled);
            if (smartSuggestionsEnabled) {
                initSmartSuggestions();
            } else {
                hideSuggestions();
            }
        });
    }
    
    // Sync dark mode toggle button
    const settingsDarkModeToggle = document.getElementById('settingsDarkModeToggle');
    if (settingsDarkModeToggle) {
        settingsDarkModeToggle.addEventListener('click', function(e) {
            e.preventDefault();
            toggleDarkMode();
        });
        updateSettingsDarkModeButton();
    }
}

// Update addMessageToChat to include message ID, timestamps, and reactions
function addMessageToChat(role, content, messageId = null, timestamp = null) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role} fade-in`;
    
    if (!messageId) {
        messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    messageDiv.setAttribute('data-message-id', messageId);
    
    if (!timestamp) {
        timestamp = Date.now();
    }
    messageTimestamps[messageId] = timestamp;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';
    
    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'message-wrapper';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = markdownToHtml(content);
    
    // Add edit/delete buttons for user messages
    if (role === 'user') {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'msg-action-btn';
        editBtn.textContent = '✏️';
        editBtn.title = 'Edit';
        editBtn.onclick = () => editMessage(messageId);
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'msg-action-btn';
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = 'Delete';
        deleteBtn.onclick = () => deleteMessage(messageId);
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        messageWrapper.appendChild(actionsDiv);
    }
    
    // Add timestamp
    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'message-timestamp';
    timestampDiv.textContent = formatTimestamp(timestamp);
    timestampDiv.title = new Date(timestamp).toLocaleString();
    
    messageWrapper.appendChild(messageContent);
    messageWrapper.appendChild(timestampDiv);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageWrapper);
    chatMessages.appendChild(messageDiv);
    
    // Add reaction buttons for assistant messages
    if (role === 'assistant') {
        setTimeout(() => addReactionButtons(messageId), 500);
    }
    
    scrollToBottom();
    return messageId;
}

// ========== FEATURES 1-6 ==========

// 1. Message Timestamps (already added above in addMessageToChat)

// 2. Conversation Search (Ctrl+F)
function initConversationSearch() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            toggleSearch();
        }
        if (e.key === 'Escape' && searchActive) {
            closeSearch();
        }
    });
}

function toggleSearch() {
    const searchBar = document.getElementById('searchBar');
    if (!searchBar) return;
    
    searchActive = !searchActive;
    if (searchActive) {
        searchBar.classList.remove('hidden');
        document.getElementById('searchInput').focus();
    } else {
        closeSearch();
    }
}

function closeSearch() {
    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.classList.add('hidden');
        searchActive = false;
        clearSearchHighlights();
    }
}

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    if (!searchInput || !searchResults) return;
    
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
        clearSearchHighlights();
        searchResults.textContent = '';
        return;
    }
    
    const messages = document.querySelectorAll('.message-content');
    searchMatches = [];
    let matchCount = 0;
    
    messages.forEach((msg, index) => {
        const text = msg.textContent.toLowerCase();
        if (text.includes(query)) {
            searchMatches.push(index);
            matchCount++;
            // Highlight match
            const html = msg.innerHTML;
            const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
            msg.innerHTML = html.replace(regex, '<mark class="search-highlight">$1</mark>');
        }
    });
    
    if (matchCount > 0) {
        searchResults.textContent = `${matchCount} result${matchCount > 1 ? 's' : ''}`;
        currentSearchIndex = -1;
        jumpToNextMatch();
    } else {
        searchResults.textContent = 'No results';
    }
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clearSearchHighlights() {
    document.querySelectorAll('.search-highlight').forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
    });
}

function jumpToNextMatch() {
    if (searchMatches.length === 0) return;
    currentSearchIndex = (currentSearchIndex + 1) % searchMatches.length;
    const msgIndex = searchMatches[currentSearchIndex];
    const messages = document.querySelectorAll('.message-content');
    if (messages[msgIndex]) {
        messages[msgIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        messages[msgIndex].style.animation = 'highlightFlash 1s';
    }
}

// 3. Message Editing & Deletion
function editMessage(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv) return;
    
    const messageContent = messageDiv.querySelector('.message-content');
    const currentText = messageContent.textContent;
    
    // Create input field
    const input = document.createElement('textarea');
    input.value = currentText;
    input.className = 'message-edit-input';
    input.rows = 3;
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-primary btn-small';
    saveBtn.textContent = 'Save';
    saveBtn.onclick = () => saveEditedMessage(messageId, input.value);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary btn-small';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => cancelEdit(messageId);
    
    const editControls = document.createElement('div');
    editControls.className = 'edit-controls';
    editControls.appendChild(saveBtn);
    editControls.appendChild(cancelBtn);
    
    messageContent.innerHTML = '';
    messageContent.appendChild(input);
    messageContent.appendChild(editControls);
    input.focus();
}

function saveEditedMessage(messageId, newText) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv) return;
    
    const messageContent = messageDiv.querySelector('.message-content');
    messageContent.innerHTML = markdownToHtml(newText);
    
    // Update history
    const msgIndex = chatHistory.findIndex(m => m.messageId === messageId);
    if (msgIndex > -1) {
        chatHistory[msgIndex].content = newText;
    }
    
    editedMessages[messageId] = true;
    const timestampDiv = messageDiv.querySelector('.message-timestamp');
    if (timestampDiv) {
        timestampDiv.textContent = formatTimestamp(messageTimestamps[messageId]) + ' (edited)';
    }
}

function cancelEdit(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv) return;
    
    const msgIndex = chatHistory.findIndex(m => m.messageId === messageId);
    if (msgIndex > -1) {
        const messageContent = messageDiv.querySelector('.message-content');
        messageContent.innerHTML = markdownToHtml(chatHistory[msgIndex].content);
    }
}

function deleteMessage(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageDiv) {
        messageDiv.style.animation = 'fadeOut 0.3s';
        setTimeout(() => {
            messageDiv.remove();
        }, 300);
    }
    
    // Remove from history
    chatHistory = chatHistory.filter(m => m.messageId !== messageId);
    delete messageTimestamps[messageId];
    delete editedMessages[messageId];
}

// 4. Rich Text Formatting Toolbar
function formatText(type) {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    
    const start = chatInput.selectionStart;
    const end = chatInput.selectionEnd;
    const selectedText = chatInput.value.substring(start, end);
    let formattedText = '';
    
    switch(type) {
        case 'bold':
            formattedText = `**${selectedText || 'bold text'}**`;
            break;
        case 'italic':
            formattedText = `*${selectedText || 'italic text'}*`;
            break;
        case 'code':
            formattedText = `\`${selectedText || 'code'}\``;
            break;
        case 'link':
            formattedText = `[${selectedText || 'link text'}](url)`;
            break;
    }
    
    chatInput.value = chatInput.value.substring(0, start) + formattedText + chatInput.value.substring(end);
    chatInput.focus();
    chatInput.setSelectionRange(start + formattedText.length, start + formattedText.length);
}

function handleInputKeyDown(e) {
    // Ctrl+B for bold, Ctrl+I for italic
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        formatText('bold');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        formatText('italic');
    }
}

// 5. Export Formats
function showExportMenu() {
    const menu = document.getElementById('exportMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function exportChat(format) {
    let content = '';
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'txt') {
        content = `Rajath's AI Avatar - Conversation Export\n`;
        content += `Generated: ${new Date().toLocaleString()}\n`;
        content += `Visitor: ${visitorName} | Company: ${visitorCompany}\n`;
        content += `${'='.repeat(60)}\n\n`;
        
        chatHistory.forEach(msg => {
            const role = msg.role === 'user' ? 'You' : "Rajath's AI Avatar";
            const time = msg.timestamp ? formatTimestamp(msg.timestamp) : '';
            content += `[${role}]${time ? ' (' + time + ')' : ''}:\n${msg.content}\n\n`;
        });
        
        downloadFile(content, `conversation_${timestamp}.txt`, 'text/plain');
    } else if (format === 'md') {
        content = `# Rajath's AI Avatar - Conversation\n\n`;
        content += `**Generated:** ${new Date().toLocaleString()}\n`;
        content += `**Visitor:** ${visitorName} | **Company:** ${visitorCompany}\n\n`;
        content += `---\n\n`;
        
        chatHistory.forEach(msg => {
            const role = msg.role === 'user' ? '**You**' : "**Rajath's AI Avatar**";
            const time = msg.timestamp ? ` *(${formatTimestamp(msg.timestamp)})*` : '';
            content += `${role}${time}:\n\n${msg.content}\n\n---\n\n`;
        });
        
        downloadFile(content, `conversation_${timestamp}.md`, 'text/markdown');
    } else if (format === 'html') {
        content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Rajath's AI Avatar - Conversation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        .message { margin: 20px 0; padding: 15px; border-radius: 8px; }
        .user { background: #e3f2fd; }
        .assistant { background: #f5f5f5; }
        .timestamp { font-size: 12px; color: #666; margin-top: 5px; }
    </style>
</head>
<body>
    <h1>Rajath's AI Avatar - Conversation</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Visitor:</strong> ${visitorName} | <strong>Company:</strong> ${visitorCompany}</p>
    <hr>`;
        
        chatHistory.forEach(msg => {
            const role = msg.role === 'user' ? 'user' : 'assistant';
            const name = msg.role === 'user' ? 'You' : "Rajath's AI Avatar";
            const time = msg.timestamp ? `<div class="timestamp">${formatTimestamp(msg.timestamp)}</div>` : '';
            content += `<div class="message ${role}"><strong>${name}:</strong><br>${msg.content.replace(/\n/g, '<br>')}${time}</div>`;
        });
        
        content += `</body></html>`;
        downloadFile(content, `conversation_${timestamp}.html`, 'text/html');
    } else if (format === 'json') {
        const data = {
            metadata: {
                visitor: visitorName,
                company: visitorCompany,
                exported: new Date().toISOString()
            },
            messages: chatHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp || null
            }))
        };
        downloadFile(JSON.stringify(data, null, 2), `conversation_${timestamp}.json`, 'application/json');
    }
    
    showExportMenu(); // Close menu
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// 6. Text-to-Speech
function toggleTextToSpeech() {
    textToSpeechEnabled = !textToSpeechEnabled;
    const btn = document.getElementById('ttsBtn');
    if (btn) {
        btn.classList.toggle('active', textToSpeechEnabled);
        btn.title = textToSpeechEnabled ? 'Disable Text-to-Speech' : 'Enable Text-to-Speech';
    }
    
    if (textToSpeechEnabled && 'speechSynthesis' in window) {
        // Read the last assistant message
        const lastAssistantMsg = [...chatHistory].reverse().find(m => m.role === 'assistant');
        if (lastAssistantMsg) {
            speakText(lastAssistantMsg.content);
        }
    } else {
        stopSpeaking();
    }
}

function speakText(text) {
    if (!('speechSynthesis' in window)) {
        alert('Text-to-speech is not supported in your browser.');
        return;
    }
    
    stopSpeaking();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    currentSpeech = utterance;
    speechSynthesis.speak(utterance);
}

function stopSpeaking() {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    currentSpeech = null;
}

// Click outside to close export menu
document.addEventListener('click', (e) => {
    const exportMenu = document.getElementById('exportMenu');
    const exportBtn = document.getElementById('exportBtn');
    if (exportMenu && exportBtn && !exportMenu.contains(e.target) && !exportBtn.contains(e.target)) {
        exportMenu.classList.add('hidden');
    }
});

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}
