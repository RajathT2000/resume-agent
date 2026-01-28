# Hugging Face Spaces entry point
# This file exposes the Gradio app for HF Spaces deployment
from main import app

# HF Spaces automatically detects and launches the 'app' variable
# CSS is handled in main.py via the Blocks constructor (works in HF Spaces)
