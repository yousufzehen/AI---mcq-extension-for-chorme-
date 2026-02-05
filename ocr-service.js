/**
 * OCR Service
 * Handles text extraction from images and PDFs using Tesseract.js
 */

const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const { OCR_LANGUAGE } = require('../config/constants');

class OCRService {
  constructor() {
    this.language = OCR_LANGUAGE;
  }
  
  /**
   * Extract text from image
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Object>} Extracted text and metadata
   */
  async extractFromImage(imagePath) {
    try {
      console.log(`Starting OCR on image: ${imagePath}`);
      
      const result = await Tesseract.recognize(
        imagePath,
        this.language,
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );
      
      const text = result.data.text;
      const confidence = result.data.confidence;
      
      console.log(`OCR completed. Confidence: ${confidence}%`);
      
      return {
        success: true,
        text: text,
        confidence: Math.round(confidence),
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
        metadata: {
          language: this.language,
          pageCount: 1
        }
      };
      
    } catch (error) {
      console.error('Image OCR error:', error);
      throw new Error(`Failed to extract text from image: ${error.message}`);
    }
  }
  
  /**
   * Extract text from PDF
   * @param {string} pdfPath - Path to PDF file
   * @returns {Promise<Object>} Extracted text and metadata
   */
  async extractFromPDF(pdfPath) {
    try {
      console.log(`Starting PDF text extraction: ${pdfPath}`);
      
      const dataBuffer = await fs.readFile(pdfPath);
      const data = await pdfParse(dataBuffer);
      
      const text = data.text;
      const pageCount = data.numpages;
      
      console.log(`PDF extraction completed. Pages: ${pageCount}`);
      
      return {
        success: true,
        text: text,
        confidence: 100, // PDF text extraction is generally reliable
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
        metadata: {
          pageCount: pageCount,
          info: data.info
        }
      };
      
    } catch (error) {
      console.error('PDF extraction error:', error);
      
      // If direct PDF text extraction fails, try OCR on each page
      console.log('Attempting OCR fallback for PDF...');
      return await this.extractFromPDFWithOCR(pdfPath);
    }
  }
  
  /**
   * Extract text from PDF using OCR (for scanned PDFs)
   * @param {string} pdfPath - Path to PDF file
   * @returns {Promise<Object>} Extracted text and metadata
   */
  async extractFromPDFWithOCR(pdfPath) {
    try {
      // Note: This requires additional dependencies (pdf-poppler or similar)
      // For now, return a helpful error message
      throw new Error(
        'PDF appears to be scanned/image-based. ' +
        'Please convert to images first or use a PDF with extractable text.'
      );
    } catch (error) {
      throw new Error(`PDF OCR extraction failed: ${error.message}`);
    }
  }
  
  /**
   * Detect if file is image or PDF and extract accordingly
   * @param {Object} file - Multer file object
   * @returns {Promise<Object>} Extracted text
   */
  async extractText(file) {
    const mimeType = file.mimetype;
    const filePath = file.path;
    
    let result;
    
    if (mimeType.startsWith('image/')) {
      result = await this.extractFromImage(filePath);
    } else if (mimeType === 'application/pdf') {
      result = await this.extractFromPDF(filePath);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
    
    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Failed to delete temporary file:', error);
    }
    
    return result;
  }
  
  /**
   * Clean OCR text (remove artifacts, fix common issues)
   * @param {string} text - Raw OCR text
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      // Remove multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Fix common OCR mistakes
      .replace(/\bl\b/g, '1') // Lowercase L to 1 in isolation
      .replace(/\bO\b/g, '0') // Uppercase O to 0 in isolation
      // Remove special characters that might be OCR artifacts
      .replace(/[^\x20-\x7E\n]/g, '')
      // Trim
      .trim();
  }
  
  /**
   * Validate OCR result quality
   * @param {Object} result - OCR result
   * @returns {Object} Validation result
   */
  validateResult(result) {
    const issues = [];
    
    if (!result.text || result.text.length === 0) {
      issues.push('No text extracted');
    }
    
    if (result.confidence < 50) {
      issues.push('Low confidence score - text may be inaccurate');
    }
    
    if (result.wordCount < 10) {
      issues.push('Very little text detected - image quality may be poor');
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues,
      warnings: result.confidence < 70 ? ['Moderate confidence - verify extracted text'] : []
    };
  }
  
  /**
   * Get supported languages
   * @returns {Array<string>} Supported language codes
   */
  getSupportedLanguages() {
    // Tesseract.js supports these languages
    return [
      'afr', 'amh', 'ara', 'asm', 'aze', 'aze_cyrl', 'bel', 'ben', 'bod', 'bos',
      'bul', 'cat', 'ceb', 'ces', 'chi_sim', 'chi_tra', 'chr', 'cym', 'dan', 'deu',
      'dzo', 'ell', 'eng', 'enm', 'epo', 'est', 'eus', 'fas', 'fin', 'fra', 'frk',
      'frm', 'gle', 'glg', 'grc', 'guj', 'hat', 'heb', 'hin', 'hrv', 'hun', 'iku',
      'ind', 'isl', 'ita', 'ita_old', 'jav', 'jpn', 'kan', 'kat', 'kat_old', 'kaz',
      'khm', 'kir', 'kor', 'kur', 'lao', 'lat', 'lav', 'lit', 'mal', 'mar', 'mkd',
      'mlt', 'msa', 'mya', 'nep', 'nld', 'nor', 'ori', 'pan', 'pol', 'por', 'pus',
      'ron', 'rus', 'san', 'sin', 'slk', 'slv', 'spa', 'spa_old', 'sqi', 'srp',
      'srp_latn', 'swa', 'swe', 'syr', 'tam', 'tel', 'tgk', 'tgl', 'tha', 'tir',
      'tur', 'uig', 'ukr', 'urd', 'uzb', 'uzb_cyrl', 'vie', 'yid'
    ];
  }
}

module.exports = new OCRService();