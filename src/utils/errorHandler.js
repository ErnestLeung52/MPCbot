const fs = require('fs');
const path = require('path');
const config = require('../../config/config');
const logger = require('./logger');

class ErrorHandler {
  constructor() {
    this.screenshotDir = config.errorHandling.screenshotDir;
    
    // Ensure screenshot directory exists if enabled
    if (config.errorHandling.screenshotOnError && !fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  /**
   * Handle errors during automation
   * @param {Error} error - The error that occurred
   * @param {Page} page - Playwright page object (optional)
   * @param {number} taskNumber - Current task number
   * @returns {Promise<void>}
   */
  async handleError(error, page = null, taskNumber = null) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    
    // Log the error
    if (taskNumber !== null) {
      logger.logTaskError(taskNumber, '?', error);
    } else {
      logger.error(`Error occurred: ${error.message}`, { stack: error.stack });
    }

    // Take screenshot if enabled and page is available
    if (config.errorHandling.screenshotOnError && page) {
      try {
        const screenshotPath = path.join(
          this.screenshotDir,
          `error-task${taskNumber || 'unknown'}-${timestamp}.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });
        logger.info(`Screenshot saved: ${screenshotPath}`);
      } catch (screenshotError) {
        logger.error(`Failed to capture screenshot: ${screenshotError.message}`);
      }
    }

    // Classify error type
    const errorType = this.classifyError(error);
    logger.error(`Error type: ${errorType}`);

    // Stop execution if configured to do so
    if (config.errorHandling.stopOnError) {
      logger.error('Stopping execution due to error (STOP_ON_ERROR=true)');
      process.exit(1);
    }
  }

  /**
   * Classify error type for better debugging
   * @param {Error} error - The error to classify
   * @returns {string} - Error type
   */
  classifyError(error) {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT';
    } else if (message.includes('navigation') || message.includes('net::')) {
      return 'NETWORK';
    } else if (message.includes('selector') || message.includes('element')) {
      return 'ELEMENT_NOT_FOUND';
    } else if (message.includes('proxy') || message.includes('econnrefused')) {
      return 'PROXY_ERROR';
    } else if (message.includes('detected') || message.includes('blocked')) {
      return 'DETECTION';
    } else if (message.includes('frame') || message.includes('iframe')) {
      return 'IFRAME_ERROR';
    } else {
      return 'UNKNOWN';
    }
  }

  /**
   * Wrap async function with error handling
   * @param {Function} fn - Async function to wrap
   * @param {Page} page - Playwright page object
   * @param {number} taskNumber - Current task number
   * @returns {Function} - Wrapped function
   */
  wrapWithErrorHandling(fn, page, taskNumber) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        await this.handleError(error, page, taskNumber);
        throw error; // Re-throw after handling
      }
    };
  }
}

module.exports = new ErrorHandler();
