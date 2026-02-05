/**
 * MCQ Parser Service
 * Parses extracted OCR text into structured MCQ format
 */

class MCQParser {
  
  /**
   * Parse OCR text into MCQ structures
   * @param {string} text - Raw OCR text
   * @returns {Array<Object>} Parsed MCQs
   */
  parse(text) {
    if (!text || text.trim().length === 0) {
      return [];
    }
    
    const mcqs = [];
    
    // Try multiple parsing strategies
    const strategies = [
      this.parseNumberedQuestions.bind(this),
      this.parseQPrefixedQuestions.bind(this),
      this.parseBlockQuestions.bind(this)
    ];
    
    for (const strategy of strategies) {
      try {
        const parsed = strategy(text);
        if (parsed && parsed.length > 0) {
          mcqs.push(...parsed);
        }
      } catch (error) {
        console.warn('Parsing strategy failed:', error);
      }
    }
    
    // Deduplicate
    return this.deduplicate(mcqs);
  }
  
  /**
   * Parse numbered questions (1., 2., 3., etc.)
   * @param {string} text - Text to parse
   * @returns {Array<Object>} Parsed MCQs
   */
  parseNumberedQuestions(text) {
    const mcqs = [];
    
    // Split by question numbers
    const questionPattern = /(?:^|\n)(\d+)[.\)]\s*(.+?)(?=\n\d+[.\)]|\n*$)/gs;
    const matches = [...text.matchAll(questionPattern)];
    
    for (const match of matches) {
      const questionNum = match[1];
      const questionBlock = match[2];
      
      const mcq = this.parseQuestionBlock(questionBlock);
      if (mcq) {
        mcq.number = parseInt(questionNum);
        mcqs.push(mcq);
      }
    }
    
    return mcqs;
  }
  
  /**
   * Parse Q-prefixed questions (Q1, Q2, etc.)
   * @param {string} text - Text to parse
   * @returns {Array<Object>} Parsed MCQs
   */
  parseQPrefixedQuestions(text) {
    const mcqs = [];
    
    const questionPattern = /(?:^|\n)Q(\d+)[:\s]*(.+?)(?=\nQ\d+|\n*$)/gis;
    const matches = [...text.matchAll(questionPattern)];
    
    for (const match of matches) {
      const questionNum = match[1];
      const questionBlock = match[2];
      
      const mcq = this.parseQuestionBlock(questionBlock);
      if (mcq) {
        mcq.number = parseInt(questionNum);
        mcqs.push(mcq);
      }
    }
    
    return mcqs;
  }
  
  /**
   * Parse questions in block format
   * @param {string} text - Text to parse
   * @returns {Array<Object>} Parsed MCQs
   */
  parseBlockQuestions(text) {
    const mcqs = [];
    
    // Look for question marks or common question words
    const blocks = text.split(/\n{2,}/);
    
    for (const block of blocks) {
      if (this.looksLikeQuestion(block)) {
        const mcq = this.parseQuestionBlock(block);
        if (mcq) {
          mcqs.push(mcq);
        }
      }
    }
    
    return mcqs;
  }
  
  /**
   * Parse a single question block
   * @param {string} block - Question block text
   * @returns {Object|null} Parsed MCQ
   */
  parseQuestionBlock(block) {
    // Extract question and options
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length < 3) { // Need at least question + 2 options
      return null;
    }
    
    // First line(s) are the question
    let questionText = '';
    let optionsStartIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line starts options
      if (this.looksLikeOption(line)) {
        optionsStartIndex = i;
        break;
      }
      
      questionText += (questionText ? ' ' : '') + line;
    }
    
    if (!questionText || optionsStartIndex === 0 || optionsStartIndex >= lines.length - 1) {
      return null;
    }
    
    // Parse options
    const options = [];
    for (let i = optionsStartIndex; i < lines.length; i++) {
      const line = lines[i];
      
      if (this.looksLikeOption(line)) {
        const option = this.cleanOption(line);
        if (option) {
          options.push(option);
        }
      }
    }
    
    if (options.length < 2 || options.length > 6) {
      return null;
    }
    
    return {
      question: questionText.trim(),
      options: options
    };
  }
  
  /**
   * Check if text looks like a question
   * @param {string} text - Text to check
   * @returns {boolean} True if looks like question
   */
  looksLikeQuestion(text) {
    if (!text || text.length < 10) return false;
    
    const questionIndicators = [
      /\?/, // Contains question mark
      /^(what|which|who|where|when|why|how)/i, // Starts with question word
      /^(select|choose|identify|find|determine|calculate)/i, // Instruction words
      /(is|are|was|were|will|would|should|can|could)\s+/i // Question structure
    ];
    
    return questionIndicators.some(pattern => pattern.test(text));
  }
  
  /**
   * Check if line looks like an option
   * @param {string} line - Line to check
   * @returns {boolean} True if looks like option
   */
  looksLikeOption(line) {
    if (!line) return false;
    
    const optionPatterns = [
      /^[A-Z][.\):\s]/i, // A., A), A:
      /^\d+[.\):\s]/, // 1., 2), 3:
      /^\([A-Z]\)/i, // (A), (B)
      /^\(\d+\)/ // (1), (2)
    ];
    
    return optionPatterns.some(pattern => pattern.test(line));
  }
  
  /**
   * Clean option text (remove prefix)
   * @param {string} line - Option line
   * @returns {string} Cleaned option
   */
  cleanOption(line) {
    return line
      .replace(/^[A-Z][.\):\s]+/i, '') // Remove A., B), etc.
      .replace(/^\d+[.\):\s]+/, '') // Remove 1., 2), etc.
      .replace(/^\([A-Z]\)\s*/i, '') // Remove (A), (B), etc.
      .replace(/^\(\d+\)\s*/, '') // Remove (1), (2), etc.
      .trim();
  }
  
  /**
   * Deduplicate MCQs
   * @param {Array<Object>} mcqs - Array of MCQs
   * @returns {Array<Object>} Deduplicated MCQs
   */
  deduplicate(mcqs) {
    const seen = new Set();
    return mcqs.filter(mcq => {
      const key = mcq.question.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  /**
   * Validate parsed MCQ
   * @param {Object} mcq - MCQ object
   * @returns {Object} Validation result
   */
  validate(mcq) {
    const issues = [];
    
    if (!mcq.question || mcq.question.length < 10) {
      issues.push('Question too short or missing');
    }
    
    if (!mcq.options || mcq.options.length < 2) {
      issues.push('Not enough options (need at least 2)');
    }
    
    if (mcq.options && mcq.options.length > 6) {
      issues.push('Too many options (maximum 6)');
    }
    
    if (mcq.options) {
      const tooShort = mcq.options.filter(opt => opt.length < 1);
      if (tooShort.length > 0) {
        issues.push('Some options are too short');
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }
  
  /**
   * Format MCQs for display
   * @param {Array<Object>} mcqs - Array of MCQs
   * @returns {string} Formatted text
   */
  format(mcqs) {
    return mcqs.map((mcq, index) => {
      const num = mcq.number || (index + 1);
      const options = mcq.options
        .map((opt, i) => `  ${String.fromCharCode(65 + i)}. ${opt}`)
        .join('\n');
      
      return `Question ${num}:\n${mcq.question}\n\nOptions:\n${options}`;
    }).join('\n\n---\n\n');
  }
}

module.exports = new MCQParser();