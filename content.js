/**
 * Content Script
 * Runs in the context of web pages
 * Orchestrates MCQ extraction, AI analysis, and answer highlighting
 */

(function() {
  'use strict';
  
  // State management
  let currentMCQs = [];
  let isProcessing = false;
  let settings = {
    stealthMode: true,
    autoHighlight: true
  };
  
  /**
   * Initialize content script
   */
  function init() {
    console.log('MCQ Assistant content script loaded');
    
    // Load settings
    loadSettings();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Inject custom styles
    injectStyles();
  }
  
  /**
   * Load settings from storage
   */
  async function loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (response) {
        settings = { ...settings, ...response };
      }
    } catch (error) {
      console.warn('Could not load settings:', error);
    }
  }
  
  /**
   * Handle messages from popup or background
   * @param {Object} request - Message request
   * @param {Object} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  function handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'detectMCQs':
        detectMCQs().then(sendResponse);
        return true;
        
      case 'solveMCQ':
        solveMCQ(request.data).then(sendResponse);
        return true;
        
      case 'solveAll':
        solveAllMCQs().then(sendResponse);
        return true;
        
      case 'clearHighlights':
        clearHighlights();
        sendResponse({ success: true });
        return true;
        
      case 'updateSettings':
        settings = { ...settings, ...request.data };
        sendResponse({ success: true });
        return true;
        
      default:
        sendResponse({ error: 'Unknown action' });
        return false;
    }
  }
  
  /**
   * Detect MCQs on the page
   * @returns {Promise<Object>} Detection result
   */
  async function detectMCQs() {
    try {
      // Add stealth delay
      if (settings.stealthMode) {
        await StealthUtils.sleep(StealthUtils.randomDelay(500, 1500));
      }
      
      // Extract MCQs using the extractor
      currentMCQs = MCQExtractor.extractAll();
      
      console.log(`Detected ${currentMCQs.length} MCQs on page`);
      
      // Return simplified version (without DOM elements)
      const simplifiedMCQs = currentMCQs.map((mcq, index) => ({
        index: index,
        question: mcq.question,
        options: mcq.options.map(opt => opt.text),
        type: mcq.type
      }));
      
      return {
        success: true,
        count: currentMCQs.length,
        mcqs: simplifiedMCQs
      };
    } catch (error) {
      console.error('Error detecting MCQs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Solve a single MCQ
   * @param {Object} data - MCQ data with index
   * @returns {Promise<Object>} Solution result
   */
  async function solveMCQ(data) {
    if (isProcessing) {
      return { error: 'Already processing a request' };
    }
    
    isProcessing = true;
    
    try {
      const { index } = data;
      
      if (index < 0 || index >= currentMCQs.length) {
        throw new Error('Invalid MCQ index');
      }
      
      const mcq = currentMCQs[index];
      
      // Show processing indicator
      let indicator;
      if (mcq.questionElement) {
        indicator = Highlighter.showProcessingIndicator(mcq.questionElement);
      }
      
      // Add stealth delay before API call
      if (settings.stealthMode) {
        await StealthUtils.sleep(StealthUtils.randomDelay(1000, 3000));
      }
      
      // Send to background for AI analysis
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeQuestion',
        data: {
          question: mcq.question,
          options: mcq.options.map(opt => opt.text)
        }
      });
      
      // Remove processing indicator
      if (indicator) {
        Highlighter.removeProcessingIndicator(indicator);
      }
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      const { answer, confidence, explanation } = response.data;
      
      // Highlight answer if auto-highlight is enabled
      if (settings.autoHighlight) {
        await Highlighter.highlight(
          mcq,
          answer,
          confidence,
          settings.stealthMode
        );
      }
      
      return {
        success: true,
        answer: answer,
        confidence: confidence,
        explanation: explanation
      };
      
    } catch (error) {
      console.error('Error solving MCQ:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      isProcessing = false;
    }
  }
  
  /**
   * Solve all detected MCQs
   * @returns {Promise<Object>} Results
   */
  async function solveAllMCQs() {
    if (isProcessing) {
      return { error: 'Already processing a request' };
    }
    
    if (currentMCQs.length === 0) {
      return { error: 'No MCQs detected. Please detect MCQs first.' };
    }
    
    isProcessing = true;
    const results = [];
    
    try {
      for (let i = 0; i < currentMCQs.length; i++) {
        const mcq = currentMCQs[i];
        
        // Show processing indicator
        let indicator;
        if (mcq.questionElement) {
          indicator = Highlighter.showProcessingIndicator(mcq.questionElement);
        }
        
        // Add stealth delay between requests
        if (settings.stealthMode && i > 0) {
          await StealthUtils.sleep(StealthUtils.randomDelay(2000, 4000));
        } else if (i > 0) {
          await StealthUtils.sleep(1000); // Minimum delay to avoid rate limiting
        }
        
        try {
          // Send to background for AI analysis
          const response = await chrome.runtime.sendMessage({
            action: 'analyzeQuestion',
            data: {
              question: mcq.question,
              options: mcq.options.map(opt => opt.text)
            }
          });
          
          // Remove processing indicator
          if (indicator) {
            Highlighter.removeProcessingIndicator(indicator);
          }
          
          if (response.error) {
            results.push({
              index: i,
              success: false,
              error: response.error
            });
            continue;
          }
          
          const { answer, confidence, explanation } = response.data;
          
          // Highlight answer if auto-highlight is enabled
          if (settings.autoHighlight) {
            await Highlighter.highlight(
              mcq,
              answer,
              confidence,
              settings.stealthMode
            );
          }
          
          results.push({
            index: i,
            success: true,
            answer: answer,
            confidence: confidence,
            explanation: explanation
          });
          
        } catch (error) {
          console.error(`Error solving MCQ ${i}:`, error);
          
          // Remove processing indicator on error
          if (indicator) {
            Highlighter.removeProcessingIndicator(indicator);
          }
          
          results.push({
            index: i,
            success: false,
            error: error.message
          });
        }
      }
      
      return {
        success: true,
        total: currentMCQs.length,
        solved: results.filter(r => r.success).length,
        results: results
      };
      
    } catch (error) {
      console.error('Error solving all MCQs:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      isProcessing = false;
    }
  }
  
  /**
   * Clear all highlights from the page
   */
  function clearHighlights() {
    Highlighter.clearHighlights();
  }
  
  /**
   * Inject custom CSS styles
   */
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* MCQ Assistant Styles */
      [data-mcq-highlighted="true"] {
        position: relative;
        z-index: 1;
      }
      
      .mcq-confidence-badge {
        user-select: none;
        pointer-events: none;
      }
      
      .mcq-processing-indicator {
        animation: fadeIn 0.3s ease-in-out;
      }
      
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Ensure highlights don't interfere with page layout */
      [data-mcq-highlighted="true"]:not(input):not(button) {
        box-sizing: border-box;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Cleanup on page unload
   */
  window.addEventListener('beforeunload', () => {
    clearHighlights();
  });
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();