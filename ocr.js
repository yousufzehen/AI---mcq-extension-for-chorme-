/**
 * OCR Route
 * Handles OCR and text extraction from images/PDFs
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ocrService = require('../services/ocr-service');
const mcqParser = require('../services/mcq-parser');
const { validateOCRRequest } = require('../middleware/validator');
const { HTTP_STATUS, UPLOAD_LIMITS, ALLOWED_FILE_TYPES } = require('../config/constants');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: UPLOAD_LIMITS,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [...ALLOWED_FILE_TYPES.image, ...ALLOWED_FILE_TYPES.pdf];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`));
    }
  }
});

/**
 * POST /api/ocr
 * Extract text from image or PDF
 */
router.post('/', upload.single('file'), validateOCRRequest, async (req, res) => {
  try {
    const file = req.file;
    
    console.log(`[OCR Request] File: ${file.originalname} (${file.mimetype})`);
    
    // Extract text using OCR service
    const startTime = Date.now();
    const result = await ocrService.extractText(file);
    const duration = Date.now() - startTime;
    
    console.log(`[OCR Complete] Words: ${result.wordCount}, Confidence: ${result.confidence}%`);
    console.log(`[OCR Duration] ${duration}ms`);
    
    // Clean the text
    const cleanedText = ocrService.cleanText(result.text);
    
    // Validate result quality
    const validation = ocrService.validateResult(result);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      text: cleanedText,
      rawText: result.text,
      confidence: result.confidence,
      wordCount: result.wordCount,
      metadata: {
        ...result.metadata,
        processingTime: duration,
        timestamp: new Date().toISOString()
      },
      validation: validation
    });
    
  } catch (error) {
    console.error('[OCR Error]', error);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to extract text from file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/ocr/parse
 * Extract text and parse MCQs in one request
 */
router.post('/parse', upload.single('file'), validateOCRRequest, async (req, res) => {
  try {
    const file = req.file;
    
    console.log(`[OCR Parse Request] File: ${file.originalname}`);
    
    // Extract text
    const startTime = Date.now();
    const ocrResult = await ocrService.extractText(file);
    
    // Clean text
    const cleanedText = ocrService.cleanText(ocrResult.text);
    
    // Parse MCQs
    const mcqs = mcqParser.parse(cleanedText);
    const duration = Date.now() - startTime;
    
    console.log(`[OCR Parse Complete] Found ${mcqs.length} MCQs in ${duration}ms`);
    
    // Validate MCQs
    const validatedMCQs = mcqs.map(mcq => ({
      ...mcq,
      validation: mcqParser.validate(mcq)
    }));
    
    const validCount = validatedMCQs.filter(m => m.validation.isValid).length;
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      mcqCount: mcqs.length,
      validCount: validCount,
      mcqs: validatedMCQs,
      rawText: cleanedText,
      ocrConfidence: ocrResult.confidence,
      metadata: {
        processingTime: duration,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[OCR Parse Error]', error);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to extract and parse MCQs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ocr/languages
 * Get supported OCR languages
 */
router.get('/languages', (req, res) => {
  const languages = ocrService.getSupportedLanguages();
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    count: languages.length,
    languages: languages,
    current: ocrService.language
  });
});

module.exports = router;