// Global state
let visitorName = "Guest";
let visitorCompany = "Unknown";
let chatHistory = [];
let recognition = null;
let isListening = false;
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const welcomeForm = document.getElementById('welcomeForm');
    welcomeForm.addEventListener('submit', handleWelcomeSubmit);
    
    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('keypress', handleKeyPress);
    
    // Initialize voice recognition
    initVoiceRecognition();
    
    // Apply dark mode if enabled
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        updateDarkModeIcon();
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
    e.preventDefault();
    visitorName = document.getElementById('visitorName').value || "Guest";
    visitorCompany = document.getElementById('visitorCompany').value || "Unknown";
    
    // Hide modal, show main app
    document.getElementById('welcomeModal').classList.add('hidden');
    const mainApp = document.getElementById('mainApp');
    mainApp.classList.remove('hidden');
    
    // Animate main app appearance
    setTimeout(() => {
        animateOnLoad();
    }, 100);
    
    // Update welcome banner
    const welcomeText = document.getElementById('welcomeText');
    welcomeText.textContent = `👋 Welcome ${visitorName} from ${visitorCompany}! 🎉`;
    
    // Load shared analysis if URL has parameters
    loadSharedAnalysis();
    
    // Show first tab by default (Job Analysis)
    switchTab('jobAnalysis');
    
    // Add welcome message to chat
    addWelcomeMessage();
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
                <button class="btn-icon-small" onclick="copyToClipboard('companyFitResult')" title="Copy Result">
                    📋
                </button>
            </div>
            <div class="analysis-content">${analysisHtml}</div>
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
    addMessageToChat('user', message);
    
    // Add to history
    chatHistory.push({ role: 'user', content: message });
    
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
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant fade-in';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '🤖';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = '';
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
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
                                // Update message with typing effect
                                messageContent.innerHTML = markdownToHtml(fullResponse);
                                chatMessages.scrollTop = chatMessages.scrollHeight;
                            }
                            if (data.done) {
                                // Add to history
                                chatHistory.push({ role: 'assistant', content: data.full_response || fullResponse });
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
            const responseText = data.response || '';
            
            // Simulate typing effect (faster)
            let typedText = '';
            for (let i = 0; i < responseText.length; i++) {
                typedText += responseText[i];
                messageContent.innerHTML = markdownToHtml(typedText);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                await new Promise(resolve => setTimeout(resolve, 5)); // 5ms delay per character (faster)
            }
            
            chatHistory.push({ role: 'assistant', content: responseText });
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
    if (event.key === 'Enter') {
        sendMessage();
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

// Convert Markdown to HTML (simple converter)
function markdownToHtml(markdown) {
    if (!markdown) return '';
    
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
    addMessageToChat('assistant', welcomeMsg);
    
    // Add to history
    chatHistory.push({ role: 'assistant', content: welcomeMsg });
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
}

function updateDarkModeIcon() {
    const darkModeBtn = document.getElementById('darkModeToggle');
    if (darkModeBtn) {
        darkModeBtn.textContent = isDarkMode ? '☀️' : '🌙';
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
