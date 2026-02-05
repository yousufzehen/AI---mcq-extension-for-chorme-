# MCQ Solver - Setup Guide

Complete setup instructions for the AI-Powered MCQ Solver Chrome Extension and Backend.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Extension Setup](#extension-setup)
4. [Configuration](#configuration)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js** (v18.0.0 or higher)
  - Download: https://nodejs.org/
  - Verify: `node --version`

- **npm** (comes with Node.js)
  - Verify: `npm --version`

- **Google Chrome** (latest version)
  - Download: https://www.google.com/chrome/

### Required API Keys (choose one)

**Option 1: OpenAI** (Recommended for accuracy)
- Create account: https://platform.openai.com/signup
- Get API key: https://platform.openai.com/api-keys
- Models: GPT-4, GPT-4 Turbo, GPT-4o, GPT-4o-mini

**Option 2: Ollama** (Free, runs locally)
- Install: https://ollama.ai/download
- Models: llama2, mistral, codellama, phi

---

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd mcq-solver/backend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- express (Web framework)
- cors (Cross-origin resource sharing)
- dotenv (Environment variables)
- multer (File upload handling)
- tesseract.js (OCR engine)
- pdf-parse (PDF text extraction)
- openai (OpenAI API client)
- axios (HTTP client)

### Step 3: Create Environment File

```bash
cp .env.example .env
```

### Step 4: Configure Environment Variables

Edit `.env` file:

#### For OpenAI:

```env
PORT=3000
NODE_ENV=development

AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4o-mini

OCR_LANGUAGE=eng
```

#### For Ollama (Local LLM):

```env
PORT=3000
NODE_ENV=development

AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2

OCR_LANGUAGE=eng
```

### Step 5: Install Ollama (if using local LLM)

**macOS:**
```bash
brew install ollama
ollama pull llama2
ollama serve
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama2
ollama serve
```

**Windows:**
- Download from https://ollama.ai/download/windows
- Run installer
- Open PowerShell:
```powershell
ollama pull llama2
ollama serve
```

### Step 6: Start Backend Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

### Step 7: Verify Backend

Open browser and visit:
- Main endpoint: http://localhost:3000
- Health check: http://localhost:3000/health

You should see:
```json
{
  "status": "healthy",
  "services": {
    "ai": {
      "status": "healthy",
      "provider": "openai",
      "model": "gpt-4o-mini"
    }
  }
}
```

---

## Extension Setup

### Step 1: Open Chrome Extensions

1. Open Google Chrome
2. Navigate to: `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)

### Step 2: Load Extension

1. Click **"Load unpacked"**
2. Navigate to `mcq-solver/extension` folder
3. Click **"Select Folder"**

### Step 3: Verify Installation

You should see:
- Extension name: **MCQ Assistant**
- Status: Enabled
- Icon appears in Chrome toolbar

### Step 4: Create Extension Icon (Optional)

The extension needs a 128x128 PNG icon at:
```
mcq-solver/extension/assets/icon.png
```

You can:
- Create your own icon
- Use an AI image generator
- Download a free icon from icon libraries

Recommended tools:
- Canva: https://www.canva.com/
- DALL-E: https://labs.openai.com/
- Icons8: https://icons8.com/

---

## Configuration

### Backend Configuration

#### Port Configuration

Change port in `.env`:
```env
PORT=3001  # Use different port
```

Update extension settings to match.

#### AI Model Selection

**OpenAI Models:**
- `gpt-4o-mini` - Fast, affordable (recommended)
- `gpt-4o` - Balanced performance
- `gpt-4-turbo` - High accuracy
- `gpt-4` - Highest accuracy

**Ollama Models:**
- `llama2` - General purpose
- `mistral` - Fast and accurate
- `phi` - Lightweight
- `codellama` - Code-focused

#### OCR Language

For non-English content:
```env
OCR_LANGUAGE=eng+spa  # English + Spanish
OCR_LANGUAGE=fra      # French only
```

See supported languages: http://localhost:3000/api/ocr/languages

### Extension Configuration

1. Click extension icon in Chrome toolbar
2. Click settings (gear icon)
3. Configure:
   - **Backend URL**: `http://localhost:3000` (or your port)
   - **Stealth Mode**: ON (recommended for exams)
   - **Auto Highlight**: ON

---

## Testing

### Test 1: Backend Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 123.45,
  "services": {
    "ai": {
      "status": "healthy",
      "provider": "openai"
    }
  }
}
```

### Test 2: Answer Endpoint

```bash
curl -X POST http://localhost:3000/api/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"]
  }'
```

Expected response:
```json
{
  "success": true,
  "answer": "Paris",
  "confidence": 95,
  "explanation": "Paris is the capital and largest city of France."
}
```

### Test 3: Extension Detection

1. Visit a webpage with MCQs (e.g., quiz platform)
2. Click extension icon
3. Click **"Detect MCQs"**
4. Verify detected questions appear in the list

### Test 4: End-to-End

1. Detect MCQs on a page
2. Click **"Solve All"**
3. Verify:
   - Processing indicators appear
   - Answers are highlighted
   - Confidence scores are shown
   - Explanations are provided

---

## Troubleshooting

### Backend Issues

#### "Cannot find module 'dotenv'"
```bash
cd backend
npm install
```

#### "OpenAI API key not configured"
- Check `.env` file exists
- Verify `OPENAI_API_KEY` is set
- Ensure no extra spaces or quotes

#### "Ollama is not running"
```bash
# Start Ollama
ollama serve

# In another terminal
ollama pull llama2
```

#### Port already in use
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process or change port in .env
```

#### CORS errors
- Verify `ALLOWED_ORIGINS` in `.env` includes `chrome-extension://*`
- Check browser console for specific origin
- Add origin to `.env` if needed

### Extension Issues

#### Extension not loading
- Verify Developer Mode is enabled
- Check for errors in `chrome://extensions/`
- Look at extension console (background page)

#### "No MCQs detected"
- Page may not have supported format
- Try different extraction strategies
- Check browser console for errors

#### "Backend may be offline"
- Verify backend is running: `curl http://localhost:3000`
- Check extension settings for correct URL
- Look for CORS errors in console

#### Highlights not appearing
- Check Auto Highlight is enabled
- Verify answers match available options
- Look for JavaScript errors in console

### OCR Issues

#### Low confidence scores
- Use higher quality images
- Ensure good contrast
- Avoid handwritten text
- Check image orientation

#### No text extracted
- Verify file type (JPG, PNG, PDF)
- Check file size (under 10MB)
- Ensure text is not encrypted

---

## Production Deployment

### Backend

**Recommended platforms:**
- Heroku: https://www.heroku.com/
- Railway: https://railway.app/
- Render: https://render.com/
- AWS EC2: https://aws.amazon.com/ec2/

**Environment variables:**
```env
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=your-key
ALLOWED_ORIGINS=chrome-extension://*,https://yourdomain.com
```

### Extension

**For public release:**
1. Create production build
2. Submit to Chrome Web Store
3. Follow review guidelines
4. Publish after approval

**Chrome Web Store:**
- Developer dashboard: https://chrome.google.com/webstore/devconsole
- One-time registration fee: $5

---

## Next Steps

1. ✅ Backend running successfully
2. ✅ Extension loaded in Chrome
3. ✅ Configuration complete
4. ✅ Tests passing

**You're ready to use MCQ Assistant!**

For architecture details, see: [ARCHITECTURE.md](ARCHITECTURE.md)

For usage instructions, see: [README.md](../README.md)