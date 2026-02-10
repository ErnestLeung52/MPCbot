const logger = require('../utils/logger');
const humanBehavior = require('./humanBehavior');

class IframeExtractor {
  /**
   * Wait for iframe to appear on page
   * @param {Page} page - Playwright page instance
   * @param {string} iframeSelector - CSS selector for iframe element
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Frame>} - Playwright frame object
   */
  async waitForIframe(page, iframeSelector, timeout = 30000) {
    try {
      // Wait for iframe element to appear
      await page.waitForSelector(iframeSelector, {
        state: 'attached',
        timeout
      });

      // Small delay to ensure iframe content loads
      await humanBehavior.randomDelay(1000, 2000);

      // Get the iframe element
      const iframeElement = await page.$(iframeSelector);
      
      if (!iframeElement) {
        throw new Error(`Iframe element not found: ${iframeSelector}`);
      }

      // Get the frame
      const frame = await iframeElement.contentFrame();
      
      if (!frame) {
        throw new Error('Could not access iframe content');
      }

      return frame;
    } catch (error) {
      logger.error(`Failed to load iframe: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get iframe by index
   * @param {Page} page - Playwright page instance
   * @param {number} index - Index of the iframe (0-based)
   * @returns {Promise<Frame>} - Playwright frame object
   */
  async getIframeByIndex(page, index = 0) {
    try {
      const frames = page.frames();
      
      if (index >= frames.length) {
        throw new Error(`Iframe index ${index} out of range (${frames.length} frames found)`);
      }

      return frames[index];
    } catch (error) {
      logger.error(`Failed to get iframe by index: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get iframe by URL pattern
   * @param {Page} page - Playwright page instance
   * @param {string|RegExp} urlPattern - URL pattern to match
   * @returns {Promise<Frame>} - Playwright frame object
   */
  async getIframeByUrl(page, urlPattern) {
    try {
      // Convert string to RegExp if needed
      const pattern = typeof urlPattern === 'string' 
        ? new RegExp(urlPattern) 
        : urlPattern;

      // Find frame matching URL
      const frame = page.frames().find(f => pattern.test(f.url()));

      if (!frame) {
        throw new Error(`No iframe found matching URL pattern: ${urlPattern}`);
      }

      return frame;
    } catch (error) {
      logger.error(`Failed to get iframe by URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract text from element inside iframe
   * @param {Frame} frame - Playwright frame instance
   * @param {string} selector - CSS selector for the element
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<string>} - Extracted text
   */
  async extractText(frame, selector, timeout = 10000) {
    try {
      // Wait for element in iframe
      await frame.waitForSelector(selector, {
        state: 'visible',
        timeout
      });

      // Extract text content
      const text = await frame.$eval(selector, el => el.textContent.trim());

      return text;
    } catch (error) {
      logger.error(`Failed to extract text from ${selector}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract attribute from element inside iframe
   * @param {Frame} frame - Playwright frame instance
   * @param {string} selector - CSS selector for the element
   * @param {string} attribute - Attribute name to extract
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<string>} - Extracted attribute value
   */
  async extractAttribute(frame, selector, attribute, timeout = 10000) {
    try {
      // Wait for element in iframe
      await frame.waitForSelector(selector, {
        state: 'attached',
        timeout
      });

      // Extract attribute
      const value = await frame.$eval(
        selector,
        (el, attr) => el.getAttribute(attr),
        attribute
      );

      return value;
    } catch (error) {
      logger.error(`Failed to extract attribute from ${selector}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract multiple elements' text content
   * @param {Frame} frame - Playwright frame instance
   * @param {string} selector - CSS selector for elements
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Array<string>>} - Array of text contents
   */
  async extractMultiple(frame, selector, timeout = 10000) {
    try {
      // Wait for at least one element
      await frame.waitForSelector(selector, {
        state: 'attached',
        timeout
      });

      // Extract all matching elements' text
      const texts = await frame.$$eval(selector, elements =>
        elements.map(el => el.textContent.trim())
      );

      return texts;
    } catch (error) {
      logger.error(`Failed to extract multiple elements: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract data using custom evaluation function
   * @param {Frame} frame - Playwright frame instance
   * @param {Function} evalFunction - Function to evaluate in frame context
   * @returns {Promise<any>} - Extracted data
   */
  async extractCustom(frame, evalFunction) {
    try {
      const data = await frame.evaluate(evalFunction);

      return data;
    } catch (error) {
      logger.error(`Custom extraction failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract structured data from iframe
   * @param {Page} page - Playwright page instance
   * @param {Object} config - Extraction configuration
   * @param {string} config.iframeSelector - Iframe selector (optional)
   * @param {number} config.iframeIndex - Iframe index (optional)
   * @param {string|RegExp} config.iframeUrl - Iframe URL pattern (optional)
   * @param {Object} config.fields - Field selectors to extract
   * @returns {Promise<Object>} - Extracted data object
   */
  async extract(page, config) {
    try {
      // Get iframe
      let frame;
      if (config.iframeSelector) {
        frame = await this.waitForIframe(page, config.iframeSelector);
      } else if (config.iframeUrl) {
        frame = await this.getIframeByUrl(page, config.iframeUrl);
      } else if (config.iframeIndex !== undefined) {
        frame = await this.getIframeByIndex(page, config.iframeIndex);
      } else {
        // Default to first iframe (index 1, as 0 is main frame)
        frame = await this.getIframeByIndex(page, 1);
      }

      // Extract data from fields
      const extractedData = {};

      if (config.fields) {
        for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
          try {
            let value;

            if (typeof fieldConfig === 'string') {
              // Simple selector - extract text
              value = await this.extractText(frame, fieldConfig);
            } else if (typeof fieldConfig === 'object') {
              // Complex config with type
              const { selector, type, attribute } = fieldConfig;

              switch (type) {
                case 'text':
                  value = await this.extractText(frame, selector);
                  break;
                case 'attribute':
                  value = await this.extractAttribute(frame, selector, attribute);
                  break;
                case 'multiple':
                  value = await this.extractMultiple(frame, selector);
                  break;
                default:
                  value = await this.extractText(frame, selector);
              }
            }

            extractedData[fieldName] = value;
          } catch (fieldError) {
            logger.warn(`Failed to extract ${fieldName}: ${fieldError.message}`);
            extractedData[fieldName] = null;
          }
        }
      }

      return extractedData;
    } catch (error) {
      logger.error(`Iframe extraction failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Wait for specific text to appear in iframe
   * @param {Frame} frame - Playwright frame instance
   * @param {string} text - Text to wait for
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} - True if text appeared
   */
  async waitForText(frame, text, timeout = 10000) {
    try {
      await frame.waitForFunction(
        (searchText) => document.body.textContent.includes(searchText),
        text,
        { timeout }
      );

      return true;
    } catch (error) {
      logger.error(`Text not found in iframe: ${error.message}`);
      return false;
    }
  }
}

module.exports = new IframeExtractor();
