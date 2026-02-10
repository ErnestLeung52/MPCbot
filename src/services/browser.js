const { chromium } = require('patchright');
const path = require('path');
const config = require('../../config/config');
const logger = require('../utils/logger');

class BrowserService {
	constructor() {
		this.context = null;
	}

	/**
	 * Launch browser with PROPER patchright configuration
	 * Based on: https://roundproxies.com/blog/patchright/
	 *
	 * KEY CHANGES:
	 * 1. Use launchPersistentContext (not launch) - creates real Chrome profile
	 * 2. Use channel: 'chrome' - real Chrome, not Chromium (critical!)
	 * 3. NO custom userAgent - let patchright handle it
	 * 4. NO custom viewport - use viewport: null for native resolution
	 * 5. NO custom headers - detection vector
	 * 6. NO args array - let patchright's patches handle everything
	 *
	 * @param {Object} proxy - Proxy configuration (optional)
	 * @returns {Promise<BrowserContext>} - Patchright persistent context
	 */
	async launch(proxy = null) {
		try {
			// Use a persistent user data directory (simulates real Chrome profile)
			// This creates browsing history, cookies, local storage, etc.
			const userDataDir = path.join(__dirname, '../../.browser-profile');

			// Build launch options following the guide's recommendations
			// Reference: https://roundproxies.com/blog/patchright/#step-2-configure-for-maximum-stealth
			const launchOptions = {
				// CRITICAL: Use real Chrome, not Chromium
				// "Real users don't browse with Chromium, and anti-bot systems know this"
				channel: 'chrome',

				// NEVER use headless for critical scraping
				// Modern detection can spot headless browsers instantly
				headless: config.browser.headless,

				// Use native viewport (don't constrain it)
				// This makes the browser use its natural resolution
				viewport: null,

				// Let patchright handle user agent automatically
				// DON'T add custom user_agent here - it's a detection vector

				// GPU-specific flags to force M1 Metal backend instead of SwiftShader
				// This is critical for avoiding GPU fingerprint detection
				// Patchright will merge these with its own stealth flags
				args: [
					'--use-gl=angle',           // Use ANGLE (Almost Native Graphics Layer Engine)
					'--use-angle=metal',        // Force Metal backend for M1 GPU
					'--ignore-gpu-blocklist',   // Don't block GPU even if blacklisted
					'--enable-gpu-rasterization', // Enable GPU-accelerated rasterization
				],
			};

			// Add proxy if provided
			if (proxy) {
				launchOptions.proxy = {
					server: proxy.server,
				};

				if (proxy.username) {
					launchOptions.proxy.username = proxy.username;
				}

				if (proxy.password) {
					launchOptions.proxy.password = proxy.password;
				}

				logger.debug('Launching Chrome with proxy');
			} else {
				logger.debug('Launching Chrome without proxy');
			}

			// Launch persistent context (NOT regular launch)
			// This creates a real Chrome profile with history, making it undetectable
			this.context = await chromium.launchPersistentContext(userDataDir, launchOptions);

			logger.info('✓ Real Chrome launched with persistent profile (maximum stealth)');
			logger.info('  Channel: chrome (not Chromium)');
			logger.info('  Profile: Persistent user data directory');
			logger.info('  Detection: Runtime.enable bypassed, CDP leaks patched');

			return this.context;
		} catch (error) {
			logger.error(`Failed to launch browser: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Create a new page from persistent context
	 * @param {BrowserContext} context - Persistent context (not used, kept for API compatibility)
	 * @returns {Promise<Page>} - Patchright page instance
	 */
	async createPage(context = null) {
		try {
			// With launchPersistentContext, the context is already created
			// Just create a new page directly
			const actualContext = context || this.context;

			if (!actualContext) {
				throw new Error('Browser context not initialized. Call launch() first.');
			}

			// Create page - NO custom settings
			// Don't add userAgent, viewport, extraHTTPHeaders, etc.
			// Let patchright and Chrome handle everything naturally
			const page = await actualContext.newPage();

			// Patchright automatically provides:
			// - Runtime.enable bypass (isolated ExecutionContexts)
			// - Console.enable bypass (Console API disabled)
			// - navigator.webdriver removed (--disable-blink-features=AutomationControlled)
			// - All command flag leaks patched
			// - Closed Shadow DOM access

			logger.debug('New page created from persistent context');
			return page;
		} catch (error) {
			logger.error(`Failed to create page: ${error.message}`);
			throw error;
		}
	}

	/**
	 * DEPRECATED: Custom stealth scripts removed
	 *
	 * This method has been removed because custom stealth scripts conflict with
	 * patchright's built-in patches and can introduce detection vectors.
	 *
	 * Patchright already handles:
	 * - Runtime.enable leak (via isolated ExecutionContexts)
	 * - Console.enable leak (Console API disabled)
	 * - navigator.webdriver (via --disable-blink-features=AutomationControlled)
	 * - Command flag leaks (tweaks Playwright default args)
	 * - General leaks and obvious detection points
	 *
	 * Layering custom scripts over patchright's patches creates inconsistencies
	 * that modern detection systems can identify. Trust patchright's implementation.
	 *
	 * If you need additional stealth, consider:
	 * - Using residential proxies (not datacenter IPs)
	 * - Updating to the latest patchright version
	 * - Checking patchright GitHub issues for known bypasses
	 * - Testing with minimal configuration first
	 */

	/**
	 * Close browser context
	 * @param {BrowserContext} context - Context to close (or use stored context)
	 * @returns {Promise<void>}
	 */
	async close(context = null) {
		try {
			const actualContext = context || this.context;
			if (actualContext) {
				await actualContext.close();
				logger.debug('Browser context closed');
				this.context = null;
			}
		} catch (error) {
			logger.error(`Error closing browser: ${error.message}`);
		}
	}

	/**
	 * Get browser context
	 * @returns {BrowserContext|null} - Current browser context
	 */
	getBrowser() {
		return this.context;
	}
}

module.exports = new BrowserService();
