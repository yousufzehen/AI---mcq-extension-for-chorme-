/**
 * AI Service
 * Handles communication with AI models (OpenAI or Ollama)
 */

const OpenAI = require('openai');
const axios = require('axios');
const { 
  AI_PROVIDER, 
  OPENAI_API_KEY, 
  OPENAI_MODEL,
  OPENAI_MAX_TOKENS,
  OPENAI_TEMPERATURE,
  OLLAMA_URL,
  OLLAMA_MODEL,
  PROMPTS,
  HTTP_STATUS
} = require('../config/constants');

class AIService {
  constructor() {
    this.provider = AI_PROVIDER;
    
    if (this.provider === 'openai') {
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY in .env file.');
      }
      this.openai = new OpenAI({
        apiKey: OPENAI_API_KEY
      });
    }
  }
  
  /**
   * Answer an MCQ question
   * @param {string} question - The question text
   * @param {Array<string>} options - Array of option texts
   * @returns {Promise<Object>} Answer object
   */
  async answerMCQ(question, options) {
    if (!question || !options || options.length === 0) {
      throw new Error('Invalid question or options');
    }
    
    const userPrompt = PROMPTS.MCQ_USER_TEMPLATE(question, options);
    
    let response;
    
    if (this.provider === 'openai') {
      response = await this._callOpenAI(userPrompt);
    } else if (this.provider === 'ollama') {
      response = await this._callOllama(userPrompt);
    } else {
      throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
    
    return this._parseAIResponse(response, options);
  }
  
  /**
   * Call OpenAI API
   * @param {string} userPrompt - User prompt
   * @returns {Promise<string>} AI response
   */
  async _callOpenAI(userPrompt) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: PROMPTS.MCQ_SYSTEM
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: OPENAI_MAX_TOKENS,
        temperature: OPENAI_TEMPERATURE,
        response_format: { type: 'json_object' } // Ensure JSON response
      });
      
      return completion.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (error.status === 503) {
        throw new Error('OpenAI service temporarily unavailable');
      }
      
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
  
  /**
   * Call Ollama (local LLM)
   * @param {string} userPrompt - User prompt
   * @returns {Promise<string>} AI response
   */
  async _callOllama(userPrompt) {
    try {
      const response = await axios.post(
        `${OLLAMA_URL}/api/generate`,
        {
          model: OLLAMA_MODEL,
          prompt: `${PROMPTS.MCQ_SYSTEM}\n\n${userPrompt}`,
          stream: false,
          format: 'json',
          options: {
            temperature: OPENAI_TEMPERATURE,
            num_predict: OPENAI_MAX_TOKENS
          }
        },
        {
          timeout: 60000 // 60 second timeout for local LLM
        }
      );
      
      return response.data.response;
    } catch (error) {
      console.error('Ollama error:', error);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama is not running. Please start Ollama server.');
      }
      
      throw new Error(`Ollama error: ${error.message}`);
    }
  }
  
  /**
   * Parse AI response and validate
   * @param {string} responseText - Raw AI response
   * @param {Array<string>} options - Original options for validation
   * @returns {Object} Parsed and validated response
   */
  _parseAIResponse(responseText, options) {
    try {
      // Try to parse JSON
      const parsed = JSON.parse(responseText);
      
      // Validate required fields
      if (!parsed.answer) {
        throw new Error('AI response missing "answer" field');
      }
      
      if (typeof parsed.confidence !== 'number') {
        // Try to extract confidence if it's a string
        if (typeof parsed.confidence === 'string') {
          parsed.confidence = parseFloat(parsed.confidence);
        } else {
          parsed.confidence = 70; // Default confidence
        }
      }
      
      if (!parsed.explanation) {
        parsed.explanation = 'No explanation provided';
      }
      
      // Normalize confidence to 0-100 range
      parsed.confidence = Math.max(0, Math.min(100, parsed.confidence));
      
      // Try to match answer to actual options
      const matchedOption = this._matchAnswerToOption(parsed.answer, options);
      if (matchedOption) {
        parsed.answer = matchedOption;
      }
      
      return {
        answer: parsed.answer,
        confidence: Math.round(parsed.confidence),
        explanation: parsed.explanation
      };
      
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw response:', responseText);
      
      // Fallback: try to extract answer from unstructured text
      return this._fallbackParse(responseText, options);
    }
  }
  
  /**
   * Fallback parsing for non-JSON responses
   * @param {string} text - Response text
   * @param {Array<string>} options - Options
   * @returns {Object} Best-effort parsed response
   */
  _fallbackParse(text, options) {
    // Try to find option letter (A, B, C, D)
    const letterMatch = text.match(/\b([A-D])[.\):\s]/i);
    if (letterMatch) {
      const index = letterMatch[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
      if (index >= 0 && index < options.length) {
        return {
          answer: options[index],
          confidence: 50,
          explanation: 'Extracted from unstructured response'
        };
      }
    }
    
    // Try to match any option text
    for (const option of options) {
      if (text.toLowerCase().includes(option.toLowerCase())) {
        return {
          answer: option,
          confidence: 40,
          explanation: 'Matched from response text'
        };
      }
    }
    
    // Last resort: return first option with low confidence
    return {
      answer: options[0],
      confidence: 20,
      explanation: 'Unable to parse AI response reliably'
    };
  }
  
  /**
   * Match AI answer to closest option
   * @param {string} answer - AI answer
   * @param {Array<string>} options - Available options
   * @returns {string|null} Matched option
   */
  _matchAnswerToOption(answer, options) {
    const cleanAnswer = answer.toLowerCase().trim();
    
    // Exact match
    for (const option of options) {
      if (option.toLowerCase().trim() === cleanAnswer) {
        return option;
      }
    }
    
    // Contains match
    for (const option of options) {
      if (cleanAnswer.includes(option.toLowerCase().trim())) {
        return option;
      }
    }
    
    // Option contains answer
    for (const option of options) {
      if (option.toLowerCase().trim().includes(cleanAnswer)) {
        return option;
      }
    }
    
    // Letter matching (A, B, C, D)
    const letterMatch = answer.match(/^([A-D])[.\):\s]/i);
    if (letterMatch) {
      const index = letterMatch[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
      if (index >= 0 && index < options.length) {
        return options[index];
      }
    }
    
    return null;
  }
  
  /**
   * Health check for AI service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      if (this.provider === 'openai') {
        // Simple test call
        await this.openai.models.list();
        return {
          status: 'healthy',
          provider: 'openai',
          model: OPENAI_MODEL
        };
      } else if (this.provider === 'ollama') {
        const response = await axios.get(`${OLLAMA_URL}/api/tags`);
        return {
          status: 'healthy',
          provider: 'ollama',
          model: OLLAMA_MODEL,
          available: response.data.models || []
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: this.provider,
        error: error.message
      };
    }
  }
}

module.exports = new AIService();