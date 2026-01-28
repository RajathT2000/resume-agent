# Resume Agent - AI Avatar

An AI-powered chatbot that answers questions about Rajath's professional background, experience, and skills using GPT-4.

## Features
- Interactive chat interface powered by Gradio
- Resume parsing from PDF
- Natural conversation about professional experience
- Personalized responses based on visitor's company
- Job description match analyzer
- Company fit analysis

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
4. Run the application locally:
   ```bash
   python main.py
   ```

## Deployment on Hugging Face Spaces

This project is optimized for deployment on Hugging Face Spaces:

1. **Create a new Space** on [Hugging Face Spaces](https://huggingface.co/spaces)
   - Choose "Gradio" as the SDK
   - Select Python runtime

2. **Connect your GitHub repository** or push code directly

3. **Set your OpenAI API key** as a Secret:
   - Go to Settings → Secrets
   - Add `OPENAI_API_KEY` with your API key value

4. **The app will auto-deploy** - HF Spaces detects `app.py` automatically

## Required Files
- `files/rajath.pdf` - Resume PDF file
- `files/summary.txt` - Professional summary

## Local Development

For local testing, run:
```bash
python main.py
```

The app will be available at `http://localhost:7860`

## Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required)
