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
SYSTEM_PROMPT = f"""
You are {NAME}. You are answering questions on your personal website about your career, 
background, skills, and experience.

Your goal is to represent {NAME} faithfully and professionally to potential employers or clients.

CONTEXT FROM RESUME:
{RESUME_TEXT}

RULES:
1. Stay in character as {NAME} (use 'I', 'my', 'me').
2. Be professional, engaging, and concise.
3. If a question is asked that is NOT covered by the resume or your general knowledge 
   of being a Software Engineer, politely say you aren't sure but offer to get back to them.
"""

# --- 3. CHAT FUNCTION ---
def chat_function(message, history):
    # Assemble the conversation history for the AI
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Gradio history comes in as a list of dictionaries in 'messages' format
    for turn in history:
        messages.append(turn)
    
    messages.append({"role": "user", "content": message})

    # Call OpenAI
    response = client.chat.completions.create(
        model="gpt-4o-mini",  # Fast and smart for resume chats
        messages=messages,
        temperature=0.7 # Makes the personality feel more 'human'
    )
    
    return response.choices[0].message.content

# --- 4. THE WEB INTERFACE ---
app = gr.ChatInterface(
    fn=chat_function,
    title=f"Chat with {NAME}'s AI Avatar",
    description=f"Ask me about my experience at QBurst, my AI projects, or my technical skills!",
    type="messages",
    examples=["What is your experience with Django?", "Tell me about your AI projects.", "Where did you study?"],
    theme="soft"
)

if __name__ == "__main__":
    app.launch(
        server_name="0.0.0.0",
        server_port=int(os.getenv("PORT", 7860)),
        share=False
    )