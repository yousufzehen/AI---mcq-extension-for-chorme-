/**
 * Popup Script
 * Handles UI interactions and communicates with content script
 */

(function() {
  'use strict';
  
  // DOM Elements
  const elements = {
    statusValue: document.getElementById('statusValue'),
    mcqCount: document.getElementById('mcqCount'),
    detectBtn: document.getElementById('detectBtn'),
    solveAllBtn: document.getElementById('solveAllBtn'),
    clearBtn: document.getElementById('clearBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    loadingText: document.getElementById('loadingText'),
    mcqListSection: document.getElementById('mcqListSection'),
    mcqList: document.getElementById('mcqList'),
    resultsSection: document.getElementById('resultsSection'),
    resultsContainer: document.getElementById('resultsContainer'),
    settingsPanel: document.getElementById('settingsPanel'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    stealthModeToggle: document.getElementById('stealthModeToggle'),
    autoHighlightToggle: document.getElementById('autoHighlightToggle'),
    backendUrl: document.getElementById('backendUrl'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn')
  };
  
  // State
  let detectedMCQs = [];
  let currentSettings = {};
  
  /**
   * Initialize popup
   */
  async function init() {
    // Load settings
    await loadSettings();
    
    // Attach event listeners
    attachEventListeners();
    
    // Update UI
    updateStatus('Ready', 'success');
  }
  
  /**
   * Attach event listeners
   */
  function attachEventListeners() {
    elements.detectBtn.addEventListener('click', handleDetect);
    elements.solveAllBtn.addEventListener('click', handleSolveAll);
    elements.clearBtn.addEventListener('click', handleClear);
    elements.settingsBtn.addEventListener('click', showSettings);
    elements.closeSettingsBtn.addEventListener('click', hideSettings);
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
  }
  
  /**
   * Load settings from storage
   */
  async function loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      currentSettings = response || {
        stealthMode: true,
        autoHighlight: true,
        backendUrl: 'http://localhost:3000'
      };
      
      // Update UI
      elements.stealthModeToggle.checked = currentSettings.stealthMode;
      elements.autoHighlightToggle.checked = currentSettings.autoHighlight;
      elements.backendUrl.value = currentSettings.backendUrl;
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  /**
   * Save settings
   */
  async function saveSettings() {
    const settings = {
      stealthMode: elements.stealthModeToggle.checked,
      autoHighlight: elements.autoHighlightToggle.checked,
      backendUrl: elements.backendUrl.value.trim()
    };
    
    try {
      await chrome.runtime.sendMessage({
        action: 'saveSettings',
        data: settings
      });
      
      // Also update content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, {
        action: 'updateSettings',
        data: settings
      });
      
      currentSettings = settings;
      
      // Show success feedback
      const btn = elements.saveSettingsBtn;
      const originalText = btn.textContent;
      btn.textContent = '✓ Saved';
      btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
      }, 2000);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  }
  
  /**
   * Show settings panel
   */
  function showSettings() {
    elements.settingsPanel.style.display = 'block';
  }
  
  /**
   * Hide settings panel
   */
  function hideSettings() {
    elements.settingsPanel.style.display = 'none';
  }
  
  /**
   * Handle detect button click
   */
  async function handleDetect() {
    setLoading(true, 'Detecting MCQs...');
    elements.detectBtn.disabled = true;
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'detectMCQs'
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      detectedMCQs = response.mcqs || [];
      
      updateStatus(`Found ${response.count} MCQs`, 'success');
      elements.mcqCount.textContent = response.count;
      
      // Enable solve button if MCQs found
      if (response.count > 0) {
        elements.solveAllBtn.disabled = false;
        elements.clearBtn.disabled = false;
        displayMCQList(detectedMCQs);
      } else {
        updateStatus('No MCQs found', 'warning');
      }
      
    } catch (error) {
      console.error('Error detecting MCQs:', error);
      updateStatus('Detection failed', 'error');
      showError(error.message || 'Failed to detect MCQs. Make sure you\'re on a page with questions.');
    } finally {
      setLoading(false);
      elements.detectBtn.disabled = false;
    }
  }
  
  /**
   * Handle solve all button click
   */
  async function handleSolveAll() {
    if (detectedMCQs.length === 0) {
      alert('Please detect MCQs first');
      return;
    }
    
    setLoading(true, 'Analyzing questions...');
    elements.solveAllBtn.disabled = true;
    elements.detectBtn.disabled = true;
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'solveAll'
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      updateStatus(`Solved ${response.solved}/${response.total}`, 'success');
      displayResults(response.results);
      
    } catch (error) {
      console.error('Error solving MCQs:', error);
      updateStatus('Analysis failed', 'error');
      showError(error.message || 'Failed to analyze questions. Check if backend is running.');
    } finally {
      setLoading(false);
      elements.solveAllBtn.disabled = false;
      elements.detectBtn.disabled = false;
    }
  }
  
  /**
   * Handle clear button click
   */
  async function handleClear() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'clearHighlights'
      });
      
      // Clear results
      elements.resultsSection.style.display = 'none';
      elements.resultsContainer.innerHTML = '';
      
      updateStatus('Highlights cleared', 'success');
      
    } catch (error) {
      console.error('Error clearing highlights:', error);
    }
  }
  
  /**
   * Display MCQ list
   * @param {Array} mcqs - List of MCQs
   */
  function displayMCQList(mcqs) {
    elements.mcqListSection.style.display = 'block';
    elements.mcqList.innerHTML = '';
    
    mcqs.forEach((mcq, index) => {
      const item = document.createElement('div');
      item.className = 'mcq-item';
      
      const question = document.createElement('div');
      question.className = 'mcq-question';
      question.textContent = mcq.question;
      
      const meta = document.createElement('div');
      meta.className = 'mcq-meta';
      
      const type = document.createElement('span');
      type.textContent = mcq.type;
      
      const optionsCount = document.createElement('span');
      optionsCount.className = 'mcq-options-count';
      optionsCount.textContent = `${mcq.options.length} options`;
      
      meta.appendChild(type);
      meta.appendChild(optionsCount);
      
      item.appendChild(question);
      item.appendChild(meta);
      
      // Add click handler to solve individual question
      item.addEventListener('click', () => solveIndividualMCQ(index));
      
      elements.mcqList.appendChild(item);
    });
  }
  
  /**
   * Solve individual MCQ
   * @param {number} index - MCQ index
   */
  async function solveIndividualMCQ(index) {
    setLoading(true, 'Analyzing question...');
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'solveMCQ',
        data: { index }
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      updateStatus('Question analyzed', 'success');
      displayResults([{
        index,
        success: true,
        ...response
      }]);
      
    } catch (error) {
      console.error('Error solving MCQ:', error);
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }
  
  /**
   * Display results
   * @param {Array} results - Analysis results
   */
  function displayResults(results) {
    elements.resultsSection.style.display = 'block';
    elements.resultsContainer.innerHTML = '';
    
    results.forEach((result, i) => {
      const item = document.createElement('div');
      item.className = result.success ? 'result-item' : 'result-item error';
      
      if (result.success) {
        const header = document.createElement('div');
        header.className = 'result-header';
        
        const question = document.createElement('div');
        question.className = 'result-question';
        question.textContent = `Q${result.index + 1}`;
        
        const badge = document.createElement('div');
        badge.className = `confidence-badge ${getConfidenceClass(result.confidence)}`;
        badge.textContent = `${Math.round(result.confidence)}%`;
        
        header.appendChild(question);
        header.appendChild(badge);
        
        const answer = document.createElement('div');
        answer.className = 'result-answer';
        answer.textContent = `Answer: ${result.answer}`;
        
        const explanation = document.createElement('div');
        explanation.className = 'result-explanation';
        explanation.textContent = result.explanation;
        
        item.appendChild(header);
        item.appendChild(answer);
        item.appendChild(explanation);
      } else {
        const question = document.createElement('div');
        question.className = 'result-question';
        question.textContent = `Q${result.index + 1}`;
        
        const error = document.createElement('div');
        error.className = 'result-error';
        error.textContent = `Error: ${result.error}`;
        
        item.appendChild(question);
        item.appendChild(error);
      }
      
      elements.resultsContainer.appendChild(item);
    });
  }
  
  /**
   * Get confidence badge class
   * @param {number} confidence - Confidence score
   * @returns {string} Class name
   */
  function getConfidenceClass(confidence) {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
  }
  
  /**
   * Update status display
   * @param {string} message - Status message
   * @param {string} type - Status type (success, warning, error)
   */
  function updateStatus(message, type = 'info') {
    elements.statusValue.textContent = message;
    
    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#6b7280'
    };
    
    elements.statusValue.style.color = colors[type] || colors.info;
  }
  
  /**
   * Show/hide loading indicator
   * @param {boolean} show - Whether to show loading
   * @param {string} text - Loading text
   */
  function setLoading(show, text = 'Processing...') {
    if (show) {
      elements.loadingIndicator.style.display = 'block';
      elements.loadingText.textContent = text;
    } else {
      elements.loadingIndicator.style.display = 'none';
    }
  }
  
  /**
   * Show error message
   * @param {string} message - Error message
   */
  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px;
      margin-top: 12px;
      color: #991b1b;
      font-size: 13px;
    `;
    errorDiv.textContent = message;
    
    elements.main.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 5000);
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();