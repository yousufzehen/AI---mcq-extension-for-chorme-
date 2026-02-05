/**
 * MCQ Solver Backend Server
 * Main entry point for the Node.js/Express application
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT, NODE_ENV, ALLOWED_ORIGINS, HTTP_STATUS } = require('./config/constants');

// Import routes
const answerRoute = require('./routes/answer');
const ocrRoute = require('./routes/ocr');

// Import services
const aiService = require('./services/ai-service');

// Create Express app
const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed patterns
    const isAllowed = ALLOWED_ORIGINS.some(pattern => {
      if (pattern.includes('*')) {
        // Handle wildcard patterns
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(origin);
      }
      return origin === pattern;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const aiHealth = await aiService.healthCheck();
    
    res.status(HTTP_STATUS.OK).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      services: {
        ai: aiHealth
      }
    });
  } catch (error) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MCQ Solver Backend',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      answer: '/api/answer',
      answerBatch: '/api/answer/batch',
      ocr: '/api/ocr',
      ocrParse: '/api/ocr/parse',
      ocrLanguages: '/api/ocr/languages'
    },
    documentation: 'See README.md for usage instructions'
  });
});

// API routes
app.use('/api/answer', answerRoute);
app.use('/api/ocr', ocrRoute);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'File too large. Maximum size: 10MB'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'Unexpected field in file upload'
    });
  }
  
  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: 'CORS policy: Origin not allowed'
    });
  }
  
  // Generic error
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: 'Internal server error',
    details: NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(PORT, async () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 MCQ Solver Backend Server');
  console.log('='.repeat(60));
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('='.repeat(60));
  
  // Check AI service health
  try {
    const aiHealth = await aiService.healthCheck();
    console.log('\n✅ AI Service Status:', aiHealth.status);
    console.log(`   Provider: ${aiHealth.provider}`);
    console.log(`   Model: ${aiHealth.model}`);
  } catch (error) {
    console.log('\n❌ AI Service Error:', error.message);
    console.log('   Please check your configuration in .env file');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;