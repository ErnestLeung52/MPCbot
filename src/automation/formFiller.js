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
        waitUntil: 'networkidle',
        timeout: 30000
      });

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
   * @returns {Promise<void>}
   */
  async fillTextField(page, selector, value) {
    try {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await humanBehavior.randomDelay(300, 700);
      await humanBehavior.humanType(page, selector, value);
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
      await humanBehavior.randomDelay(300, 700);
      await page.locator(selector).click();
      await humanBehavior.randomDelay(200, 400);
      await page.locator(selector).fill('');
      await humanBehavior.randomDelay(100, 200);

      for (const char of value) {
        const charDelay = humanBehavior.getRandomDelay(50, 150);
        await page.locator(selector).type(char, { delay: charDelay });
      }

      await humanBehavior.randomDelay(200, 500);
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
      await humanBehavior.randomDelay(300, 700);

      await page.locator(selector).evaluate((select, textToFind) => {
        const options = Array.from(select.options);
        const option = options.find(opt => opt.text.trim() === textToFind);
        if (option) {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, text);

      await humanBehavior.randomDelay(200, 500);
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
   * @returns {Promise<void>}
   */
  async fillRegistrationForm(page, formData) {
    try {
      // Log task summary in one line
      logger.info(`Filling form: ${formData.emailAddress}, ${formData.firstName} ${formData.lastName}, ${formData.streetAddress}, ${formData.city}, ${formData.state}, ${formData.zipCode}`);

      // Select Country (United States)
      await this.selectDropdownByText(page, '#addCountry', 'United States');
      await humanBehavior.randomDelay();

      // Fill First Name
      await this.fillTextField(page, '#addFirstName', formData.firstName);
      await humanBehavior.randomDelay();

      // Fill Last Name
      await this.fillTextField(page, '#addLastName', formData.lastName);
      await humanBehavior.randomDelay();

      // Fill Street Address
      await this.fillTextField(page, '#addLine1', formData.streetAddress);
      await humanBehavior.randomDelay();

      // Fill Apartment (optional)
      if (formData.apartment) {
        await this.fillTextField(page, '#addLine2', formData.apartment);
        await humanBehavior.randomDelay();
      }

      // Fill City
      await this.fillTextField(page, '#addCity', formData.city);
      await humanBehavior.randomDelay();

      // Select State
      await this.selectDropdown(page, '#addRegion', formData.state);
      await humanBehavior.randomDelay();

      // Fill ZIP Code
      await this.fillTextField(page, '#addZIPCode', formData.zipCode);
      await humanBehavior.randomDelay();

      // Fill Phone Number
      await this.fillTextField(page, '#addPhoneNumber', formData.phoneNumber);
      await humanBehavior.randomDelay();

      // Fill Email Address
      await this.fillTextField(page, '#emailAddressBilling', formData.emailAddress);
      await humanBehavior.randomDelay();

      // Fill Confirm Email Address (remove readonly, type character by character)
      await this.removeReadonly(page, '#confirmemailAddressBilling');
      await this.typeCharacterByCharacter(page, '#confirmemailAddressBilling', formData.emailAddress);
      
      // Check E-Sign Disclosure checkbox
      await this.setCheckbox(page, 'input[formcontrolname="termsAcceptedEsign"]', true);
      await humanBehavior.randomDelay();

      // Check Cardholder Agreement checkbox
      await this.setCheckbox(page, 'input[formcontrolname="termsAcceptedCard"]', true);
      await humanBehavior.randomDelay();

      // Click Activate button
      await humanBehavior.submitDelay();
      await page.locator('button[data-trustmark-btn]').scrollIntoViewIfNeeded();
      await humanBehavior.randomDelay(500, 1000);
      await humanBehavior.humanClick(page, 'button[data-trustmark-btn]');
      
      // Wait for processing (2-5 seconds as mentioned)
      logger.info('Waiting for activation to process...');
      await humanBehavior.randomDelay(2000, 3000);

      // Check if address verification modal appears
      const needsVerification = await this.isAddressVerificationModalVisible(page);
      
      if (needsVerification) {
        const verificationChoice = formData.addressVerificationChoice || 'entered';
        await this.handleAddressVerification(page, verificationChoice);
        
        // Wait for modal to close and card activation to complete
        await humanBehavior.randomDelay(2000, 3000);
      } else {
        logger.info('No address verification needed');
      }

      // Check if card activation success modal appears
      const isCardActivated = await this.isCardActivatedModalVisible(page);
      
      if (isCardActivated) {
        // Extract card data from the success modal
        const cardData = await this.extractCardData(page);
        logger.info('Registration form completed and card activated successfully');
        return cardData;
      } else {
        logger.warn('Card activation modal not detected');
        return null;
      }
    } catch (error) {
      logger.error(`Failed to fill registration form: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new FormFiller();
