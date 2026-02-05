/**
 * Answer Route
 * Handles MCQ answer requests
 */

const express = require('express');
const router = express.Router();
const aiService = require('../services/ai-service');
const { validateAnswerRequest, sanitizeRequest } = require('../middleware/validator');
const { HTTP_STATUS } = require('../config/constants');

/**
 * POST /api/answer
 * Answer an MCQ question
 */
router.post('/', sanitizeRequest, validateAnswerRequest, async (req, res) => {
  try {
    const { question, options } = req.body;
    
    console.log(`[Answer Request] Question: ${question.substring(0, 50)}...`);
    console.log(`[Answer Request] Options count: ${options.length}`);
    
    // Call AI service
    const startTime = Date.now();
    const result = await aiService.answerMCQ(question, options);
    const duration = Date.now() - startTime;
    
    console.log(`[Answer Response] Answer: ${result.answer}`);
    console.log(`[Answer Response] Confidence: ${result.confidence}%`);
    console.log(`[Answer Response] Duration: ${duration}ms`);
    
    // Return response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      answer: result.answer,
      confidence: result.confidence,
      explanation: result.explanation,
      metadata: {
        processingTime: duration,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[Answer Error]', error);
    
    // Determine appropriate status code
    let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let errorMessage = 'Failed to process question';
    
    if (error.message.includes('API key')) {
      statusCode = HTTP_STATUS.UNAUTHORIZED;
      errorMessage = 'AI service authentication failed';
    } else if (error.message.includes('rate limit')) {
      statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
      errorMessage = 'AI service rate limit exceeded';
    } else if (error.message.includes('not running')) {
      statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
      errorMessage = 'AI service unavailable';
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/answer/batch
 * Answer multiple MCQ questions
 */
router.post('/batch', sanitizeRequest, async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!Array.isArray(questions)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Questions must be an array'
      });
    }
    
    if (questions.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'No questions provided'
      });
    }
    
    if (questions.length > 20) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Maximum 20 questions per batch'
      });
    }
    
    console.log(`[Batch Request] Processing ${questions.length} questions`);
    
    const results = [];
    const startTime = Date.now();
    
    for (let i = 0; i < questions.length; i++) {
      const { question, options } = questions[i];
      
      try {
        const result = await aiService.answerMCQ(question, options);
        results.push({
          index: i,
          success: true,
          ...result
        });
      } catch (error) {
        console.error(`[Batch Error] Question ${i}:`, error);
        results.push({
          index: i,
          success: false,
          error: error.message
        });
      }
    }
    
    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    
    console.log(`[Batch Complete] ${successCount}/${questions.length} successful in ${duration}ms`);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      total: questions.length,
      successful: successCount,
      failed: questions.length - successCount,
      results: results,
      metadata: {
        processingTime: duration,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[Batch Error]', error);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to process batch request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;