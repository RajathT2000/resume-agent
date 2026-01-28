import os
import gradio as gr
from dotenv import load_dotenv
from openai import OpenAI
from pypdf import PdfReader

# Load API Key
load_dotenv()
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# --- 1. RESUME DATA EXTRACTION ---
def load_resume_context():
    text_context = ""
    try:
        # Extracts text from your PDF
        reader = PdfReader("files/rajath.pdf")
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text_context += content
    except Exception as e:
        print(f"Update: Could not find or read 'files/rajath.pdf'. Error: {e}")
    return text_context

RESUME_TEXT = load_resume_context()

# Summary of the profile
with open('files/summary.txt', 'r') as file:
    summary_content = file.read()

# --- 2. AI CHARACTER DEFINITION ---
NAME = "Rajath"

# Company brand colors for theme matching
COMPANY_COLORS = {
    "google": "#4285F4",
    "amazon": "#FF9900",
    "microsoft": "#00A4EF",
    "apple": "#000000",
    "meta": "#0A66C2",
    "tesla": "#E82127",
    "macquarie": "#000000",
    "cisco": "#00BCEB",
    "dell": "#007DB8",
    "jp morgan": "#117DBA",
}

def get_company_color(company_name):
    """Get brand color for a company if known"""
    company_lower = company_name.lower()
    for key, color in COMPANY_COLORS.items():
        if key in company_lower:
            return color
    return "#4285F4"  # Default Gradio blue

def create_system_prompt(visitor_name, visitor_company):
    """Create personalized system prompt"""
    company_context = ""
    if visitor_company and visitor_company.lower() != "unknown":
        company_context = f"""
The visitor is from {visitor_company}. Tailor your responses to highlight how {NAME}'s 
Django/Python/AI expertise can solve real challenges in their company's domain."""
    
    return f"""
You are {NAME}. You are answering questions on your personal website about your career, 
background, skills, and experience.

You are speaking with {visitor_name} from {visitor_company}.

Your goal is to represent {NAME} faithfully and professionally while engaging this specific visitor.

CONTEXT FROM RESUME:
{RESUME_TEXT}

RULES:
1. Stay in character as {NAME} (use 'I', 'my', 'me').
2. Be professional, engaging, and concise.
3. Provide a Confidence Score (%) at the end of every answer.
4. If information isn't explicitly in the resume, state: "I am inferring this based on my profile" and explain your reasoning.
5. For skills not in the resume, offer a 'Learning Roadmap' showing how existing expertise bridges the gap.
6. Personalize responses to {visitor_company}'s industry and challenges when relevant.
7. If a question is not covered, politely say you'll get back to them.
{company_context}
"""

# --- 3. CHAT FUNCTION ---
def chat_function(message, history, visitor_name, visitor_company):
    """Main chat function with personalization"""
    system_prompt = create_system_prompt(visitor_name, visitor_company)
    
    messages = [{"role": "system", "content": system_prompt}]
    
    # Gradio ChatInterface history comes as list of tuples (user, bot)
    for user_msg, bot_msg in history:
        if user_msg:
            messages.append({"role": "user", "content": user_msg})
        if bot_msg:
            messages.append({"role": "assistant", "content": bot_msg})
    
    messages.append({"role": "user", "content": message})

    # Call OpenAI
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7
    )
    
    return response.choices[0].message.content

# --- 4. THE WEB INTERFACE WITH LANDING MODAL ---
# Custom CSS for landing modal and professional styling
custom_css = """
#landing-modal {
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    backdrop-filter: blur(5px);
}

#landing-content {
    background: white;
    border-radius: 20px;
    padding: 50px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    text-align: center;
}

#landing-content h1 {
    margin: 0 0 10px 0;
    font-size: 32px;
    color: #333;
}

#landing-content p {
    color: #666;
    margin-bottom: 30px;
    font-size: 16px;
}

.modal-hidden {
    display: none !important;
}

#main-app.blurred {
    filter: blur(5px);
    pointer-events: none;
}

.tech-badge {
    display: inline-block;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 5px 15px;
    border-radius: 20px;
    margin: 5px;
    font-size: 12px;
    font-weight: bold;
}
"""

