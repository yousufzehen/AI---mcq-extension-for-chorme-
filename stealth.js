/**
 * Stealth Utilities
 * Implements anti-detection patterns for human-like behavior
 */

const StealthUtils = {
  
  /**
   * Generate random delay in milliseconds
   * @param {number} min - Minimum delay (ms)
   * @param {number} max - Maximum delay (ms)
   * @returns {number} Random delay
   */
  randomDelay(min = 1000, max = 4000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  /**
   * Simulate human typing pattern
   * @param {HTMLElement} element - Input element
   * @param {string} text - Text to type
   */
  async humanType(element, text) {
    element.value = '';
    
    for (let char of text) {
      element.value += char;
      
      // Trigger input events
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Random delay between keystrokes (50-150ms)
      await this.sleep(Math.random() * 100 + 50);
    }
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
  },
  
  /**
   * Simulate human mouse movement
   * Creates a realistic path between two points
   * @param {number} startX - Start X coordinate
   * @param {number} startY - Start Y coordinate
   * @param {number} endX - End X coordinate
   * @param {number} endY - End Y coordinate
   * @returns {Array<Object>} Path coordinates
   */
  generateMousePath(startX, startY, endX, endY) {
    const path = [];
    const steps = Math.floor(Math.random() * 10) + 15; // 15-25 steps
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      
      // Add bezier curve for natural movement
      const bezier = this.cubicBezier(progress);
      
      // Add slight randomness
      const jitterX = (Math.random() - 0.5) * 3;
      const jitterY = (Math.random() - 0.5) * 3;
      
      path.push({
        x: startX + (endX - startX) * bezier + jitterX,
        y: startY + (endY - startY) * bezier + jitterY,
        timestamp: Date.now() + (i * 10) // ~10ms between points
      });
    }
    
    return path;
  },
  
  /**
   * Cubic bezier easing function for natural acceleration/deceleration
   * @param {number} t - Progress (0-1)
   * @returns {number} Eased value
   */
  cubicBezier(t) {
    // Ease in-out cubic
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
  
  /**
   * Randomize element selection from array with weighted preference
   * @param {Array} elements - Array of elements
   * @param {number} preferredIndex - Index to prefer (but not always select)
   * @returns {*} Selected element
   */
  selectWithNoise(elements, preferredIndex) {
    // 85% chance to select preferred, 15% random
    if (Math.random() < 0.85) {
      return elements[preferredIndex];
    }
    
    const randomIndex = Math.floor(Math.random() * elements.length);
    return elements[randomIndex];
  },
  
  /**
   * Generate randomized highlight style
   * @param {number} confidence - Confidence score (0-100)
   * @returns {Object} Style properties
   */
  getHighlightStyle(confidence) {
    // Base styles with randomization
    const hueVariation = Math.random() * 10 - 5; // ±5 degrees
    const saturationVariation = Math.random() * 10 - 5; // ±5%
    
    if (confidence >= 80) {
      // High confidence - solid green
      return {
        border: `${2 + Math.random()}px solid hsl(${120 + hueVariation}, ${70 + saturationVariation}%, 45%)`,
        backgroundColor: `hsla(${120 + hueVariation}, ${50 + saturationVariation}%, 85%, ${0.15 + Math.random() * 0.1})`,
        boxShadow: `0 0 ${8 + Math.random() * 4}px hsla(${120 + hueVariation}, 70%, 50%, 0.3)`,
        transition: `all ${0.3 + Math.random() * 0.2}s ease-in-out`
      };
    } else if (confidence >= 60) {
      // Medium confidence - light highlight
      return {
        border: `${2 + Math.random()}px solid hsl(${45 + hueVariation}, ${65 + saturationVariation}%, 50%)`,
        backgroundColor: `hsla(${45 + hueVariation}, ${50 + saturationVariation}%, 85%, ${0.1 + Math.random() * 0.1})`,
        transition: `all ${0.3 + Math.random() * 0.2}s ease-in-out`
      };
    } else {
      // Low confidence - dashed orange
      return {
        border: `${2 + Math.random()}px dashed hsl(${25 + hueVariation}, ${70 + saturationVariation}%, 50%)`,
        backgroundColor: `hsla(${25 + hueVariation}, ${45 + saturationVariation}%, 88%, ${0.08 + Math.random() * 0.08})`,
        transition: `all ${0.3 + Math.random() * 0.2}s ease-in-out`
      };
    }
  },
  
  /**
   * Check if browser automation is detected
   * @returns {boolean} True if automation detected
   */
  isAutomationDetected() {
    // Check for common automation indicators
    const checks = [
      navigator.webdriver, // WebDriver flag
      window.callPhantom, // PhantomJS
      window._phantom, // PhantomJS
      window.Buffer // Node.js in browser (unusual)
    ];
    
    return checks.some(check => check !== undefined && check !== false);
  },
  
  /**
   * Obfuscate variable names at runtime
   * @param {string} name - Original name
   * @returns {string} Obfuscated name
   */
  obfuscate(name) {
    const hash = this.simpleHash(name);
    return `_${hash.toString(36)}`;
  },
  
  /**
   * Simple hash function
   * @param {string} str - String to hash
   * @returns {number} Hash value
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  },
  
  /**
   * Execute function with random delay
   * @param {Function} fn - Function to execute
   * @param {number} minDelay - Minimum delay
   * @param {number} maxDelay - Maximum delay
   */
  async executeWithDelay(fn, minDelay = 1000, maxDelay = 4000) {
    const delay = this.randomDelay(minDelay, maxDelay);
    await this.sleep(delay);
    return fn();
  },
  
  /**
   * Inject script into page context (bypasses content script isolation)
   * @param {string} code - Code to inject
   */
  injectScript(code) {
    const script = document.createElement('script');
    script.textContent = code;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  },
  
  /**
   * Generate realistic user agent string
   * @returns {string} User agent
   */
  generateUserAgent() {
    const browsers = [
      'Chrome/120.0.0.0',
      'Chrome/119.0.0.0',
      'Firefox/121.0'
    ];
    
    const os = [
      'Windows NT 10.0; Win64; x64',
      'Macintosh; Intel Mac OS X 10_15_7',
      'X11; Linux x86_64'
    ];
    
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const platform = os[Math.floor(Math.random() * os.length)];
    
    return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) ${browser} Safari/537.36`;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StealthUtils;
}