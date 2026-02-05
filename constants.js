/**
 * Application Constants
 * Centralized configuration values
 */

module.exports = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // AI Provider
  AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
  
  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  OPENAI_MAX_TOKENS: 500,
  OPENAI_TEMPERATURE: 0.3, // Lower temperature for more deterministic answers
  
  // Ollama (Local LLM)
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama2',
  
  // OCR
  OCR_LANGUAGE: process.env.OCR_LANGUAGE || 'eng',
  OCR_MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // File Upload
  UPLOAD_LIMITS: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  
  ALLOWED_FILE_TYPES: {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    pdf: ['application/pdf']
  },
  
  // Rate Limiting
  RATE_LIMIT: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30
  },
  
  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'chrome-extension://*'],
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // AI Prompts
  PROMPTS: {
    MCQ_SYSTEM: `You are an expert AI assistant specialized in answering multiple choice questions.
Your task is to:
1. Analyze the given question and options carefully
2. Select the most accurate answer
3. Provide a confidence score (0-100)
4. Give a brief explanation of your reasoning

Always respond in valid JSON format with this structure:
{
  "answer": "The text of the correct option",
  "confidence": 85,
  "explanation": "Brief explanation of why this is correct"
}

Be precise and analytical. If the question is ambiguous or you're uncertain, reflect that in your confidence score.`,
    
    MCQ_USER_TEMPLATE: (question, options) => `
Question: ${question}

Options:
${options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}

Analyze this question and provide your answer in JSON format.`
  },
  
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  }
};