const config = require('../../config/config');
const logger = require('../utils/logger');
const humanBehavior = require('./humanBehavior');

class FormFiller {
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
        waitUntil: 'load',
        timeout: 30000
      });

      // Wait for the form to be ready (country dropdown indicates form is loaded)
      await page.waitForSelector('#addCountry', { timeout: 10000 });
      
      await humanBehavior.simulateReading(page, 2000);
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
      const errorElement = page.locator('#codeNotFoundError');
      const isErrorVisible = await errorElement.isVisible().catch(() => false);

      if (isErrorVisible) {
        const errorText = await errorElement.textContent().catch(() => 'Invalid code. Please try again.');
        return {
          success: false,
          message: errorText.trim()
        };
      }

      const errorWrapper = page.locator('#codeNotFoundErrorWrapper');
      const isWrapperPresent = await errorWrapper.count().then(count => count > 0).catch(() => false);

      if (isWrapperPresent) {
        const wrapperVisible = await errorWrapper.isVisible().catch(() => false);
        if (wrapperVisible) {
          const wrapperText = await errorWrapper.textContent().catch(() => '');
          if (wrapperText.toLowerCase().includes('invalid code')) {
            return {
              success: false,
              message: 'Invalid code. Please try again.'
            };
          }
        }
      }

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
   * @param {Object} options - Typing options (e.g., enableTypos)
   * @returns {Promise<void>}
   */
  async fillTextField(page, selector, value, options = {}) {
    try {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await humanBehavior.randomDelay(100, 200);
      await humanBehavior.humanType(page, selector, value, options);
      await humanBehavior.randomDelay(100, 200);
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
      await humanBehavior.randomDelay(100, 200);
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
   * Remove readonly attribute from an input field
   * @param {Page} page - Playwright page instance
   * @param {string} selector - CSS selector for the field
   * @returns {Promise<void>}
   */
  async removeReadonly(page, selector) {
    try {
      await page.locator(selector).evaluate(el => el.removeAttribute('readonly'));
      await humanBehavior.randomDelay(100, 300);
    } catch (error) {
      logger.error(`Failed to remove readonly from ${selector}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Type text character by character (for fields that don't allow paste)
   * @param {Page} page - Playwright page instance
   * @param {string} selector - CSS selector for the field
   * @param {string} value - Value to type
   * @returns {Promise<void>}
   */
  async typeCharacterByCharacter(page, selector, value) {
    try {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await humanBehavior.randomDelay(100, 200);
      await page.locator(selector).click();
      await humanBehavior.randomDelay(100, 200);
      await page.locator(selector).fill('');
      await humanBehavior.randomDelay(50, 100);

      for (const char of value) {
        const charDelay = humanBehavior.getRandomDelay(50, 150);
        await page.locator(selector).type(char, { delay: charDelay });
      }

      await humanBehavior.randomDelay(100, 200);
    } catch (error) {
      logger.error(`Failed to type character by character: ${error.message}`);
      throw error;
    }
  }

  /**
   * Select dropdown by visible text instead of value
   * @param {Page} page - Playwright page instance
   * @param {string} selector - CSS selector for the select element
   * @param {string} text - Visible text to select
   * @returns {Promise<void>}
   */
  async selectDropdownByText(page, selector, text) {
    try {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await humanBehavior.randomDelay(100, 200);

      await page.locator(selector).evaluate((select, textToFind) => {
        const options = Array.from(select.options);
        const option = options.find(opt => opt.text.trim() === textToFind);
        if (option) {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, text);

      await humanBehavior.randomDelay(100, 200);
    } catch (error) {
      logger.error(`Failed to select dropdown by text: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if address verification modal is displayed
   * @param {Page} page - Playwright page instance
   * @returns {Promise<boolean>} - True if modal is visible
   */
  async isAddressVerificationModalVisible(page) {
    try {
      const modal = page.locator('.modal-dialog .modal-title:has-text("Verify Address")');
      const isVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);
      return isVisible;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if card activation success modal is displayed
   * @param {Page} page - Playwright page instance
   * @returns {Promise<boolean>} - True if modal is visible
   */
  async isCardActivatedModalVisible(page) {
    try {
      const modal = page.locator('app-card-activated-modal-content');
      const isVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);
      return isVisible;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract card data from the activation success modal
   * @param {Page} page - Playwright page instance
   * @returns {Promise<Object>} - Object with cardNumber, cvv, exp
   */
  async extractCardData(page) {
    try {
      logger.info('Extracting card data from success modal...');
      
      // Wait for SVG to be fully loaded
      await page.waitForSelector('app-card-layout svg', { timeout: 10000 });
      await humanBehavior.randomDelay(1000, 2000);

      // Extract card number (text at y="107" with specific font-size)
      const cardNumber = await page.locator('app-card-layout svg text[y="107"]')
        .textContent()
        .catch(() => '');

      // Extract CVV (text at x="21" y="148")
      const cvv = await page.locator('app-card-layout svg text[x="21"][y="148"]')
        .textContent()
        .catch(() => '');

      // Extract expiration date (text at x="116" y="148")
      const exp = await page.locator('app-card-layout svg text[x="116"][y="148"]')
        .textContent()
        .catch(() => '');

      // Clean up the extracted data (remove extra spaces)
      const cardData = {
        cardNumber: cardNumber.trim().replace(/\s+/g, ''),
        cvv: cvv.trim(),
        exp: exp.trim()
      };

      logger.info(`Card extracted: ${cardData.cardNumber}, CVV: ${cardData.cvv}, Exp: ${cardData.exp}`);
      
      return cardData;
    } catch (error) {
      logger.error(`Failed to extract card data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle address verification modal
   * @param {Page} page - Playwright page instance
   * @param {string} choice - 'entered' or 'suggested' (default: 'entered')
   * @returns {Promise<void>}
   */
  async handleAddressVerification(page, choice = 'entered') {
    try {
      logger.info('Address verification modal detected');
      
      // Wait for modal to be fully visible
      await humanBehavior.randomDelay(1000, 2000);

      let buttonSelector;
      if (choice === 'suggested') {
        buttonSelector = 'button.btn-secondary:has-text("Use Suggested Address")';
        logger.info('Selecting suggested address');
      } else {
        buttonSelector = 'button.btn-primary:has-text("Use Entered Address")';
        logger.info('Selecting entered address');
      }

      // Click the chosen button
      await page.locator(buttonSelector).scrollIntoViewIfNeeded();
      await humanBehavior.randomDelay(500, 1000);
      await humanBehavior.humanClick(page, buttonSelector);
      await humanBehavior.randomDelay(1000, 2000);

      logger.info('Address verification completed');
    } catch (error) {
      logger.error(`Failed to handle address verification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fill the registration form with address and contact information
   * @param {Page} page - Playwright page instance
   * @param {Object} formData - Object containing form field values
   * @param {string} formData.firstName - First name
   * @param {string} formData.lastName - Last name
   * @param {string} formData.streetAddress - Street address
   * @param {string} formData.apartment - Apartment/Suite (optional)
   * @param {string} formData.city - City
   * @param {string} formData.state - State code (e.g., 'CA', 'NY')
   * @param {string} formData.zipCode - ZIP code
   * @param {string} formData.phoneNumber - Phone number
   * @param {string} formData.emailAddress - Email address
   * @param {string} formData.addressVerificationChoice - 'entered' or 'suggested' (default: 'entered')
   * @param {Function} [onStep] - Optional callback(message) called at each progress step
   * @returns {Promise<Object>} - Card data object
   */
  async fillRegistrationForm(page, formData, onStep) {
    const step = (msg) => { if (onStep) onStep(msg); };
    try {
      // Log task summary in one line
      logger.info(`Filling form: ${formData.emailAddress}, ${formData.firstName} ${formData.lastName}, ${formData.streetAddress}, ${formData.city}, ${formData.state}, ${formData.zipCode}`);

      // Select Country (United States)
      step('Selecting country...');
      await this.selectDropdownByText(page, '#addCountry', 'United States');
      await humanBehavior.randomDelay();

      // Fill First Name (only field with typo enabled for human-like behavior)
      step(`Filling name: ${formData.firstName} ${formData.lastName}`);
      await this.fillTextField(page, '#addFirstName', formData.firstName, { enableTypos: true });
      await humanBehavior.randomDelay();

      // Fill Last Name (no typos to ensure data accuracy)
      await this.fillTextField(page, '#addLastName', formData.lastName, { enableTypos: false });
      await humanBehavior.randomDelay();

      // Fill Street Address (no typos to ensure data accuracy)
      step(`Filling address: ${formData.streetAddress}, ${formData.city}, ${formData.state}`);
      await this.fillTextField(page, '#addLine1', formData.streetAddress, { enableTypos: false });
      await humanBehavior.randomDelay();

      // Dismiss any autocomplete dropdown that appears after typing address
      logger.info('Dismissing address autocomplete dropdown...');
      await humanBehavior.randomDelay(300, 500); // Wait for dropdown to appear
      await page.keyboard.press('Escape'); // Press Escape to close dropdown
      await humanBehavior.randomDelay(200, 300); // Wait for dropdown to close
      
      // Alternative: Click somewhere neutral to dismiss dropdown (if Escape doesn't work)
      // This simulates clicking outside the dropdown area
      await humanBehavior.clickAtCoordinates(page, 100, 100); // Click at top-left area (typically empty)
      await humanBehavior.randomDelay(100, 200);

      // Fill Apartment (optional, no typos)
      if (formData.apartment) {
        await this.fillTextField(page, '#addLine2', formData.apartment, { enableTypos: false });
        await humanBehavior.randomDelay();
      }

      // Fill City (no typos to ensure data accuracy)
      await this.fillTextField(page, '#addCity', formData.city, { enableTypos: false });
      await humanBehavior.randomDelay();

      // Select State
      await this.selectDropdown(page, '#addRegion', formData.state);
      await humanBehavior.randomDelay();

      // Fill ZIP Code (no typos for numeric fields)
      await this.fillTextField(page, '#addZIPCode', formData.zipCode, { enableTypos: false });
      await humanBehavior.randomDelay();

      // Fill Phone Number (no typos for numeric fields)
      step(`Filling phone & email...`);
      await this.fillTextField(page, '#addPhoneNumber', formData.phoneNumber, { enableTypos: false });
      await humanBehavior.randomDelay();

      // Fill Email Address (no typos to ensure data accuracy)
      await this.fillTextField(page, '#emailAddressBilling', formData.emailAddress, { enableTypos: false });
      await humanBehavior.randomDelay();

      // Fill Confirm Email Address (remove readonly, type character by character)
      await this.removeReadonly(page, '#confirmemailAddressBilling');
      await this.typeCharacterByCharacter(page, '#confirmemailAddressBilling', formData.emailAddress);
      
      // Wait for checkboxes to be present in DOM (they might load after email fields)
      await page.waitForSelector('input[formcontrolname="termsAcceptedEsign"]', { state: 'attached', timeout: 15000 });
      
      // Smooth scroll to checkbox area (not all the way to bottom)
      await page.locator('input[formcontrolname="termsAcceptedEsign"]').scrollIntoViewIfNeeded();
      await humanBehavior.randomDelay(300, 500);
      
      logger.info('Checkboxes found in DOM, proceeding to check them...');
      step('Checking E-Sign & Cardholder Agreement...');
      
      // E-Sign Disclosure checkbox - use JavaScript directly (most reliable)
      logger.info('Checking E-Sign Disclosure checkbox...');
      await humanBehavior.randomDelay(200, 300);
      
      await page.evaluate(() => {
        const checkbox = document.querySelector('input[formcontrolname="termsAcceptedEsign"]');
        if (checkbox) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          checkbox.dispatchEvent(new Event('input', { bubbles: true }));
          checkbox.dispatchEvent(new Event('click', { bubbles: true }));
        }
      });
      logger.info('E-Sign checkbox checked');
      
      await humanBehavior.randomDelay(100, 200);
      
      // Cardholder Agreement checkbox - use JavaScript directly (most reliable)
      logger.info('Checking Cardholder Agreement checkbox...');
      await humanBehavior.randomDelay(200, 300);
      
      await page.evaluate(() => {
        const checkbox = document.querySelector('input[formcontrolname="termsAcceptedCard"]');
        if (checkbox) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          checkbox.dispatchEvent(new Event('input', { bubbles: true }));
          checkbox.dispatchEvent(new Event('click', { bubbles: true }));
        }
      });
      logger.info('Cardholder Agreement checkbox checked');
      
      await humanBehavior.randomDelay(200, 300);

      // Click Activate button
      step('Clicking Activate...');
      await humanBehavior.submitDelay();
      await page.locator('button[data-trustmark-btn]').scrollIntoViewIfNeeded();
      await humanBehavior.randomDelay(500, 1000);
      await humanBehavior.humanClick(page, 'button[data-trustmark-btn]');
      
      // Wait for processing and continuously check for modals
      logger.info('Waiting for activation to process and checking for modals...');
      step('Waiting for activation...');
      
      const maxWaitTime = 20000; // Maximum 20 seconds
      const checkInterval = 1000; // Check every 1 second
      const startTime = Date.now();
      let needsVerification = false;
      let isCardActivated = false;
      
      // Keep checking for modals until one appears or timeout
      while (Date.now() - startTime < maxWaitTime) {
        // Check for address verification modal
        needsVerification = await this.isAddressVerificationModalVisible(page);
        if (needsVerification) {
          logger.info('Address verification modal detected!');
          step('Verifying address...');
          const verificationChoice = formData.addressVerificationChoice || 'entered';
          await this.handleAddressVerification(page, verificationChoice);
          
          // After handling verification, continue checking for success modal
          await humanBehavior.randomDelay(2000, 3000);
          continue;
        }
        
        // Check for card activation success modal
        isCardActivated = await this.isCardActivatedModalVisible(page);
        if (isCardActivated) {
          logger.info('Card activation success modal detected!');
          step('Extracting card data...');
          // Extract card data from the success modal
          const cardData = await this.extractCardData(page);
          logger.info('Registration form completed and card activated successfully');
          return cardData;
        }
        
        // Wait before next check
        await page.waitForTimeout(checkInterval);
        logger.info(`Still waiting for modal... (${Math.floor((Date.now() - startTime) / 1000)}s elapsed)`);
      }
      
      // If we get here, no modal appeared within timeout
      logger.warn(`No modal detected after ${maxWaitTime / 1000} seconds`);
      logger.warn('Taking screenshot for debugging...');
      
      return null;
    } catch (error) {
      logger.error(`Failed to fill registration form: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new FormFiller();
