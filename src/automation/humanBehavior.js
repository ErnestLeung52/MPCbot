const config = require('../../config/config');
const logger = require('../utils/logger');

class HumanBehavior {
	/**
	 * Generate random number using Gaussian (normal) distribution
	 * More realistic than uniform distribution - values cluster around the middle
	 * @param {number} min - Minimum value
	 * @param {number} max - Maximum value
	 * @returns {number} - Random value with Gaussian distribution
	 * @private
	 */
	getGaussianRandom(min, max) {
		// Box-Muller transform for normal distribution
		const u1 = Math.random();
		const u2 = Math.random();
		const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
		
		// Convert to range [min, max] with mean at center
		const mean = (min + max) / 2;
		const stdDev = (max - min) / 6; // 99.7% of values within range
		
		const value = mean + z0 * stdDev;
		return Math.max(min, Math.min(max, value));
	}

	/**
	 * Calculate a point on a cubic Bezier curve
	 * @param {number} t - Progress along curve (0 to 1)
	 * @param {Object} p0 - Start point {x, y}
	 * @param {Object} p1 - Control point 1 {x, y}
	 * @param {Object} p2 - Control point 2 {x, y}
	 * @param {Object} p3 - End point {x, y}
	 * @returns {Object} - Point on curve {x, y}
	 * @private
	 */
	bezierCurve(t, p0, p1, p2, p3) {
		const t2 = t * t;
		const t3 = t2 * t;
		const mt = 1 - t;
		const mt2 = mt * mt;
		const mt3 = mt2 * mt;

		return {
			x: p0.x * mt3 + 3 * p1.x * mt2 * t + 3 * p2.x * mt * t2 + p3.x * t3,
			y: p0.y * mt3 + 3 * p1.y * mt2 * t + 3 * p2.y * mt * t2 + p3.y * t3
		};
	}

