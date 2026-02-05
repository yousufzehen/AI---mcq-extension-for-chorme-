# AI---mcq-extension-for-chorme-
AI-powered Chrome extension that identifies MCQs on web pages and provides answers with explanations using a secure backend and LLM integration.
🎯 Features
Core Capabilities:

Automatic MCQ Detection across multiple formats
AI-Powered Solving using GPT-4 or local LLMs
Confidence Scoring (0-100% reliability)
OCR Support for images and PDFs
Stealth Mode with human-like behavior
Batch Processing for multiple questions

Platform Support:

Google Forms, Quizlet, Canvas LMS
Generic quiz websites
Custom exam portals

🚀 Quick Start
Prerequisites:

Node.js v18+
Google Chrome
OpenAI API Key OR Ollama installed

5-Minute Setup:

Backend Setup

bashcd backend
npm install
cp .env.example .env
# Add your OPENAI_API_KEY
npm start

Load Extension


Chrome → chrome://extensions/
Enable "Developer mode"
Click "Load unpacked"
Select the extension folder


Test It


Visit any quiz page
Click extension icon
Click "Detect MCQs"
Click "Solve All"

💡 Usage

Navigate to a quiz page
Click the extension icon
Click "Detect MCQs" to find questions
Click "Solve All" for batch processing
Review answers with confidence scores
Click "Clear Highlights" to reset

⚙️ Configuration
Backend (.env):
envAI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini
Extension Settings:

Backend URL (default: localhost:3000)
Stealth Mode (ON/OFF)
Auto Highlight (ON/OFF)

📚 API Documentation
The backend provides REST endpoints:

POST /api/answer - Answer single MCQ
POST /api/answer/batch - Answer multiple MCQs
POST /api/ocr - Extract text from images/PDFs
GET /health - Health check

⚠️ Disclaimer
This tool is designed for educational purposes, self-assessment, and accessibility support. Use responsibly and ethically—respect academic integrity policies.

Would you like me to explain any specific part in more detail? I can walk you through:

How to set up the backend
How the extension works
How to customize it for your needs
The architecture and code structure
