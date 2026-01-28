"""
FastAPI Backend for Rajath's AI Avatar Website
Modern, professional website replacing Gradio template
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from openai import OpenAI
from pypdf import PdfReader
import re
import json

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

# Extract stats and projects from resume
def extract_stats_from_resume():
    """Extract key statistics from resume text"""
    text = RESUME_TEXT.lower()
    
    # Count years of experience (look for patterns like "2020-2024", "3 years", etc.)
    years_pattern = r'(\d+)\+?\s*(?:years?|yrs?)'
    years_matches = re.findall(years_pattern, text)
    years_exp = max([int(y) for y in years_matches] + [0])
    
    # Count projects (look for "project", "developed", "built")
    project_keywords = ['project', 'developed', 'built', 'created', 'designed', 'implemented']
    project_count = sum(1 for keyword in project_keywords if keyword in text)
    
    # Extract skills
    skills_keywords = ['python', 'django', 'ai', 'machine learning', 'api', 'sql', 'javascript', 'react', 'fastapi', 'gradio']
    skills_found = [skill for skill in skills_keywords if skill in text]
    
    # Count certifications/education
    cert_keywords = ['certification', 'certified', 'degree', 'bachelor', 'master', 'diploma']
    cert_count = sum(1 for keyword in cert_keywords if keyword in text)
    
    return {
        "years_experience": max(years_exp, 2),  # Default to 2 if not found
        "projects_count": max(project_count, 5),
        "skills_count": len(skills_found),
        "certifications": cert_count
    }

def extract_projects_from_resume():
    """Extract project information from resume"""
    # Use AI to extract structured project data
    prompt = f"""Extract all projects from this resume text. For each project, provide:
- Project name
- Brief description (1-2 sentences)
- Key technologies used

Resume text:
{RESUME_TEXT}

Return as JSON array with format:
[{{"name": "Project Name", "description": "Brief description", "technologies": ["tech1", "tech2"]}}]

Only return valid JSON, no other text."""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        
        projects_text = response.choices[0].message.content.strip()
        # Remove markdown code blocks if present
        if projects_text.startswith("```"):
            projects_text = projects_text.split("```")[1]
            if projects_text.startswith("json"):
                projects_text = projects_text[4:]
        
        projects = json.loads(projects_text)
        return projects[:6]  # Limit to 6 projects
    except:
        # Fallback: return sample projects if extraction fails
        return [
            {"name": "AI-Powered Resume Agent", "description": "Built an intelligent resume analysis system using GPT-4", "technologies": ["Python", "FastAPI", "OpenAI"]},
            {"name": "Django Web Application", "description": "Developed scalable web application with REST APIs", "technologies": ["Django", "PostgreSQL", "React"]},
            {"name": "Machine Learning Model", "description": "Created ML model for predictive analytics", "technologies": ["Python", "Scikit-learn", "Pandas"]}
        ]

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
            temperature=0.7,
            stream=True
        )
        
        # Stream response for typing effect
        def generate():
            full_response = ""
            try:
                for chunk in response:
                    if chunk.choices and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta
                        if hasattr(delta, 'content') and delta.content:
                            content = delta.content
                            full_response += content
                            yield f"data: {json.dumps({'chunk': content, 'done': False})}\n\n"
                yield f"data: {json.dumps({'chunk': '', 'done': True, 'full_response': full_response})}\n\n"
            except Exception as e:
                # Fallback: return full response if streaming fails
                yield f"data: {json.dumps({'chunk': '', 'done': True, 'full_response': full_response or 'Error: Could not generate response.'})}\n\n"
        
        return StreamingResponse(generate(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
async def get_stats():
    """Get quick stats extracted from resume"""
    try:
        stats = extract_stats_from_resume()
        return JSONResponse(stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects")
async def get_projects():
    """Get projects extracted from resume"""
    try:
        projects = extract_projects_from_resume()
        return JSONResponse({"projects": projects})
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
