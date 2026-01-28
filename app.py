"""
FastAPI Backend for Rajath's AI Avatar Website
Modern, professional website replacing Gradio template
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from openai import OpenAI
from pypdf import PdfReader

# Load API Key
load_dotenv()
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Initialize FastAPI
app = FastAPI(title="Rajath's AI Avatar")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load resume data
def load_resume_context():
    text_context = ""
    try:
        reader = PdfReader("files/rajath.pdf")
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text_context += content
    except Exception as e:
        print(f"Could not read resume PDF: {e}")
    return text_context

RESUME_TEXT = load_resume_context()

with open('files/summary.txt', 'r') as file:
    SUMMARY_CONTENT = file.read()

NAME = "Rajath"

# Request models
class ChatMessage(BaseModel):
    message: str
    history: List[dict] = []
    visitor_name: str = "Guest"
    visitor_company: str = "Unknown"

class CompanyFitRequest(BaseModel):
    company_name: str
    visitor_name: str = "Guest"

class JobAnalysisRequest(BaseModel):
    job_description: str
    company_name: str = "Unknown"

# Helper functions
def create_system_prompt(visitor_name: str, visitor_company: str) -> str:
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

# API Routes
@app.get("/")
async def read_root():
    return FileResponse("static/index.html")

@app.post("/api/chat")
async def chat(request: ChatMessage):
    try:
        system_prompt = create_system_prompt(request.visitor_name, request.visitor_company)
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add history
        for msg in request.history:
            if msg.get("role") == "user":
                messages.append({"role": "user", "content": msg["content"]})
            elif msg.get("role") == "assistant":
                messages.append({"role": "assistant", "content": msg["content"]})
        
        messages.append({"role": "user", "content": request.message})
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7
        )
        
        return JSONResponse({
            "response": response.choices[0].message.content
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-company-fit")
async def analyze_company_fit(request: CompanyFitRequest):
    try:
        if not request.company_name or request.company_name.lower() == "unknown":
            return JSONResponse({"analysis": "Please enter your company name to see a personalized analysis."})
        
        prompt = f"""Analyze why {NAME} would be an excellent fit for {request.company_name}. 

Based on this resume context:
{RESUME_TEXT}

Provide:
1. Three specific ways {NAME}'s Django/Python/AI skills solve challenges in {request.company_name}'s domain
2. Relevant project experience that aligns with {request.company_name}'s tech stack
3. Cultural or technical fit insights

Be specific, professional, and concise. Format with bullet points."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        return JSONResponse({
            "analysis": response.choices[0].message.content
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-job")
async def analyze_job(request: JobAnalysisRequest):
    try:
        if not request.job_description or request.job_description.strip() == "":
            return JSONResponse({"analysis": "⚠️ Please paste a job description to analyze."})
        
        prompt = f"""You are analyzing how well {NAME} matches this job description for {request.company_name}.

RAJATH'S RESUME:
{RESUME_TEXT}

JOB DESCRIPTION:
{request.job_description}

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
        
        return JSONResponse({
            "analysis": response.choices[0].message.content
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
