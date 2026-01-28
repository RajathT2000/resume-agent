# Rajath's AI Avatar - Professional Career Website

A modern, beautiful website featuring an AI-powered chatbot that answers questions about Rajath's professional background, experience, and skills using GPT-4.

## Features
- 🎨 **Modern, Professional Design** - Beautiful custom website with gradient colors
- 💬 **Interactive Chat Interface** - Real-time conversation with AI avatar
- 📄 **Resume Parsing** - Automatic extraction from PDF
- 🎯 **Company Fit Analysis** - Personalized insights for recruiters
- 📋 **Job Description Analyzer** - Match score and detailed analysis
- 🎨 **Responsive Design** - Works perfectly on all devices

## Tech Stack
- **Backend**: FastAPI (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **AI**: OpenAI GPT-4o-mini
- **Styling**: Modern gradient design with professional color palette

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
4. Run the application:
   ```bash
   python app.py
   ```
5. Open your browser to `http://localhost:8000`

## Deployment

### Hugging Face Spaces
1. Create a new Space with **Docker** SDK (or use custom Dockerfile)
2. Connect your GitHub repository
3. Set `OPENAI_API_KEY` as a Secret
4. The app will auto-deploy

### Render / Railway / Other Platforms
- Set start command: `python app.py`
- Set `PORT` environment variable (auto-detected)
- Add `OPENAI_API_KEY` as environment variable

## Project Structure
```
├── app.py              # FastAPI backend
├── static/
│   ├── index.html     # Main HTML page
│   ├── style.css      # Beautiful modern styles
│   └── script.js      # Frontend JavaScript
├── files/
│   ├── rajath.pdf     # Resume PDF
│   └── summary.txt    # Professional summary
└── requirements.txt   # Python dependencies
```

## Required Files
- `files/rajath.pdf` - Resume PDF file
- `files/summary.txt` - Professional summary

## Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `PORT` - Server port (default: 8000, auto-detected on most platforms)
