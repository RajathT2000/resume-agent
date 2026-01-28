# Resume Agent - AI Avatar

An AI-powered chatbot that answers questions about Rajath's professional background, experience, and skills using GPT-4.

## Features
- Interactive chat interface powered by Gradio
- Resume parsing from PDF
- Natural conversation about professional experience
- Hosted on Render

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
   python main.py
   ```

## Deployment on Render

This project is configured for deployment on Render. Make sure to:
1. Set the `OPENAI_API_KEY` environment variable in Render dashboard
2. The app will automatically use the configuration from `render.yaml`

## Required Files
- `files/rajath.pdf` - Resume PDF file
- `files/summary.txt` - Professional summary
