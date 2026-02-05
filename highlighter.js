/**
 * Answer Highlighter
 * Highlights correct answers with confidence-based styling
 */

const Highlighter = {
  
  // Store highlighted elements for cleanup
  highlightedElements: [],
  
  /**
   * Highlight answer on the page
   * @param {Object} mcq - MCQ object
   * @param {string} answer - Answer text
   * @param {number} confidence - Confidence score (0-100)
   * @param {boolean} stealthMode - Use stealth mode
   */
  async highlight(mcq, answer, confidence, stealthMode = true) {
    // Clear previous highlights
    this.clearHighlights();
    
    // Find matching option
    const matchingOption = this.findMatchingOption(mcq.options, answer);
    
    if (!matchingOption) {
      console.warn('Could not find matching option for answer:', answer);
      return;
    }
    
    // Apply stealth delay if enabled
    if (stealthMode && typeof StealthUtils !== 'undefined') {
      await StealthUtils.sleep(StealthUtils.randomDelay(500, 2000));
    }
    
    // Get style based on confidence
    const style = this.getHighlightStyle(confidence, stealthMode);
    
    // Apply highlight
    this.applyHighlight(matchingOption.element, style);
    
    // Add confidence badge
    this.addConfidenceBadge(matchingOption.element, confidence);
    
    // Scroll into view smoothly
    this.scrollToElement(matchingOption.element, stealthMode);
  },
  
  /**
   * Find matching option from answer text
   * @param {Array<Object>} options - Array of option objects
   * @param {string} answer - Answer text
   * @returns {Object|null} Matching option
   */
  findMatchingOption(options, answer) {
    const cleanAnswer = answer.toLowerCase().trim();
    
    // Try exact match first
    for (const option of options) {
      const cleanOption = option.text.toLowerCase().trim();
      
      if (cleanOption === cleanAnswer) {
        return option;
      }
    }
    
    // Try partial match
    for (const option of options) {
      const cleanOption = option.text.toLowerCase().trim();
      
      if (cleanOption.includes(cleanAnswer) || cleanAnswer.includes(cleanOption)) {
        return option;
      }
    }
    
    // Try matching by option letter (A, B, C, D)
    const letterMatch = answer.match(/^([A-D])[.\):\s]/i);
    if (letterMatch) {
      const letter = letterMatch[1].toUpperCase();
      const index = letter.charCodeAt(0) - 'A'.charCodeAt(0);
      
      if (index >= 0 && index < options.length) {
        return options[index];
      }
    }
    
    // Try fuzzy matching (Levenshtein distance)
    let bestMatch = null;
    let bestScore = Infinity;
    
    for (const option of options) {
      const distance = this.levenshteinDistance(
        cleanAnswer,
        option.text.toLowerCase().trim()
      );
      
      if (distance < bestScore) {
        bestScore = distance;
        bestMatch = option;
      }
    }
    
    // Only accept if similarity is reasonable
    if (bestScore < Math.max(cleanAnswer.length, bestMatch?.text.length || 0) * 0.4) {
      return bestMatch;
    }
    
    return null;
  },
  
  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Distance
   */
  levenshteinDistance(a, b) {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  },
  
  /**
   * Get highlight style based on confidence
   * @param {number} confidence - Confidence score (0-100)
   * @param {boolean} stealthMode - Use randomization
   * @returns {Object} Style object
   */
  getHighlightStyle(confidence, stealthMode) {
    if (stealthMode && typeof StealthUtils !== 'undefined') {
      return StealthUtils.getHighlightStyle(confidence);
    }
    
    // Default non-stealth styles
    if (confidence >= 80) {
      return {
        border: '3px solid #22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        boxShadow: '0 0 10px rgba(34, 197, 94, 0.3)',
        transition: 'all 0.3s ease-in-out'
      };
    } else if (confidence >= 60) {
      return {
        border: '3px solid #eab308',
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        transition: 'all 0.3s ease-in-out'
      };
    } else {
      return {
        border: '3px dashed #f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.08)',
        transition: 'all 0.3s ease-in-out'
      };
    }
  },
  
  /**
   * Apply highlight style to element
   * @param {HTMLElement} element - Element to highlight
   * @param {Object} style - Style object
   */
  applyHighlight(element, style) {
    // Store original styles
    const originalStyles = {
      border: element.style.border,
      backgroundColor: element.style.backgroundColor,
      boxShadow: element.style.boxShadow,
      transition: element.style.transition,
      borderRadius: element.style.borderRadius,
      padding: element.style.padding
    };
    
    // Apply new styles
    Object.assign(element.style, style);
    
    // Add some padding if not present
    if (!element.style.padding) {
      element.style.padding = '8px 12px';
    }
    
    // Add border radius for smoother look
    if (!element.style.borderRadius) {
      element.style.borderRadius = '6px';
    }
    
    // Store for cleanup
    this.highlightedElements.push({
      element: element,
      originalStyles: originalStyles
    });
    
    // Add data attribute for identification
    element.setAttribute('data-mcq-highlighted', 'true');
  },
  
  /**
   * Add confidence badge to element
   * @param {HTMLElement} element - Element to add badge to
   * @param {number} confidence - Confidence score
   */
  addConfidenceBadge(element, confidence) {
    // Remove existing badge if present
    const existingBadge = element.querySelector('.mcq-confidence-badge');
    if (existingBadge) {
      existingBadge.remove();
    }
    
    const badge = document.createElement('span');
    badge.className = 'mcq-confidence-badge';
    badge.textContent = `${Math.round(confidence)}% confident`;
    
    // Style the badge
    Object.assign(badge.style, {
      display: 'inline-block',
      marginLeft: '8px',
      padding: '2px 8px',
      fontSize: '11px',
      fontWeight: 'bold',
      borderRadius: '12px',
      backgroundColor: this.getConfidenceBadgeColor(confidence),
      color: 'white',
      verticalAlign: 'middle',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    });
    
    // Append to element
    element.appendChild(badge);
  },
  
  /**
   * Get badge color based on confidence
   * @param {number} confidence - Confidence score
   * @returns {string} Color
   */
  getConfidenceBadgeColor(confidence) {
    if (confidence >= 80) return '#22c55e';
    if (confidence >= 60) return '#eab308';
    return '#f97316';
  },
  
  /**
   * Scroll element into view smoothly
   * @param {HTMLElement} element - Element to scroll to
   * @param {boolean} stealthMode - Use delayed scroll
   */
  async scrollToElement(element, stealthMode) {
    if (stealthMode && typeof StealthUtils !== 'undefined') {
      await StealthUtils.sleep(StealthUtils.randomDelay(300, 800));
    }
    
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  },
  
  /**
   * Clear all highlights
   */
  clearHighlights() {
    this.highlightedElements.forEach(({ element, originalStyles }) => {
      // Restore original styles
      Object.assign(element.style, originalStyles);
      
      // Remove badge
      const badge = element.querySelector('.mcq-confidence-badge');
      if (badge) {
        badge.remove();
      }
      
      // Remove data attribute
      element.removeAttribute('data-mcq-highlighted');
    });
    
    this.highlightedElements = [];
  },
  
  /**
   * Highlight multiple answers (for multiple questions)
   * @param {Array<Object>} results - Array of {mcq, answer, confidence}
   * @param {boolean} stealthMode - Use stealth mode
   */
  async highlightMultiple(results, stealthMode = true) {
    this.clearHighlights();
    
    for (const result of results) {
      await this.highlight(
        result.mcq,
        result.answer,
        result.confidence,
        stealthMode
      );
      
      // Delay between highlights
      if (stealthMode && typeof StealthUtils !== 'undefined') {
        await StealthUtils.sleep(StealthUtils.randomDelay(200, 600));
      }
    }
  },
  
  /**
   * Create visual indicator for processing
   * @param {HTMLElement} element - Element to show indicator on
   * @returns {HTMLElement} Indicator element
   */
  showProcessingIndicator(element) {
    const indicator = document.createElement('div');
    indicator.className = 'mcq-processing-indicator';
    indicator.innerHTML = `
      <div class="spinner"></div>
      <span>Analyzing...</span>
    `;
    
    Object.assign(indicator.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      border: '2px solid #3b82f6',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500',
      color: '#1e40af',
      marginTop: '8px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    });
    
    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
      .mcq-processing-indicator .spinner {
        width: 14px;
        height: 14px;
        border: 2px solid #3b82f6;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    element.appendChild(indicator);
    return indicator;
  },
  
  /**
   * Remove processing indicator
   * @param {HTMLElement} indicator - Indicator element
   */
  removeProcessingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.remove();
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Highlighter;
}