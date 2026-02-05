# MCQ Solver - System Architecture

Detailed technical architecture documentation for the AI-Powered MCQ Solver.

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [API Specification](#api-specification)
5. [Security & Stealth](#security--stealth)
6. [Performance Considerations](#performance-considerations)
7. [Extension Patterns](#extension-patterns)

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        WEB PAGE                              │
│  ┌────────────┐ ┌────────────┐ ┌─────────────────────────┐ │
│  │  Question  │ │   Options  │ │    MCQ Elements         │ │
│  └────────────┘ └────────────┘ └─────────────────────────┘ │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ DOM Extraction
              ▼
┌─────────────────────────────────────────────────────────────┐
│              CHROME EXTENSION (Frontend)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Content    │  │  Background  │  │     Popup UI     │  │
│  │    Script    │◄─┤Service Worker├─►│   (User Input)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
│         │                  │                                 │
│    ┌────┴────┐        ┌───┴───┐                            │
│    │Extractor│        │ API   │                            │
│    │         │        │Client │                            │
│    └─────────┘        └───┬───┘                            │
└────────────────────────────┼────────────────────────────────┘
                             │
                             │ HTTP/JSON
                             ▼
┌─────────────────────────────────────────────────────────────┐
│               NODE.JS BACKEND (API Server)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Express  │  │  Routes  │  │Services  │  │Middleware │  │
│  │  Server  ├─►│/api/*    ├─►│ AI/OCR   │  │Validation │  │
│  └──────────┘  └──────────┘  └────┬─────┘  └───────────┘  │
└─────────────────────────────────────┼────────────────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   │                                      │
                   ▼                                      ▼
        ┌──────────────────┐                  ┌─────────────────┐
        │  OpenAI API      │                  │  Ollama (Local) │
        │  (Cloud LLM)     │                  │     (LLM)       │
        └──────────────────┘                  └─────────────────┘
```

---

## Component Architecture

### Frontend Components (Chrome Extension)

#### 1. Manifest V3 Configuration
- **Purpose**: Define extension capabilities, permissions, and structure
- **Key Features**:
  - Service Worker background script (persistent connection)
  - Content scripts injection on all URLs
  - Popup UI for user interaction
  - Message passing between components

#### 2. Content Script (`content.js`)
- **Runs In**: Every webpage context
- **Responsibilities**:
  - Orchestrate MCQ detection and solving
  - Manage state (detected MCQs, processing status)
  - Listen for messages from popup
  - Coordinate utility modules
- **Key Functions**:
  - `detectMCQs()`: Trigger extraction
  - `solveMCQ()`: Solve single question
  - `solveAllMCQs()`: Batch solve
  - `clearHighlights()`: Reset page state

#### 3. Background Service Worker (`background.js`)
- **Runs In**: Extension background
- **Responsibilities**:
  - Handle API communication
  - Manage settings storage
  - Act as message relay
- **Key Functions**:
  - `handleAnalyzeQuestion()`: Send to backend
  - `handleOCR()`: Process file uploads
  - `getSettings()` / `saveSettings()`: Persistence

#### 4. Popup UI (`popup.html`, `popup.js`, `popup.css`)
- **Runs In**: Extension popup window
- **Responsibilities**:
  - User interface for controls
  - Display detected MCQs
  - Show results and confidence
  - Settings management
- **Features**:
  - Detect MCQs button
  - Solve All button
  - Individual question solving
  - Results display with confidence badges
  - Settings panel

#### 5. Utility Modules

**MCQ Extractor (`mcq-extractor.js`)**
- **Strategies**:
  1. Radio button groups
  2. List structures (ol/ul)
  3. Div-based layouts
  4. Table formats
  5. Platform-specific (Google Forms, Quizlet, Canvas)
- **Output**: Structured MCQ objects with DOM references

**Stealth Utils (`stealth.js`)**
- **Anti-Detection Features**:
  - Random delays (1-4 seconds)
  - Human-like mouse movement simulation
  - Randomized highlight styles
  - Automation detection checks
  - Variable obfuscation
- **Purpose**: Mimic human behavior to avoid detection

**Highlighter (`highlighter.js`)**
- **Responsibilities**:
  - Visual answer highlighting
  - Confidence-based styling
  - Smooth scrolling to answers
  - Badge creation
- **Styles**:
  - High confidence (≥80%): Solid green border
  - Medium confidence (60-79%): Yellow/amber
  - Low confidence (<60%): Dashed orange

### Backend Components (Node.js)

#### 1. Express Server (`server.js`)
- **Framework**: Express.js
- **Middleware Stack**:
  1. CORS handling
  2. JSON body parsing
  3. Request logging
  4. Route handlers
  5. Error handling
- **Endpoints**:
  - `GET /`: API info
  - `GET /health`: Health check
  - `POST /api/answer`: Single MCQ
  - `POST /api/answer/batch`: Multiple MCQs
  - `POST /api/ocr`: Text extraction
  - `POST /api/ocr/parse`: Extract + Parse
  - `GET /api/ocr/languages`: Supported languages

#### 2. AI Service (`ai-service.js`)
- **Providers**:
  - **OpenAI**: GPT-4, GPT-4-Turbo, GPT-4o, GPT-4o-mini
  - **Ollama**: llama2, mistral, phi, codellama
- **Core Logic**:
  1. Format prompt with question + options
  2. Send to AI model
  3. Parse JSON response
  4. Validate and match answer to options
  5. Return structured result
- **Fallback**: Extract answer from unstructured responses

#### 3. OCR Service (`ocr-service.js`)
- **Technology**: Tesseract.js
- **Capabilities**:
  - Image text extraction (JPG, PNG, WebP, GIF)
  - PDF text extraction (direct + OCR fallback)
  - Text cleaning and normalization
  - Confidence scoring
  - Multi-language support (100+ languages)

#### 4. MCQ Parser (`mcq-parser.js`)
- **Parsing Strategies**:
  1. Numbered questions (1., 2., 3.)
  2. Q-prefixed (Q1, Q2, Q3)
  3. Block-based (paragraph detection)
- **Output**: Structured MCQ with question + options
- **Validation**: Check question length, option count, etc.

#### 5. Middleware
- **Validator** (`validator.js`):
  - Request validation
  - Input sanitization
  - Error responses
- **Features**:
  - Question/options validation
  - File type/size checking
  - XSS prevention

---

## Data Flow

### Flow 1: Detect MCQs

```
User clicks "Detect MCQs"
    │
    ▼
Popup sends message to Content Script
    │
    ▼
Content Script calls MCQExtractor.extractAll()
    │
    ├─► Try radio button extraction
    ├─► Try list extraction
    ├─► Try div structure extraction
    ├─► Try table extraction
    └─► Try platform-specific extraction
    │
    ▼
Return array of MCQ objects to Popup
    │
    ▼
Popup displays detected questions
```

### Flow 2: Solve MCQ

```
User clicks "Solve All"
    │
    ▼
Popup sends message to Content Script
    │
    ▼
Content Script loops through detected MCQs
    │
    ├─► Show processing indicator
    ├─► Apply stealth delay (1-4s)
    │   │
    │   ▼
    │  Send message to Background Worker
    │   │
    │   ▼
    │  Background calls Backend API
    │   │
    │   ▼
    │  Backend forwards to AI Service
    │   │
    │   ├─► Format prompt
    │   ├─► Call OpenAI/Ollama
    │   ├─► Parse JSON response
    │   └─► Match answer to options
    │   │
    │   ▼
    │  Return {answer, confidence, explanation}
    │   │
    │   ▼
    │  Content Script receives response
    │   │
    │   ├─► Remove processing indicator
    │   ├─► Highlight answer on page
    │   └─► Apply confidence styling
    │
    ▼
Popup displays results
```

### Flow 3: OCR Upload

```
User uploads image/PDF
    │
    ▼
File sent to Background Worker
    │
    ▼
Background forwards to Backend /api/ocr
    │
    ▼
Backend receives file via Multer
    │
    ├─► Validate file type
    ├─► Save to /tmp
    │
    ▼
OCR Service processes file
    │
    ├─► Image: Tesseract.js extraction
    └─► PDF: Direct text or OCR fallback
    │
    ▼
Clean and validate text
    │
    ▼
(Optional) MCQ Parser extracts questions
    │
    ▼
Return structured data
    │
    ▼
Delete temp file
    │
    ▼
Response to Extension
```

---

## API Specification

### POST /api/answer

**Request:**
```json
{
  "question": "What is the capital of France?",
  "options": ["London", "Berlin", "Paris", "Madrid"]
}
```

**Response:**
```json
{
  "success": true,
  "answer": "Paris",
  "confidence": 95,
  "explanation": "Paris is the capital and largest city of France.",
  "metadata": {
    "processingTime": 1234,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "AI service unavailable",
  "details": "OpenAI API error: Rate limit exceeded"
}
```

### POST /api/answer/batch

**Request:**
```json
{
  "questions": [
    {
      "question": "Question 1?",
      "options": ["A", "B", "C", "D"]
    },
    {
      "question": "Question 2?",
      "options": ["A", "B", "C", "D"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "index": 0,
      "success": true,
      "answer": "C",
      "confidence": 85,
      "explanation": "..."
    },
    {
      "index": 1,
      "success": true,
      "answer": "B",
      "confidence": 78,
      "explanation": "..."
    }
  ],
  "metadata": {
    "processingTime": 2456,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### POST /api/ocr

**Request:**
- Content-Type: `multipart/form-data`
- Field: `file` (image or PDF)

**Response:**
```json
{
  "success": true,
  "text": "Extracted text content...",
  "rawText": "Raw OCR output...",
  "confidence": 87,
  "wordCount": 245,
  "metadata": {
    "language": "eng",
    "pageCount": 1,
    "processingTime": 3456,
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "validation": {
    "isValid": true,
    "issues": [],
    "warnings": []
  }
}
```

### POST /api/ocr/parse

**Request:**
- Content-Type: `multipart/form-data`
- Field: `file` (image or PDF)

**Response:**
```json
{
  "success": true,
  "mcqCount": 5,
  "validCount": 5,
  "mcqs": [
    {
      "number": 1,
      "question": "What is 2+2?",
      "options": ["2", "3", "4", "5"],
      "validation": {
        "isValid": true,
        "issues": []
      }
    }
  ],
  "rawText": "Full extracted text...",
  "ocrConfidence": 89,
  "metadata": {
    "processingTime": 4567,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Security & Stealth

### Anti-Detection Mechanisms

#### 1. Randomized Delays
- **Range**: 1-4 seconds between API calls
- **Implementation**: `StealthUtils.randomDelay()`
- **Purpose**: Mimic human reading/thinking time

#### 2. Human-like Mouse Movement
- **Algorithm**: Cubic bezier curves with jitter
- **Implementation**: `StealthUtils.generateMousePath()`
- **Purpose**: Simulate natural cursor movement

#### 3. Randomized Styling
- **Variation**: ±5° hue, ±5% saturation
- **Implementation**: `StealthUtils.getHighlightStyle()`
- **Purpose**: Avoid identical highlights

#### 4. Automation Detection
- **Checks**:
  - `navigator.webdriver`
  - PhantomJS indicators
  - Unusual browser APIs
- **Implementation**: `StealthUtils.isAutomationDetected()`

#### 5. Variable Obfuscation
- **Method**: Hash-based naming
- **Implementation**: `StealthUtils.obfuscate()`
- **Purpose**: Avoid obvious variable names

### Security Best Practices

#### Backend
- ✅ Environment variables for secrets
- ✅ Input validation and sanitization
- ✅ CORS whitelist
- ✅ Rate limiting ready
- ✅ Error message sanitization
- ✅ File upload restrictions

#### Extension
- ✅ Content Security Policy
- ✅ Minimal permissions
- ✅ No eval() usage
- ✅ Isolated execution contexts
- ✅ Secure message passing

---

## Performance Considerations

### Backend Optimization

1. **Caching Strategy**
   - Cache identical questions (future enhancement)
   - Use Redis for distributed caching
   - Reduce AI API costs

2. **Rate Limiting**
   - Default: 30 requests/minute
   - Configurable per user
   - Prevents abuse

3. **Batch Processing**
   - Process multiple MCQs in one request
   - Reduce HTTP overhead
   - Faster overall completion

4. **Timeout Management**
   - 30s for answer requests
   - 60s for OCR requests
   - Prevents hanging connections

### Frontend Optimization

1. **Lazy Loading**
   - Load utilities only when needed
   - Reduce initial bundle size

2. **DOM Observation**
   - Use MutationObserver for dynamic content
   - Detect new MCQs without re-scanning

3. **Memory Management**
   - Clear highlights on navigation
   - Remove event listeners
   - Cleanup DOM references

---

## Extension Patterns

### Message Passing

```javascript
// Popup → Background
chrome.runtime.sendMessage({
  action: 'analyzeQuestion',
  data: { question, options }
}, response => {
  // Handle response
});

// Background → Content Script
chrome.tabs.sendMessage(tabId, {
  action: 'highlightAnswer',
  data: { answer, confidence }
});

// Content Script → Background
chrome.runtime.sendMessage({
  action: 'getSettings'
}, settings => {
  // Use settings
});
```

### Storage

```javascript
// Save settings
chrome.storage.sync.set({
  backendUrl: 'http://localhost:3000',
  stealthMode: true
});

// Load settings
chrome.storage.sync.get(['backendUrl', 'stealthMode'], items => {
  const url = items.backendUrl;
  const stealth = items.stealthMode;
});
```

### DOM Manipulation

```javascript
// Safe element selection
const question = document.querySelector('.question');
if (question && question.textContent) {
  const text = question.textContent.trim();
}

// Event delegation
document.addEventListener('click', event => {
  if (event.target.matches('.mcq-option')) {
    // Handle click
  }
});

// MutationObserver
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.addedNodes.length) {
      detectNewMCQs();
    }
  });
});
```

---

## Extensibility

### Adding New Extraction Strategies

```javascript
// In mcq-extractor.js
extractFromCustomPlatform() {
  const mcqs = [];
  
  // Platform-specific logic
  const questions = document.querySelectorAll('.custom-question');
  
  questions.forEach(q => {
    // Extract and parse
    mcqs.push({
      question: ...,
      options: [...],
      type: 'custom-platform'
    });
  });
  
  return mcqs;
}
```

### Adding New AI Providers

```javascript
// In ai-service.js
async _callCustomProvider(userPrompt) {
  const response = await fetch('https://custom-ai-api.com/v1/chat', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CUSTOM_API_KEY}` },
    body: JSON.stringify({
      prompt: userPrompt,
      max_tokens: 500
    })
  });
  
  return await response.json();
}
```

---

## Technology Stack Summary

**Frontend:**
- Vanilla JavaScript (ES6+)
- Chrome Extension APIs (Manifest V3)
- HTML5 + CSS3

**Backend:**
- Node.js (v18+)
- Express.js (Web framework)
- Tesseract.js (OCR)
- OpenAI SDK (LLM)
- Axios (HTTP client)

**AI Models:**
- OpenAI: GPT-4, GPT-4-Turbo, GPT-4o
- Ollama: llama2, mistral, phi

**Development:**
- npm (Package manager)
- dotenv (Environment config)
- nodemon (Auto-reload)

---

This architecture is designed to be:
- ✅ **Modular**: Easy to modify components independently
- ✅ **Scalable**: Can handle increasing load
- ✅ **Maintainable**: Clear separation of concerns
- ✅ **Extensible**: Easy to add new features
- ✅ **Production-Ready**: Error handling, logging, validation
