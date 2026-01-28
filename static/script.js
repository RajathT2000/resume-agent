// Global state
let visitorName = "Guest";
let visitorCompany = "Unknown";
let chatHistory = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const welcomeForm = document.getElementById('welcomeForm');
    welcomeForm.addEventListener('submit', handleWelcomeSubmit);
    
    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('keypress', handleKeyPress);
});

// Welcome Modal Handler
function handleWelcomeSubmit(e) {
    e.preventDefault();
    visitorName = document.getElementById('visitorName').value || "Guest";
    visitorCompany = document.getElementById('visitorCompany').value || "Unknown";
    
    // Hide modal, show main app
    document.getElementById('welcomeModal').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    
    // Update welcome banner
    const welcomeText = document.getElementById('welcomeText');
    welcomeText.textContent = `👋 Welcome ${visitorName} from ${visitorCompany}! 🎉`;
    
    // Auto-analyze company fit
    analyzeCompanyFit();
}

// Toggle Section Visibility
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    section.classList.toggle('hidden');
}

// Analyze Company Fit
async function analyzeCompanyFit() {
    showLoading();
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
        const resultBox = document.getElementById('companyFitResult');
        resultBox.innerHTML = `<div class="analysis-content">${markdownToHtml(data.analysis)}</div>`;
        
        // Show section if hidden
        document.getElementById('companyFit').classList.remove('hidden');
    } catch (error) {
        console.error('Error analyzing company fit:', error);
        alert('Error analyzing company fit. Please try again.');
    } finally {
        hideLoading();
    }
}

// Analyze Job Description
async function analyzeJob() {
    const jobDescription = document.getElementById('jobDescription').value;
    if (!jobDescription.trim()) {
        alert('Please paste a job description first.');
        return;
    }
    
    showLoading();
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
        const resultBox = document.getElementById('jobAnalysisResult');
        const contentBox = document.getElementById('jobAnalysisContent');
        contentBox.innerHTML = `<div class="analysis-content">${markdownToHtml(data.analysis)}</div>`;
        resultBox.classList.remove('hidden');
        
        // Scroll to result
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        console.error('Error analyzing job:', error);
        alert('Error analyzing job description. Please try again.');
    } finally {
        hideLoading();
    }
}

// Send Chat Message
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
    
    showLoading();
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
        
        const data = await response.json();
        
        // Add assistant response to UI
        addMessageToChat('assistant', data.response);
        
        // Add to history
        chatHistory.push({ role: 'assistant', content: data.response });
    } catch (error) {
        console.error('Error sending message:', error);
        addMessageToChat('assistant', 'Sorry, I encountered an error. Please try again.');
    } finally {
        hideLoading();
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
    messageDiv.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;
    
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

// Show/Hide Loading
function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
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