with gr.Blocks(css=custom_css, title=f"Chat with {NAME}'s AI Avatar") as app:
    
    # Session state
    visitor_name_state = gr.State("Guest")
    visitor_company_state = gr.State("Unknown")
    auth_state = gr.State(False)
    
    # Landing modal form
    with gr.Group(visible=True) as modal_inputs:
        with gr.Column():
            gr.Markdown("# 👋 Welcome to Rajath's AI Avatar")
            gr.Markdown("### Tell me about yourself to get a personalized experience")
            name_input = gr.Textbox(label="Your Name", placeholder="e.g., Sarah Johnson", scale=1)
            company_input = gr.Textbox(label="Company Name", placeholder="e.g., Google, Amazon, or your company", scale=1)
            modal_submit = gr.Button("🚀 Let's Go!", variant="primary", size="lg")
    
    # Main app (hidden until modal is submitted)
    with gr.Group(visible=False) as main_app:
        gr.Markdown(f"# Chat with {NAME}'s AI Avatar")
        gr.Markdown("Professional AI-powered career assistant for recruiters and hiring managers")
        
        # Personalized welcome banner
        visitor_info = gr.Markdown("")
        
        # Why Rajath for Your Company section
        with gr.Accordion("🎯 Why Rajath is Perfect for Your Company", open=False) as company_fit_accordion:
            company_fit_analysis = gr.Markdown("Loading analysis...")
            analyze_fit_btn = gr.Button("🔄 Refresh Analysis", size="sm")
        
        # Job Description Analyzer
        with gr.Accordion("📋 Job Description Match Analyzer", open=False):
            gr.Markdown("**Paste a job description below and I'll analyze how Rajath's experience matches the requirements**")
            jd_input = gr.Textbox(
                label="Job Description", 
                placeholder="Paste the full job description here...",
                lines=8
            )
            analyze_jd_btn = gr.Button("Analyze Match", variant="primary")
            jd_analysis_output = gr.Markdown("")
        
        # Chat interface
        chatbot = gr.Chatbot(label="💬 Conversation", height=400, show_label=True)
        
        with gr.Row():
            msg = gr.Textbox(label="Message", placeholder="Ask me anything...", scale=4)
            submit_btn = gr.Button("Send", scale=1, variant="primary")
        
        # Examples
        gr.Examples(
            examples=[
                "What is your experience with Django?",
                "Tell me about your AI projects.",
                "Where did you study?",
                "How would you approach building a scalable API?"
            ],
            inputs=msg,
        )
    
    # Function to analyze company fit
    def analyze_company_fit(company_name, visitor_name):
        if not company_name or company_name.lower() == "unknown":
            return "Please enter your company name to see a personalized analysis."
        
        prompt = f"""Analyze why {NAME} would be an excellent fit for {company_name}. 
        
Based on this resume context:
{RESUME_TEXT}

Provide:
1. Three specific ways {NAME}'s Django/Python/AI skills solve challenges in {company_name}'s domain
2. Relevant project experience that aligns with {company_name}'s tech stack
3. Cultural or technical fit insights

Be specific, professional, and concise. Format with bullet points."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        return response.choices[0].message.content
    
    # Function to analyze job description match
    def analyze_jd_match(jd_text, company_name):
        if not jd_text or jd_text.strip() == "":
            return "⚠️ Please paste a job description to analyze."
        
        prompt = f"""You are analyzing how well {NAME} matches this job description for {company_name}.

RAJATH'S RESUME:
{RESUME_TEXT}

JOB DESCRIPTION:
{jd_text}

Provide a detailed analysis with:
1. **Match Score**: X/10 with justification
2. **Key Strengths**: 3-4 specific skills/experiences that strongly match
3. **Growth Areas**: 1-2 skills mentioned in the JD that aren't explicitly in the resume, with a 4-week learning roadmap for each
4. **Unique Value**: What makes {NAME} stand out for this role

Be honest, specific, and actionable. Format clearly with sections."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        return response.choices[0].message.content
    
    # Process landing modal submission
    def submit_modal(name, company):
        welcome_text = f"### 👋 Welcome **{name}** from **{company}**! 🎉"
        fit_analysis = analyze_company_fit(company, name)
        
        return (
            name or "Guest",
            company or "Unknown",
            True,
            gr.update(visible=False),  # Hide modal
            gr.update(visible=True),   # Show main app
            welcome_text,
            fit_analysis
        )
    
    modal_submit.click(
        submit_modal,
        inputs=[name_input, company_input],
        outputs=[
            visitor_name_state,
            visitor_company_state,
            auth_state,
            modal_inputs,
            main_app,
            visitor_info,
            company_fit_analysis
        ]
    )
    
    # Refresh company fit analysis
    analyze_fit_btn.click(
        analyze_company_fit,
        inputs=[visitor_company_state, visitor_name_state],
        outputs=company_fit_analysis
    )
    
    # Analyze JD match
    analyze_jd_btn.click(
        analyze_jd_match,
        inputs=[jd_input, visitor_company_state],
        outputs=jd_analysis_output
    )
    
    # Chat submission
    def chat_with_context(message, history, v_name, v_company):
        return chat_function(message, history, v_name, v_company)
    
    msg.submit(
        chat_with_context,
        inputs=[msg, chatbot, visitor_name_state, visitor_company_state],
        outputs=chatbot
    ).then(lambda: "", outputs=msg)
    
    submit_btn.click(
        chat_with_context,
        inputs=[msg, chatbot, visitor_name_state, visitor_company_state],
        outputs=chatbot
    ).then(lambda: "", outputs=msg)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7860))
    app.launch(
        server_name="0.0.0.0",
        server_port=port,
        share=True
    )