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
        resultBox.innerHTML = `<pre>${escapeHtml(data.analysis)}</pre>`;
        
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
        contentBox.innerHTML = `<pre>${escapeHtml(data.analysis)}</pre>`;
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
