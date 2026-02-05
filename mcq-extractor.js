/**
 * MCQ Extractor
 * Detects and extracts multiple choice questions from web pages
 * Supports various formats and exam platforms
 */

const MCQExtractor = {
  
  /**
   * Extract all MCQs from the current page
   * @returns {Array<Object>} Array of MCQ objects
   */
  extractAll() {
    const mcqs = [];
    
    // Try multiple extraction strategies
    const strategies = [
      this.extractFromRadioButtons.bind(this),
      this.extractFromLists.bind(this),
      this.extractFromDivStructure.bind(this),
      this.extractFromTableFormat.bind(this),
      this.extractFromCommonPlatforms.bind(this)
    ];
    
    for (const strategy of strategies) {
      try {
        const extracted = strategy();
        if (extracted && extracted.length > 0) {
          mcqs.push(...extracted);
        }
      } catch (error) {
        console.warn('Extraction strategy failed:', error);
      }
    }
    
    // Deduplicate based on question text
    return this.deduplicate(mcqs);
  },
  
  /**
   * Extract MCQs from radio button groups
   * @returns {Array<Object>} MCQ objects
   */
  extractFromRadioButtons() {
    const mcqs = [];
    const radioGroups = {};
    
    // Group radio buttons by name attribute
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
      const name = radio.name;
      if (!name) return;
      
      if (!radioGroups[name]) {
        radioGroups[name] = [];
      }
      
      radioGroups[name].push(radio);
    });
    
    // Extract question and options for each group
    for (const [groupName, radios] of Object.entries(radioGroups)) {
      const question = this.findQuestionForRadioGroup(radios[0]);
      const options = radios.map(radio => {
        const label = this.findLabelForInput(radio);
        return {
          text: label || radio.value,
          element: radio,
          value: radio.value
        };
      });
      
      if (question && options.length > 1) {
        mcqs.push({
          question: question.text,
          questionElement: question.element,
          options: options,
          type: 'radio',
          groupName: groupName
        });
      }
    }
    
    return mcqs;
  },
  
  /**
   * Extract MCQs from list structures (ol, ul)
   * @returns {Array<Object>} MCQ objects
   */
  extractFromLists() {
    const mcqs = [];
    const lists = document.querySelectorAll('ol, ul');
    
    lists.forEach(list => {
      const items = list.querySelectorAll('li');
      
      // Look for question before the list
      const question = this.findQuestionBeforeElement(list);
      
      if (items.length >= 2 && items.length <= 6 && question) {
        // Check if list items look like options (start with A, B, C or 1, 2, 3)
        const optionPattern = /^[A-Z][.\):\s]|^\d+[.\):\s]/i;
        const looksLikeOptions = Array.from(items).some(item => 
          optionPattern.test(item.textContent.trim())
        );
        
        if (looksLikeOptions) {
          const options = Array.from(items).map(item => ({
            text: this.cleanOptionText(item.textContent),
            element: item,
            value: item.textContent.trim()
          }));
          
          mcqs.push({
            question: question.text,
            questionElement: question.element,
            options: options,
            type: 'list'
          });
        }
      }
    });
    
    return mcqs;
  },
  
  /**
   * Extract MCQs from div-based structures
   * @returns {Array<Object>} MCQ objects
   */
  extractFromDivStructure() {
    const mcqs = [];
    
    // Look for common class patterns
    const questionSelectors = [
      '.question',
      '.quiz-question',
      '.mcq-question',
      '[class*="question"]',
      '[data-question]'
    ];
    
    const optionSelectors = [
      '.option',
      '.answer-option',
      '.choice',
      '[class*="option"]',
      '[class*="choice"]'
    ];
    
    questionSelectors.forEach(selector => {
      const questionElements = document.querySelectorAll(selector);
      
      questionElements.forEach(qElem => {
        const questionText = this.extractTextContent(qElem);
        
        // Find options near this question
        let optionElements = [];
        
        // Try to find options as siblings or children
        optionSelectors.forEach(optSel => {
          const found = qElem.parentElement?.querySelectorAll(optSel) || 
                       qElem.querySelectorAll(optSel);
          if (found.length > 0) {
            optionElements = Array.from(found);
          }
        });
        
        if (optionElements.length >= 2 && optionElements.length <= 6) {
          const options = optionElements.map(elem => ({
            text: this.extractTextContent(elem),
            element: elem,
            value: this.extractTextContent(elem)
          }));
          
          mcqs.push({
            question: questionText,
            questionElement: qElem,
            options: options,
            type: 'div'
          });
        }
      });
    });
    
    return mcqs;
  },
  
  /**
   * Extract MCQs from table format
   * @returns {Array<Object>} MCQ objects
   */
  extractFromTableFormat() {
    const mcqs = [];
    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      
      // Look for question in first row/cell
      if (rows.length >= 3) {
        const firstRow = rows[0];
        const questionText = this.extractTextContent(firstRow);
        
        // Check if subsequent rows are options
        const optionRows = Array.from(rows).slice(1);
        
        if (optionRows.length >= 2 && optionRows.length <= 6) {
          const options = optionRows.map(row => ({
            text: this.extractTextContent(row),
            element: row,
            value: this.extractTextContent(row)
          }));
          
          mcqs.push({
            question: questionText,
            questionElement: firstRow,
            options: options,
            type: 'table'
          });
        }
      }
    });
    
    return mcqs;
  },
  
  /**
   * Extract from common exam platforms (Google Forms, Quizlet, etc.)
   * @returns {Array<Object>} MCQ objects
   */
  extractFromCommonPlatforms() {
    const mcqs = [];
    const url = window.location.hostname;
    
    // Google Forms
    if (url.includes('google.com/forms')) {
      return this.extractFromGoogleForms();
    }
    
    // Quizlet
    if (url.includes('quizlet.com')) {
      return this.extractFromQuizlet();
    }
    
    // Canvas LMS
    if (url.includes('instructure.com') || document.querySelector('[class*="canvas"]')) {
      return this.extractFromCanvas();
    }
    
    return mcqs;
  },
  
  /**
   * Extract from Google Forms
   * @returns {Array<Object>} MCQ objects
   */
  extractFromGoogleForms() {
    const mcqs = [];
    const questions = document.querySelectorAll('[role="listitem"]');
    
    questions.forEach(q => {
      const questionText = q.querySelector('[role="heading"]')?.textContent;
      const options = q.querySelectorAll('[role="radio"]');
      
      if (questionText && options.length > 1) {
        mcqs.push({
          question: questionText,
          questionElement: q,
          options: Array.from(options).map(opt => ({
            text: opt.textContent,
            element: opt,
            value: opt.textContent
          })),
          type: 'google-forms'
        });
      }
    });
    
    return mcqs;
  },
  
  /**
   * Extract from Quizlet
   * @returns {Array<Object>} MCQ objects
   */
  extractFromQuizlet() {
    // Quizlet uses specific class names
    const mcqs = [];
    const questions = document.querySelectorAll('[class*="MultipleChoiceQuestion"]');
    
    questions.forEach(q => {
      const questionText = q.querySelector('[class*="question"]')?.textContent;
      const options = q.querySelectorAll('[class*="choice"]');
      
      if (questionText && options.length > 1) {
        mcqs.push({
          question: questionText,
          questionElement: q,
          options: Array.from(options).map(opt => ({
            text: opt.textContent,
            element: opt,
            value: opt.textContent
          })),
          type: 'quizlet'
        });
      }
    });
    
    return mcqs;
  },
  
  /**
   * Extract from Canvas LMS
   * @returns {Array<Object>} MCQ objects
   */
  extractFromCanvas() {
    const mcqs = [];
    const questions = document.querySelectorAll('.question');
    
    questions.forEach(q => {
      const questionText = q.querySelector('.question_text')?.textContent;
      const options = q.querySelectorAll('.answer');
      
      if (questionText && options.length > 1) {
        mcqs.push({
          question: questionText,
          questionElement: q,
          options: Array.from(options).map(opt => ({
            text: opt.textContent,
            element: opt,
            value: opt.textContent
          })),
          type: 'canvas'
        });
      }
    });
    
    return mcqs;
  },
  
  /**
   * Find question text for a radio button group
   * @param {HTMLElement} radio - Radio input element
   * @returns {Object|null} Question object
   */
  findQuestionForRadioGroup(radio) {
    // Try common patterns
    const container = radio.closest('fieldset, .question, .quiz-item, [role="group"]');
    
    if (container) {
      const legend = container.querySelector('legend');
      if (legend) {
        return {
          text: this.extractTextContent(legend),
          element: legend
        };
      }
      
      const heading = container.querySelector('h1, h2, h3, h4, h5, h6, .question-text');
      if (heading) {
        return {
          text: this.extractTextContent(heading),
          element: heading
        };
      }
    }
    
    return this.findQuestionBeforeElement(radio);
  },
  
  /**
   * Find question before an element
   * @param {HTMLElement} element - Reference element
   * @returns {Object|null} Question object
   */
  findQuestionBeforeElement(element) {
    // Look at previous siblings
    let current = element.previousElementSibling;
    let attempts = 0;
    
    while (current && attempts < 5) {
      const text = this.extractTextContent(current);
      
      // Check if it looks like a question
      if (this.looksLikeQuestion(text)) {
        return {
          text: text,
          element: current
        };
      }
      
      current = current.previousElementSibling;
      attempts++;
    }
    
    // Try parent element
    const parent = element.parentElement;
    if (parent) {
      const heading = parent.querySelector('h1, h2, h3, h4, h5, h6, p, div');
      if (heading && heading !== element) {
        const text = this.extractTextContent(heading);
        if (this.looksLikeQuestion(text)) {
          return {
            text: text,
            element: heading
          };
        }
      }
    }
    
    return null;
  },
  
  /**
   * Find label for input element
   * @param {HTMLElement} input - Input element
   * @returns {string|null} Label text
   */
  findLabelForInput(input) {
    // Try label element
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) return this.extractTextContent(label);
    }
    
    // Try parent label
    const parentLabel = input.closest('label');
    if (parentLabel) {
      return this.extractTextContent(parentLabel);
    }
    
    // Try next sibling
    const nextSibling = input.nextElementSibling;
    if (nextSibling) {
      return this.extractTextContent(nextSibling);
    }
    
    return null;
  },
  
  /**
   * Check if text looks like a question
   * @param {string} text - Text to check
   * @returns {boolean} True if looks like question
   */
  looksLikeQuestion(text) {
    if (!text || text.length < 10) return false;
    
    const questionIndicators = [
      /\?$/, // Ends with question mark
      /^(what|which|who|where|when|why|how)/i, // Starts with question word
      /^(select|choose|identify|find|determine)/i, // Starts with instruction
      /^question \d+/i, // "Question 1", etc.
      /^q\d+/i, // "Q1", "Q2", etc.
      /\d+[.)\s]+/  // Starts with number
    ];
    
    return questionIndicators.some(pattern => pattern.test(text.trim()));
  },
  
  /**
   * Extract clean text content from element
   * @param {HTMLElement} element - Element to extract from
   * @returns {string} Cleaned text
   */
  extractTextContent(element) {
    if (!element) return '';
    
    // Clone to avoid modifying original
    const clone = element.cloneNode(true);
    
    // Remove script and style tags
    clone.querySelectorAll('script, style').forEach(el => el.remove());
    
    return clone.textContent.trim().replace(/\s+/g, ' ');
  },
  
  /**
   * Clean option text (remove A., B., 1., 2., etc.)
   * @param {string} text - Raw option text
   * @returns {string} Cleaned text
   */
  cleanOptionText(text) {
    return text
      .replace(/^[A-Z][.\):\s]+/i, '') // Remove A., B), C:, etc.
      .replace(/^\d+[.\):\s]+/, '') // Remove 1., 2), 3:, etc.
      .trim();
  },
  
  /**
   * Deduplicate MCQs based on question text
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
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MCQExtractor;
}