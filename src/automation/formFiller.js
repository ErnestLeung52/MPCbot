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
      
      await page.goto(targetUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Random delay to simulate user reading page
      await humanBehavior.simulateReading(page, 2000);
    } catch (error) {
      logger.error(`Failed to navigate to page: ${error.message}`);
      throw error;
    }
  }

  /**
   * Navigate with redeem code and validate if it's valid
   * @param {Page} page - Playwright page instance
   * @param {string} baseUrl - Base URL (e.g., 'https://www.myprepaidcenter.com/redeem?ecode=')
   * @param {string} redeemCode - Redeem code to append to URL
   * @returns {Promise<Object>} - Object with {success: boolean, message: string}
   */
  async navigateWithRedeemCode(page, baseUrl, redeemCode) {
    try {
      const fullUrl = baseUrl + redeemCode;
      
      await page.goto(fullUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for page to fully load
      await humanBehavior.simulateReading(page, 2000);

      // Check if redeem code is valid by looking for error indicators
      return await this.validateRedeemPage(page);
    } catch (error) {
      logger.error(`Failed to navigate with redeem code: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate if the redeem page loaded successfully or shows an error
   * @param {Page} page - Playwright page instance
   * @returns {Promise<Object>} - Object with {success: boolean, message: string}
   */
  async validateRedeemPage(page) {
    try {
      // Primary check: Look for the specific "Invalid code" error element
      // This element appears when redeem code is incorrect:
      // <small id="codeNotFoundError" class="text-danger">Invalid code. Please try again.</small>
      const errorElement = page.locator('#codeNotFoundError');
      const isErrorVisible = await errorElement.isVisible().catch(() => false);

      if (isErrorVisible) {
        const errorText = await errorElement.textContent().catch(() => 'Invalid code. Please try again.');
        return {
          success: false,
          message: errorText.trim()
        };
      }

      // Additional check: Look for the error wrapper (in case the error is present but not visible yet)
      const errorWrapper = page.locator('#codeNotFoundErrorWrapper');
      const isWrapperPresent = await errorWrapper.count().then(count => count > 0).catch(() => false);

      if (isWrapperPresent) {
        const wrapperVisible = await errorWrapper.isVisible().catch(() => false);
        if (wrapperVisible) {
          // Check if the wrapper contains the error text
          const wrapperText = await errorWrapper.textContent().catch(() => '');
          if (wrapperText.toLowerCase().includes('invalid code')) {
            return {
              success: false,
              message: 'Invalid code. Please try again.'
            };
          }
        }
      }

      // Success: No error indicators found, redeem code is valid
      return {
        success: true,
        message: 'Form page loaded successfully'
      };

    } catch (error) {
      logger.error(`Error during page validation: ${error.message}`);
      return {
        success: false,
        message: `Validation error: ${error.message}`
      };
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
      // Fill each field based on mapping
      for (const [fieldKey, selector] of Object.entries(formSelectors)) {
        // Skip submit button
        if (fieldKey === 'submitButton') {
          continue;
        }

        const value = formData[fieldKey];
        
        // Skip empty optional fields
        if (!value && fieldKey === 'apartment') {
          continue;
        }
        
        if (!value) {
          continue;
        }

        // Determine field type and fill accordingly
        await this.fillField(page, selector, value);

        // Random delay between fields
        await humanBehavior.randomDelay();
      }
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
      // Longer delay before submit
      await humanBehavior.submitDelay();

      // Scroll submit button into view
      await page.locator(submitSelector).scrollIntoViewIfNeeded();
      await humanBehavior.randomDelay(500, 1000);

      // Click submit
      await humanBehavior.humanClick(page, submitSelector);

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
      for (const selector of Object.values(fieldMapping)) {
        const element = page.locator(selector);
        const value = await element.inputValue().catch(() => '');
        
        if (!value) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error(`Form verification failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = new FormFiller();
