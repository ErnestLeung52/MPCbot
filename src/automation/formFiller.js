const config = require('../../config/config');
const logger = require('../utils/logger');
const humanBehavior = require('./humanBehavior');

class FormFiller {
  /**
   * Navigate to target page and wait for load
   * @param {Page} page - Playwright page instance
   * @param {string} url - URL to navigate to (optional, uses config if not provided)
   * @returns {Promise<void>}
   */
  async navigateToPage(page, url = null) {
    try {
      const targetUrl = url || config.targetUrl;
      
      logger.info(`Navigating to ${targetUrl}`);
      
      await page.goto(targetUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Random delay to simulate user reading page
      await humanBehavior.simulateReading(page, 2000);

      logger.info('Page loaded successfully');
    } catch (error) {
      logger.error(`Failed to navigate to page: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fill a text input field
   * @param {Page} page - Playwright page instance
   * @param {string} selector - CSS selector for the field
   * @param {string} value - Value to enter
   * @returns {Promise<void>}
   */
  async fillTextField(page, selector, value) {
    try {
      logger.debug(`Filling text field: ${selector}`);
      
      // Scroll to element
      await page.locator(selector).scrollIntoViewIfNeeded();
      await humanBehavior.randomDelay(300, 700);

      // Type with human-like behavior
      await humanBehavior.humanType(page, selector, value);

      // Brief pause after typing
      await humanBehavior.randomDelay(200, 500);
    } catch (error) {
      logger.error(`Failed to fill text field ${selector}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Select option from dropdown
   * @param {Page} page - Playwright page instance
   * @param {string} selector - CSS selector for the select element
   * @param {string} value - Value to select
   * @returns {Promise<void>}
   */
  async selectDropdown(page, selector, value) {
    try {
      logger.debug(`Selecting dropdown: ${selector}`);
      
      await humanBehavior.humanSelect(page, selector, value);
      await humanBehavior.randomDelay(200, 500);
    } catch (error) {
      logger.error(`Failed to select dropdown ${selector}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check or uncheck a checkbox
   * @param {Page} page - Playwright page instance
   * @param {string} selector - CSS selector for the checkbox
   * @param {boolean} checked - Whether to check or uncheck
   * @returns {Promise<void>}
   */
  async setCheckbox(page, selector, checked) {
    try {
      logger.debug(`Setting checkbox: ${selector}`);
      
      await humanBehavior.humanCheck(page, selector, checked);
      await humanBehavior.randomDelay(200, 500);
    } catch (error) {
      logger.error(`Failed to set checkbox ${selector}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Click a radio button
   * @param {Page} page - Playwright page instance
   * @param {string} selector - CSS selector for the radio button
   * @returns {Promise<void>}
   */
  async selectRadio(page, selector) {
    try {
      logger.debug(`Selecting radio button: ${selector}`);
      
      await humanBehavior.humanClick(page, selector);
      await humanBehavior.randomDelay(200, 500);
    } catch (error) {
      logger.error(`Failed to select radio ${selector}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fill form with data from a row
   * @param {Page} page - Playwright page instance
   * @param {Object} formData - Object with field keys and values
   * @param {Object} formSelectors - Object with field keys and CSS selectors
   * @returns {Promise<void>}
   */
  async fillForm(page, formData, formSelectors) {
    try {
      logger.info('Starting form fill');

      // Fill each field based on mapping
      for (const [fieldKey, selector] of Object.entries(formSelectors)) {
        // Skip submit button
        if (fieldKey === 'submitButton') {
          continue;
        }

        const value = formData[fieldKey];
        
        // Skip empty optional fields
        if (!value && fieldKey === 'apartment') {
          logger.debug(`Skipping optional field "${fieldKey}" (empty)`);
          continue;
        }
        
        if (!value) {
          logger.warn(`No value for field "${fieldKey}", skipping`);
          continue;
        }

        // Determine field type and fill accordingly
        await this.fillField(page, selector, value);

        // Random delay between fields
        await humanBehavior.randomDelay();
      }

      logger.info('Form filled successfully');
    } catch (error) {
      logger.error(`Failed to fill form: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fill a single field (auto-detect type)
   * @param {Page} page - Playwright page instance
   * @param {string} selector - CSS selector for the field
   * @param {string} value - Value to enter
   * @returns {Promise<void>}
   */
  async fillField(page, selector, value) {
    try {
      // Wait for element
      await page.waitForSelector(selector, { timeout: 10000 });

      // Get element type
      const tagName = await page.locator(selector).evaluate(el => el.tagName.toLowerCase());
      const type = await page.locator(selector).evaluate(el => el.type || '');

      // Fill based on type
      if (tagName === 'select') {
        await this.selectDropdown(page, selector, value);
      } else if (type === 'checkbox') {
        const checked = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
        await this.setCheckbox(page, selector, checked);
      } else if (type === 'radio') {
        await this.selectRadio(page, selector);
      } else {
        // Default to text input
        await this.fillTextField(page, selector, value);
      }
    } catch (error) {
      logger.error(`Failed to fill field ${selector}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit the form
   * @param {Page} page - Playwright page instance
   * @param {string} submitSelector - CSS selector for submit button
   * @returns {Promise<void>}
   */
  async submitForm(page, submitSelector) {
    try {
      logger.info('Preparing to submit form');

      // Longer delay before submit
      await humanBehavior.submitDelay();

      // Scroll submit button into view
      await page.locator(submitSelector).scrollIntoViewIfNeeded();
      await humanBehavior.randomDelay(500, 1000);

      // Click submit
      await humanBehavior.humanClick(page, submitSelector);

      logger.info('Form submitted');

      // Wait for navigation or response
      await humanBehavior.randomDelay(1000, 2000);
    } catch (error) {
      logger.error(`Failed to submit form: ${error.message}`);
      throw error;
    }
  }

  /**
   * Complete form filling workflow
   * @param {Page} page - Playwright page instance
   * @param {Object} options - Options object
   * @param {Object} options.formData - Form data object with field keys and values
   * @param {Object} options.formSelectors - Form selectors object with field keys and CSS selectors
   * @param {string} options.submitSelector - Submit button selector
   * @param {string} options.url - URL to navigate to (optional)
   * @returns {Promise<void>}
   */
  async fillAndSubmit(page, options) {
    try {
      const {
        formData,
        formSelectors,
        submitSelector,
        url = null
      } = options;

      // Navigate to page
      await this.navigateToPage(page, url);

      // Fill form
      await this.fillForm(page, formData, formSelectors);

      // Submit form
      await this.submitForm(page, submitSelector);

      logger.info('Form filling and submission completed');
    } catch (error) {
      logger.error(`Form filling workflow failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify form was filled correctly (optional validation)
   * @param {Page} page - Playwright page instance
   * @param {Object} fieldMapping - Field selector mapping
   * @returns {Promise<boolean>} - True if all fields are filled
   */
  async verifyForm(page, fieldMapping) {
    try {
      logger.debug('Verifying form fields');

      for (const selector of Object.values(fieldMapping)) {
        const element = page.locator(selector);
        const value = await element.inputValue().catch(() => '');
        
        if (!value) {
          logger.warn(`Field ${selector} is empty`);
          return false;
        }
      }

      logger.debug('Form verification passed');
      return true;
    } catch (error) {
      logger.error(`Form verification failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = new FormFiller();
