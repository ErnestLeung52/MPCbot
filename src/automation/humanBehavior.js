const config = require('../../config/config');
const logger = require('../utils/logger');

class HumanBehavior {
	/**
	 * Generate random delay within range
	 * @param {number} min - Minimum delay in milliseconds
	 * @param {number} max - Maximum delay in milliseconds
	 * @returns {number} - Random delay
	 * @private
	 */
	getRandomDelay(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	/**
	 * Sleep for a random duration
	 * @param {number} min - Minimum delay in milliseconds (optional)
	 * @param {number} max - Maximum delay in milliseconds (optional)
	 * @returns {Promise<void>}
	 */
	async randomDelay(min = null, max = null) {
		const minDelay = min !== null ? min : config.automation.minDelay;
		const maxDelay = max !== null ? max : config.automation.maxDelay;
		const delay = this.getRandomDelay(minDelay, maxDelay);

		await new Promise((resolve) => setTimeout(resolve, delay));
	}

	/**
	 * Type text in a human-like manner
	 * @param {Page} page - Playwright page instance
	 * @param {string} selector - CSS selector for the input element
	 * @param {string} text - Text to type
	 * @param {Object} options - Additional options
	 * @returns {Promise<void>}
	 */
	async humanType(page, selector, text, options = {}) {
		try {
			// Wait for element to be visible
			await page.waitForSelector(selector, { state: 'visible', timeout: 10000 });

			// Click to focus the field
			await this.humanClick(page, selector);

			// Small delay before typing
			await this.randomDelay(200, 500);

			// Clear existing text if needed
			if (options.clear !== false) {
				await page.fill(selector, '');
			}

			// Type character by character
			for (let i = 0; i < text.length; i++) {
				const char = text[i];

				// Random chance of making a typo
				if (Math.random() < config.automation.typoChance && i > 0) {
					// Type a random wrong character
					const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
					await page.type(selector, wrongChar, { delay: 0 });

					// Short delay before correcting
					await this.randomDelay(100, 300);

					// Delete the wrong character
					await page.press(selector, 'Backspace');
					await this.randomDelay(50, 150);
				}

				// Type the correct character
				const typingDelay = this.getRandomDelay(
					config.automation.typingSpeedMin,
					config.automation.typingSpeedMax,
				);
				await page.type(selector, char, { delay: typingDelay });

				// Occasional pause mid-word (simulate thinking)
				if (i > 0 && i < text.length - 1 && Math.random() < 0.1) {
					await this.randomDelay(300, 800);
				}
			}
		} catch (error) {
			logger.error(`Failed to type into ${selector}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Click element in a human-like manner
	 * @param {Page} page - Playwright page instance
	 * @param {string} selector - CSS selector for the element
	 * @param {Object} options - Additional options
	 * @returns {Promise<void>}
	 */
	async humanClick(page, selector, options = {}) {
		try {
			// Wait for element to be visible
			await page.waitForSelector(selector, { state: 'visible', timeout: 10000 });

			// Scroll element into view
			await page.locator(selector).scrollIntoViewIfNeeded();

			// Small delay after scrolling
			await this.randomDelay(200, 500);

			// Get element bounding box for mouse movement
			const element = await page.locator(selector);
			const box = await element.boundingBox();

			if (box) {
				// Move mouse to element with slight randomness
				const x = box.x + box.width / 2 + this.getRandomDelay(-10, 10);
				const y = box.y + box.height / 2 + this.getRandomDelay(-10, 10);

				await page.mouse.move(x, y, { steps: this.getRandomDelay(5, 15) });

				// Brief hover
				await this.randomDelay(100, 300);
			}

			// Click the element
			await element.click();
		} catch (error) {
			logger.error(`Failed to click ${selector}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Scroll page naturally
	 * @param {Page} page - Playwright page instance
	 * @param {number} distance - Distance to scroll (pixels, optional)
	 * @returns {Promise<void>}
	 */
	async smoothScroll(page, distance = null) {
		try {
			const scrollDistance = distance || this.getRandomDelay(300, 800);

			await page.evaluate((dist) => {
				window.scrollBy({
					top: dist,
					left: 0,
					behavior: 'smooth',
				});
			}, scrollDistance);

			// Wait for scroll to complete
			await this.randomDelay(500, 1000);
		} catch (error) {
			logger.error(`Failed to scroll: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Simulate reading by waiting and occasionally scrolling
	 * @param {Page} page - Playwright page instance
	 * @param {number} duration - Reading duration in milliseconds
	 * @returns {Promise<void>}
	 */
	async simulateReading(page, duration = null) {
		try {
			const readingTime = duration || this.getRandomDelay(2000, 5000);
			const scrollIntervals = Math.floor(readingTime / 1500);

			for (let i = 0; i < scrollIntervals; i++) {
				await this.randomDelay(1000, 2000);

				// Random chance to scroll
				if (Math.random() < 0.7) {
					await this.smoothScroll(page, this.getRandomDelay(100, 300));
				}
			}
		} catch (error) {
			logger.error(`Failed to simulate reading: ${error.message}`);
			// Don't throw - this is not critical
		}
	}

	/**
	 * Random mouse movement to simulate human activity
	 * @param {Page} page - Playwright page instance
	 * @returns {Promise<void>}
	 */
	async randomMouseMovement(page) {
		try {
			const viewport = page.viewportSize();
			if (!viewport) return;

			const x = this.getRandomDelay(0, viewport.width);
			const y = this.getRandomDelay(0, viewport.height);

			await page.mouse.move(x, y, { steps: this.getRandomDelay(10, 30) });
		} catch (error) {
			// Don't throw - this is not critical
		}
	}

	/**
	 * Select option from dropdown in human-like manner
	 * @param {Page} page - Playwright page instance
	 * @param {string} selector - CSS selector for the select element
	 * @param {string} value - Value to select
	 * @returns {Promise<void>}
	 */
	async humanSelect(page, selector, value) {
		try {
			// Click to open dropdown
			await this.humanClick(page, selector);

			// Small delay to simulate looking at options
			await this.randomDelay(300, 800);

			// Select the value
			await page.selectOption(selector, value);
		} catch (error) {
			logger.error(`Failed to select from ${selector}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Check/uncheck checkbox in human-like manner
	 * @param {Page} page - Playwright page instance
	 * @param {string} selector - CSS selector for the checkbox
	 * @param {boolean} checked - Whether to check or uncheck
	 * @returns {Promise<void>}
	 */
	async humanCheck(page, selector, checked = true) {
		try {
			const element = page.locator(selector);
			const isChecked = await element.isChecked();

			// Only click if state needs to change
			if (isChecked !== checked) {
				await this.humanClick(page, selector);
			}
		} catch (error) {
			logger.error(`Failed to check ${selector}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Wait for navigation with realistic timeout
	 * @param {Page} page - Playwright page instance
	 * @param {Function} action - Action that triggers navigation
	 * @returns {Promise<void>}
	 */
	async waitForNavigation(page, action) {
		try {
			await Promise.all([page.waitForLoadState('networkidle', { timeout: 30000 }), action()]);
		} catch (error) {
			logger.error(`Navigation failed: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Delay before submitting form (longer than usual)
	 * @returns {Promise<void>}
	 */
	async submitDelay() {
		const delay = this.getRandomDelay(config.automation.submitDelay.min, config.automation.submitDelay.max);

		await new Promise((resolve) => setTimeout(resolve, delay));
	}
}

module.exports = new HumanBehavior();
