/**
 * Background Service Worker (Manifest V3)
 * Handles message passing between popup, content script, and backend API
 */

const CONFIG = {
  BACKEND_URL: 'http://localhost:3000',
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 2
};

/**
 * Listen for messages from popup or content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeQuestion') {
    handleAnalyzeQuestion(request.data)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'performOCR') {
    handleOCR(request.data)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  
  if (request.action === 'getSettings') {
    getSettings().then(sendResponse);
    return true;
  }
  
  if (request.action === 'saveSettings') {
    saveSettings(request.data).then(sendResponse);
    return true;
  }
});

/**
 * Send question to AI backend
 * @param {Object} data - Question and options
 * @returns {Promise<Object>} AI response
 */
async function handleAnalyzeQuestion(data) {
  const { question, options } = data;
  
  if (!question || !options || options.length === 0) {
    throw new Error('Invalid question data');
  }
  
  const settings = await getSettings();
  const endpoint = `${settings.backendUrl || CONFIG.BACKEND_URL}/api/answer`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, options }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Validate response structure
    if (!result.answer || typeof result.confidence !== 'number') {
      throw new Error('Invalid response from AI backend');
    }
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error analyzing question:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Backend may be offline.');
    }
    
    throw new Error(`Failed to get AI response: ${error.message}`);
  }
}

/**
 * Handle OCR request
 * @param {Object} data - Image or PDF data
 * @returns {Promise<Object>} Extracted text
 */
async function handleOCR(data) {
  const { fileData, fileType } = data;
  
  const settings = await getSettings();
  const endpoint = `${settings.backendUrl || CONFIG.BACKEND_URL}/api/ocr`;
  
  try {
    const formData = new FormData();
    const blob = await (await fetch(fileData)).blob();
    formData.append('file', blob, `upload.${fileType}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT * 2); // OCR takes longer
    
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`OCR service error: ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error performing OCR:', error);
    throw new Error(`OCR failed: ${error.message}`);
  }
}

/**
 * Get extension settings from storage
 * @returns {Promise<Object>} Settings object
 */
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['backendUrl', 'stealthMode', 'autoHighlight'], (items) => {
      resolve({
        backendUrl: items.backendUrl || CONFIG.BACKEND_URL,
        stealthMode: items.stealthMode !== false, // Default true
        autoHighlight: items.autoHighlight !== false // Default true
      });
    });
  });
}

/**
 * Save extension settings
 * @param {Object} settings - Settings to save
 * @returns {Promise<Object>} Success response
 */
async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => {
      resolve({ success: true });
    });
  });
}

/**
 * Log analytics (for debugging, can be disabled in production)
 */
function logEvent(eventName, data) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[MCQ Assistant] ${eventName}:`, data);
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    logEvent('Extension Installed', { version: chrome.runtime.getManifest().version });
    
    // Set default settings
    chrome.storage.sync.set({
      backendUrl: CONFIG.BACKEND_URL,
      stealthMode: true,
      autoHighlight: true
    });
  }
});

console.log('MCQ Assistant background service worker initialized');