	/**
	 * Generate a realistic mouse path using Bezier curves with overshoot
	 * @param {Object} start - Start position {x, y}
	 * @param {Object} end - End position {x, y}
	 * @param {number} spreadSize - Control point spread (default: 0.5)
	 * @returns {Array<Object>} - Array of points {x, y}
	 * @private
	 */
	generateMousePath(start, end, spreadSize = 0.5) {
		const points = [];
		
		// Add slight overshoot for realism (humans don't move perfectly to target)
		const overshoot = Math.random() < 0.3; // 30% chance of overshoot
		let finalEnd = end;
		
		if (overshoot) {
			const overshootDistance = this.getRandomDelay(5, 15);
			const angle = Math.atan2(end.y - start.y, end.x - start.x);
			finalEnd = {
				x: end.x + Math.cos(angle) * overshootDistance,
				y: end.y + Math.sin(angle) * overshootDistance
			};
		}
		
		// Generate control points for Bezier curve
		const distX = finalEnd.x - start.x;
		const distY = finalEnd.y - start.y;
		
		const cp1 = {
			x: start.x + distX * (0.25 + Math.random() * 0.25) + (Math.random() - 0.5) * distY * spreadSize,
			y: start.y + distY * (0.25 + Math.random() * 0.25) + (Math.random() - 0.5) * distX * spreadSize
		};
		
		const cp2 = {
			x: start.x + distX * (0.75 + Math.random() * 0.25) + (Math.random() - 0.5) * distY * spreadSize,
			y: start.y + distY * (0.75 + Math.random() * 0.25) + (Math.random() - 0.5) * distX * spreadSize
		};
		
		// Generate points along the curve
		const distance = Math.sqrt(distX * distX + distY * distY);
		const steps = Math.max(10, Math.floor(distance / 10)); // More steps for longer distances
		
		for (let i = 0; i <= steps; i++) {
			const t = i / steps;
			const point = this.bezierCurve(t, start, cp1, cp2, finalEnd);
			points.push({
				x: Math.round(point.x),
				y: Math.round(point.y)
			});
		}
		
		// If we overshot, add correction back to actual target
		if (overshoot) {
			const correctionSteps = this.getRandomDelay(3, 6);
			for (let i = 1; i <= correctionSteps; i++) {
				const t = i / correctionSteps;
				points.push({
					x: Math.round(finalEnd.x + (end.x - finalEnd.x) * t),
					y: Math.round(finalEnd.y + (end.y - finalEnd.y) * t)
				});
			}
		}
		
		return points;
	}
	/**
	 * Generate random delay within range using Gaussian distribution
	 * @param {number} min - Minimum delay in milliseconds
	 * @param {number} max - Maximum delay in milliseconds
	 * @param {boolean} useGaussian - Use Gaussian distribution (default: true)
	 * @returns {number} - Random delay
	 * @private
	 */
	getRandomDelay(min, max, useGaussian = true) {
		if (useGaussian && max - min > 100) {
			// Use Gaussian for larger ranges to create more natural clustering
			return Math.floor(this.getGaussianRandom(min, max));
		}
		// Use uniform for small ranges
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
			// Validate text parameter
			if (!text || typeof text !== 'string') {
				throw new Error(`Invalid text parameter: ${text}`);
			}

			// Wait for element to be visible
			await page.waitForSelector(selector, { state: 'visible', timeout: 10000 });

			// Click to focus the field
			await this.humanClick(page, selector);

			// Small delay before typing
			await this.randomDelay(100, 200);

			// Clear existing text if needed
			if (options.clear !== false) {
				await page.fill(selector, '');
			}

			// Check if typos are enabled (can be disabled per field or globally)
			const enableTypos = options.enableTypos !== false && config.automation.typoChance > 0;

			// Type character by character
			for (let i = 0; i < text.length; i++) {
				const char = text[i];

				// Random chance of making a typo (only on letter characters, not numbers)
				const isLetter = /[a-zA-Z]/.test(char);
				if (enableTypos && isLetter && Math.random() < config.automation.typoChance && i > 0) {
					// Type a random wrong character
					const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
					await page.type(selector, wrongChar, { delay: 0 });

					// Longer delay before correcting to ensure character is visible
					await this.randomDelay(200, 400);

					// Delete the wrong character
					await page.press(selector, 'Backspace');
					
					// IMPORTANT: Wait for deletion to complete before continuing
					await this.randomDelay(200, 400);
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
	 * Click element in a human-like manner with Bezier curve mouse movement
	 * @param {Page} page - Playwright page instance
	 * @param {string} selector - CSS selector for the element
	 * @param {Object} options - Additional options
	 * @returns {Promise<void>}
	 */
	async humanClick(page, selector, options = {}) {
		try {
			const timeout = options.timeout || 15000; // Increased default timeout to 15 seconds
			
			// Wait for element to be visible
			await page.waitForSelector(selector, { state: 'visible', timeout });

			// Scroll element into view
			await page.locator(selector).scrollIntoViewIfNeeded();

			// Small delay after scrolling
			await this.randomDelay(100, 200);

			// Get current mouse position
			const currentPos = await page.evaluate(() => {
				return { x: window.mouseX || 0, y: window.mouseY || 0 };
			});

			// Get element bounding box
			const element = await page.locator(selector);
			const box = await element.boundingBox();

			if (box) {
				// Calculate target position with slight randomness (not dead center)
				const targetX = box.x + box.width / 2 + this.getRandomDelay(-10, 10, false);
				const targetY = box.y + box.height / 2 + this.getRandomDelay(-10, 10, false);
				
				// Generate realistic mouse path using Bezier curves
				const path = this.generateMousePath(
					currentPos,
					{ x: targetX, y: targetY },
					0.3 + Math.random() * 0.4 // Randomize curve spread
				);

				// Move along the path with variable speed
				for (let i = 0; i < path.length; i++) {
					const point = path[i];
					await page.mouse.move(point.x, point.y);
					
					// Variable delay between movements (faster in middle, slower at start/end)
					const progress = i / path.length;
					const speedMultiplier = Math.sin(progress * Math.PI); // Ease in/out
					const delay = Math.max(1, Math.floor(5 * (1 - speedMultiplier * 0.7)));
					
					if (delay > 1) {
						await new Promise(resolve => setTimeout(resolve, delay));
					}
				}

				// Update mouse position in page context
				await page.evaluate((pos) => {
					window.mouseX = pos.x;
					window.mouseY = pos.y;
				}, { x: targetX, y: targetY });

				// Brief hover before click
				await this.randomDelay(50, 150);
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
	 * Random mouse movement to simulate human activity with Bezier curves
	 * @param {Page} page - Playwright page instance
	 * @returns {Promise<void>}
	 */
	async randomMouseMovement(page) {
		try {
			const viewport = page.viewportSize();
			if (!viewport) return;

			// Get current mouse position
			const currentPos = await page.evaluate(() => {
				return { x: window.mouseX || viewport.width / 2, y: window.mouseY || viewport.height / 2 };
			});

			// Random target within viewport
			const targetX = this.getRandomDelay(50, viewport.width - 50);
			const targetY = this.getRandomDelay(50, viewport.height - 50);

			// Generate realistic mouse path
			const path = this.generateMousePath(
				currentPos,
				{ x: targetX, y: targetY },
				0.5 + Math.random() * 0.3
			);

			// Move along the path
			for (const point of path) {
				await page.mouse.move(point.x, point.y);
				await new Promise(resolve => setTimeout(resolve, this.getRandomDelay(5, 15, false)));
			}

			// Update mouse position
			await page.evaluate((pos) => {
				window.mouseX = pos.x;
				window.mouseY = pos.y;
			}, { x: targetX, y: targetY });
		} catch (error) {
			// Don't throw - this is not critical
		}
	}

	/**
	 * Click at specific coordinates with Bezier curve movement
	 * @param {Page} page - Playwright page instance
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 * @returns {Promise<void>}
	 */
	async clickAtCoordinates(page, x, y) {
		try {
			// Get current mouse position
			const currentPos = await page.evaluate(() => {
				return { x: window.mouseX || 0, y: window.mouseY || 0 };
			});

			// Generate realistic mouse path
			const path = this.generateMousePath(
				currentPos,
				{ x, y },
				0.3 + Math.random() * 0.3
			);

			// Move along the path
			for (const point of path) {
				await page.mouse.move(point.x, point.y);
				await new Promise(resolve => setTimeout(resolve, this.getRandomDelay(3, 10, false)));
			}

			// Update mouse position
			await page.evaluate((pos) => {
				window.mouseX = pos.x;
				window.mouseY = pos.y;
			}, { x, y });

			// Brief delay before click
			await this.randomDelay(50, 100);
			
			// Click
			await page.mouse.click(x, y);
		} catch (error) {
			logger.error(`Failed to click at coordinates (${x}, ${y}): ${error.message}`);
			throw error;
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
