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
        logger.info(`Screenshot saved: ${path.basename(screenshotPath)}`);
      } catch (screenshotError) {
        logger.error(`Failed to capture screenshot: ${screenshotError.message}`);
      }
    }

    // Stop execution if configured to do so
    if (config.errorHandling.stopOnError) {
      logger.error('Stopping execution due to error (STOP_ON_ERROR=true)');
      process.exit(1);
    }
  }
}

module.exports = new ErrorHandler();
