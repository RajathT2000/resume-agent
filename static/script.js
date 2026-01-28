// Global state
let visitorName = "Guest";
let visitorCompany = "Unknown";
let chatHistory = [];
let projects = [];
let currentProjectIndex = 0;
let recognition = null;
let isListening = false;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const welcomeForm = document.getElementById('welcomeForm');
    welcomeForm.addEventListener('submit', handleWelcomeSubmit);
    
    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('keypress', handleKeyPress);
    
    // Initialize voice recognition
    initVoiceRecognition();
    
    // Load stats and projects
    loadStats();
    loadProjects();
    
    // Animate elements on page load
    animateOnLoad();
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
    
    // Show first tab by default
    switchTab('companyFit');
    
    // Load stats and projects (they're already loaded, but ensure they're visible)
    // Stats and projects load on DOMContentLoaded, so they should be ready
    
    // Auto-analyze company fit
    analyzeCompanyFit();
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
        resultBox.innerHTML = `<div class="analysis-content">${markdownToHtml(data.analysis)}</div>`;
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
        contentBox.innerHTML = `<div class="analysis-content">${markdownToHtml(data.analysis)}</div>`;
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
            
            // Simulate typing effect
            let typedText = '';
            for (let i = 0; i < responseText.length; i++) {
                typedText += responseText[i];
                messageContent.innerHTML = markdownToHtml(typedText);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                await new Promise(resolve => setTimeout(resolve, 20)); // 20ms delay per character
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

// Scroll to chat section
function scrollToChat() {
    const chatSection = document.querySelector('.chat-section');
    chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Focus on input after scroll
    setTimeout(() => {
        document.getElementById('chatInput').focus();
    }, 500);
}

// Load Stats
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        // Animate counters
        animateCounter('statYears', stats.years_experience, 0, 2000);
        animateCounter('statProjects', stats.projects_count, 0, 2000);
        animateCounter('statSkills', stats.skills_count, 0, 2000);
        animateCounter('statCerts', stats.certifications, 0, 2000);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Animate Counter
function animateCounter(elementId, target, start, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * easeOut);
        
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target;
        }
    }
    
    requestAnimationFrame(update);
}

// Load Projects
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        projects = data.projects || [];
        renderProjects();
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Render Projects Carousel
function renderProjects() {
    const container = document.getElementById('projectsContainer');
    const indicators = document.getElementById('carouselIndicators');
    
    if (!container || projects.length === 0) return;
    
    container.innerHTML = '';
    indicators.innerHTML = '';
    
    projects.forEach((project, index) => {
        const projectCard = document.createElement('div');
        projectCard.className = `project-card ${index === 0 ? 'active' : ''}`;
        projectCard.innerHTML = `
            <h3>${escapeHtml(project.name)}</h3>
            <p>${escapeHtml(project.description)}</p>
            <div class="project-tech">
                ${project.technologies.map(tech => `<span class="tech-tag">${escapeHtml(tech)}</span>`).join('')}
            </div>
        `;
        container.appendChild(projectCard);
        
        const indicator = document.createElement('button');
        indicator.className = `indicator ${index === 0 ? 'active' : ''}`;
        indicator.onclick = () => goToProject(index);
        indicators.appendChild(indicator);
    });
    
    // Auto-rotate carousel every 5 seconds
    if (projects.length > 1) {
        setInterval(() => {
            moveCarousel(1);
        }, 5000);
    }
}

// Move Carousel
function moveCarousel(direction) {
    currentProjectIndex += direction;
    if (currentProjectIndex < 0) currentProjectIndex = projects.length - 1;
    if (currentProjectIndex >= projects.length) currentProjectIndex = 0;
    goToProject(currentProjectIndex);
}

// Go to Specific Project
function goToProject(index) {
    if (index < 0 || index >= projects.length) return;
    
    currentProjectIndex = index;
    const cards = document.querySelectorAll('.project-card');
    const indicators = document.querySelectorAll('.indicator');
    
    cards.forEach((card, i) => {
        card.classList.toggle('active', i === index);
    });
    
    indicators.forEach((indicator, i) => {
        indicator.classList.toggle('active', i === index);
    });
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
