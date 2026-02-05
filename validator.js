/**
 * Request Validator Middleware
 * Validates incoming requests
 */

const { HTTP_STATUS } = require('../config/constants');

/**
 * Validate MCQ answer request
 */
const validateAnswerRequest = (req, res, next) => {
  const { question, options } = req.body;
  
  const errors = [];
  
  // Validate question
  if (!question) {
    errors.push('Question is required');
  } else if (typeof question !== 'string') {
    errors.push('Question must be a string');
  } else if (question.trim().length < 10) {
    errors.push('Question is too short (minimum 10 characters)');
  } else if (question.length > 1000) {
    errors.push('Question is too long (maximum 1000 characters)');
  }
  
  // Validate options
  if (!options) {
    errors.push('Options are required');
  } else if (!Array.isArray(options)) {
    errors.push('Options must be an array');
  } else if (options.length < 2) {
    errors.push('At least 2 options are required');
  } else if (options.length > 10) {
    errors.push('Maximum 10 options allowed');
  } else {
    // Validate each option
    options.forEach((option, index) => {
      if (typeof option !== 'string') {
        errors.push(`Option ${index + 1} must be a string`);
      } else if (option.trim().length === 0) {
        errors.push(`Option ${index + 1} is empty`);
      } else if (option.length > 500) {
        errors.push(`Option ${index + 1} is too long (maximum 500 characters)`);
      }
    });
  }
  
  if (errors.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      errors: errors
    });
  }
  
  next();
};

/**
 * Validate OCR request
 */
const validateOCRRequest = (req, res, next) => {
  if (!req.file) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'No file uploaded'
    });
  }
  
  const file = req.file;
  
  // Validate file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ];
  
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    });
  }
  
  // File size is validated by multer, but double-check
  if (file.size > 10 * 1024 * 1024) { // 10MB
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'File too large. Maximum size: 10MB'
    });
  }
  
  next();
};

/**
 * Sanitize text input
 */
const sanitizeText = (text) => {
  if (typeof text !== 'string') return text;
  
  return text
    .trim()
    // Remove potentially dangerous characters
    .replace(/[<>]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
};

/**
 * Sanitize request body
 */
const sanitizeRequest = (req, res, next) => {
  if (req.body) {
    // Sanitize question
    if (req.body.question) {
      req.body.question = sanitizeText(req.body.question);
    }
    
    // Sanitize options
    if (Array.isArray(req.body.options)) {
      req.body.options = req.body.options.map(opt => sanitizeText(opt));
    }
  }
  
  next();
};

module.exports = {
  validateAnswerRequest,
  validateOCRRequest,
  sanitizeRequest
};