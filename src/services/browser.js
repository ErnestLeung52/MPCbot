const { chromium } = require('patchright');
const path = require('path');
const fs = require('fs').promises;
const config = require('../../config/config');
const logger = require('../utils/logger');

class BrowserService {
	constructor() {
		this.context = null;
	}

	/**
	 * Fix Chrome preferences to prevent "Restore pages?" dialog
	 * Sets exit_type to "Normal" and exited_cleanly to true
	 * @returns {Promise<void>}
	 */
	async fixChromePreferences() {
		try {
			const userDataDir = path.join(__dirname, '../../.browser-profile');
			const defaultProfileDir = path.join(userDataDir, 'Default');
			const prefsPath = path.join(defaultProfileDir, 'Preferences');

			// Check if Preferences file exists
			try {
				await fs.access(prefsPath);
				
				// Read and modify preferences
				const prefsContent = await fs.readFile(prefsPath, 'utf-8');
				const prefs = JSON.parse(prefsContent);
				
				// Set flags to indicate clean shutdown
				if (!prefs.profile) prefs.profile = {};
				prefs.profile.exit_type = 'Normal';
				prefs.profile.exited_cleanly = true;
				
				// Write back
				await fs.writeFile(prefsPath, JSON.stringify(prefs, null, 2));
				logger.info('  ✓ Chrome preferences fixed (exit_type: Normal)');
				
			} catch (error) {
				// Preferences file doesn't exist yet, which is fine
				if (error.code !== 'ENOENT') {
					logger.warn(`  Could not fix preferences: ${error.message}`);
				}
			}
		} catch (error) {
			// Don't throw, just log
			logger.warn(`Failed to fix Chrome preferences: ${error.message}`);
		}
	}

	/**
	 * Delete persistent browser data files (history, cookies, cache, etc.)
	 * This removes the actual database files that store browsing data
	 * More thorough than CDP clearing, but keeps profile structure
	 * @returns {Promise<void>}
	 */
	async deletePersistentDataFiles() {
		try {
			const userDataDir = path.join(__dirname, '../../.browser-profile');
			const defaultProfileDir = path.join(userDataDir, 'Default');
			
			// Check if Default profile directory exists
			try {
				await fs.access(defaultProfileDir);
			} catch {
				logger.info('No existing profile data to clear');
				return;
			}

			logger.info('Deleting persistent browser data files...');
			const startTime = Date.now();
			let deletedCount = 0;

			// List of files/folders to delete for complete clearing
			const filesToDelete = [
				// History files
				'History',
				'History-journal',
				'Visited Links',
				'Top Sites',
				'Top Sites-journal',
				
				// Cookie files
				'Cookies',
				'Cookies-journal',
				'Network Action Predictor',
				'Network Action Predictor-journal',
				
				// Cache directories
				'Cache',
				'Code Cache',
				'GPUCache',
				'Service Worker',
				
				// Session and login data - CRITICAL for "Restore pages" dialog
				'Sessions',
				'Session Storage',
				'Login Data',
				'Login Data-journal',
				'Web Data',
				'Web Data-journal',
				'Current Session',      // ← Prevents "Restore pages" dialog
				'Current Tabs',         // ← Prevents "Restore pages" dialog
				'Last Session',         // ← Prevents "Restore pages" dialog
				'Last Tabs',            // ← Prevents "Restore pages" dialog
				
				// Other tracking/state files
				'Favicons',
				'Favicons-journal',
				'Shortcuts',
				'Shortcuts-journal',
				'QuotaManager',
				'QuotaManager-journal',
				'TransportSecurity',
				'Local Storage',
				'IndexedDB',
				'Storage',
				'shared_proto_db',
			];

			// Delete each file/folder
			for (const fileName of filesToDelete) {
				const filePath = path.join(defaultProfileDir, fileName);
				try {
					await fs.rm(filePath, { recursive: true, force: true });
					deletedCount++;
				} catch (error) {
					// File might not exist, which is fine
					if (error.code !== 'ENOENT') {
						logger.warn(`  Could not delete ${fileName}: ${error.message}`);
					}
				}
			}

			const duration = Date.now() - startTime;
			logger.info(`✓ Deleted ${deletedCount} persistent data files/folders (${duration}ms)`);

		} catch (error) {
			logger.error(`Failed to delete persistent data files: ${error.message}`);
			// Don't throw - continue execution
		}
	}

	/**
	 * Launch browser with PROPER patchright configuration
	 * Based on: https://roundproxies.com/blog/patchright/
	 *
	 * KEY CONFIGURATION:
	 * 1. Use launchPersistentContext (not launch) - creates real Chrome profile
	 * 2. Use channel: 'chrome' - real Chrome, not Chromium (critical!)
	 * 3. NO custom userAgent - let patchright handle it
	 * 4. NO custom viewport - use viewport: null for native resolution
	 * 5. NO custom headers - detection vector
	 * 6. GPU args only - force M1 Metal backend to avoid SwiftShader detection
	 *
	 * @param {Object} proxy - Proxy configuration (optional)
	 * @returns {Promise<BrowserContext>} - Patchright persistent context
	 */
	async launch(proxy = null) {
		try {
			// CRITICAL: Delete all persistent data files BEFORE launching
			// This ensures a completely fresh browser state for each task
			await this.deletePersistentDataFiles();
			
			// Fix Chrome preferences to prevent "Restore pages?" dialog
			await this.fixChromePreferences();

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
					'--disable-session-crashed-bubble', // Disable "Chrome didn't shut down correctly" bubble
					'--hide-crash-restore-bubble',      // Hide restore bubble
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
			}

			// Launch persistent context (NOT regular launch)
			// This creates a real Chrome profile with history, making it undetectable
			this.context = await chromium.launchPersistentContext(userDataDir, launchOptions);

			return this.context;
		} catch (error) {
			logger.error(`Failed to launch browser: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get or create a page from persistent context
	 * IMPORTANT: launchPersistentContext already creates a default blank page
	 * We reuse this page instead of creating a new one (avoids 2 tabs)
	 * @param {BrowserContext} context - Persistent context (not used, kept for API compatibility)
	 * @returns {Promise<Page>} - Patchright page instance
	 */
	async createPage(context = null) {
		try {
			const actualContext = context || this.context;

			if (!actualContext) {
				throw new Error('Browser context not initialized. Call launch() first.');
			}

			// PERFORMANCE FIX: Reuse existing page instead of creating new one
			// launchPersistentContext automatically creates a blank page
			// Reusing it prevents opening 2 tabs (empty + target URL)
			const existingPages = actualContext.pages();
			
			if (existingPages.length > 0) {
				// Reuse the first (default) page
				const page = existingPages[0];
				logger.info('✓ Reusing existing browser page (1 tab only)');
				return page;
			}

			// Fallback: Create new page if none exists (shouldn't happen with persistent context)
			const page = await actualContext.newPage();
			logger.warn('Created new page (no existing pages found)');

			// Patchright automatically provides:
			// - Runtime.enable bypass (isolated ExecutionContexts)
			// - Console.enable bypass (Console API disabled)
			// - navigator.webdriver removed (--disable-blink-features=AutomationControlled)
			// - All command flag leaks patched
			// - Closed Shadow DOM access

			return page;
		} catch (error) {
			logger.error(`Failed to get page: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Clear all browser data to prevent detection and session tracking
	 * Removes cookies, cache, history, local storage, session storage, and indexed DB
	 * @param {BrowserContext} context - Context to clear (optional)
	 * @returns {Promise<void>}
	 */
	async clearBrowserData(context = null) {
		try {
			const actualContext = context || this.context;
			
			if (!actualContext) {
				logger.warn('No browser context to clear');
				return;
			}

			logger.info('Clearing all browser data (including history)...');
			const startTime = Date.now();

			// Get a page to use for CDP commands
			let pages = actualContext.pages();
			let page = pages.length > 0 ? pages[0] : await actualContext.newPage();

			// Use Chrome DevTools Protocol to clear ALL browsing data including history
			// This is the most comprehensive way to clear everything
			const cdpSession = await page.context().newCDPSession(page);
			
			try {
				// Clear all browsing data types including history
				await cdpSession.send('Storage.clearDataForOrigin', {
					origin: '*',
					storageTypes: 'all'
				});
				logger.info('  ✓ Origin storage cleared');

				// Clear browsing data including history, cache, cookies, everything
				await cdpSession.send('Network.clearBrowserCache');
				logger.info('  ✓ Browser cache cleared');

				await cdpSession.send('Network.clearBrowserCookies');
				logger.info('  ✓ Browser cookies cleared');

				// Most importantly: Clear ALL browsing history and site data
				// This removes history entries from the profile
				await cdpSession.send('Storage.clearCookies');
				logger.info('  ✓ Storage cookies cleared');

			} catch (cdpError) {
				logger.warn(`  CDP clearing partial: ${cdpError.message}`);
			} finally {
				await cdpSession.detach();
			}

			// Additional: Use Playwright's built-in clearing methods
			await actualContext.clearCookies();
			await actualContext.clearPermissions();
			logger.info('  ✓ Context cookies and permissions cleared');

			// Clear storage for all pages in context
			pages = actualContext.pages();
			for (const currentPage of pages) {
				try {
					// Clear local storage, session storage, cache, and indexed DB
					await currentPage.evaluate(() => {
						// Clear local storage
						if (window.localStorage) {
							window.localStorage.clear();
						}
						
						// Clear session storage
						if (window.sessionStorage) {
							window.sessionStorage.clear();
						}
						
						// Clear indexed DB
						if (window.indexedDB && window.indexedDB.databases) {
							window.indexedDB.databases().then(databases => {
								databases.forEach(db => {
									if (db.name) {
										window.indexedDB.deleteDatabase(db.name);
									}
								});
							});
						}
					});
					
					// Clear cache storage
					await currentPage.evaluate(async () => {
						if ('caches' in window) {
							const cacheNames = await caches.keys();
							await Promise.all(cacheNames.map(name => caches.delete(name)));
						}
					});

				} catch (pageError) {
					logger.warn(`  Could not clear storage for page: ${pageError.message}`);
				}
			}
			logger.info('  ✓ Page storage cleared (localStorage, sessionStorage, cache, indexedDB)');

			const duration = Date.now() - startTime;
			logger.info(`✓ All browser data cleared successfully (${duration}ms)`);

			// Short delay to ensure clearing is complete
			await new Promise(resolve => setTimeout(resolve, 800));

		} catch (error) {
			logger.error(`Failed to clear browser data: ${error.message}`);
			// Don't throw - continue execution even if clearing fails
		}
	}

	/**
	 * Completely wipe the browser profile folder
	 * WARNING: This removes ALL data including the entire profile
	 * Use this for maximum freshness, but profile will lose "age"
	 * @returns {Promise<void>}
	 */
	async wipeBrowserProfile() {
		try {
			const userDataDir = path.join(__dirname, '../../.browser-profile');
			
			// Check if profile exists
			try {
				await fs.access(userDataDir);
			} catch {
				logger.info('Browser profile does not exist, nothing to wipe');
				return;
			}

			logger.info('Wiping browser profile folder completely...');
			const startTime = Date.now();
			
			// Delete entire profile directory
			await fs.rm(userDataDir, { recursive: true, force: true });
			
			const duration = Date.now() - startTime;
			logger.info(`✓ Browser profile wiped successfully (${duration}ms)`);
			
		} catch (error) {
			logger.error(`Failed to wipe browser profile: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Close browser context gracefully
	 * Prevents "Restore pages?" dialog on next launch
	 * @param {BrowserContext} context - Context to close (or use stored context)
	 * @returns {Promise<void>}
	 */
	async close(context = null) {
		try {
			const actualContext = context || this.context;
			if (actualContext) {
				// Close all pages first (graceful shutdown)
				const pages = actualContext.pages();
				for (const page of pages) {
					try {
						await page.close();
					} catch (pageError) {
						// Ignore page close errors
					}
				}

				// Close context
				await actualContext.close();
				this.context = null;
				
				// Fix preferences after closing to mark clean exit
				await this.fixChromePreferences();
				
				logger.info('✓ Browser closed gracefully');
			}
		} catch (error) {
			logger.error(`Error closing browser: ${error.message}`);
		}
	}

	/**
	 * Emergency cleanup - force close everything
	 * Used when Ctrl+C is pressed or process is terminating
	 * @returns {Promise<void>}
	 */
	async forceClose() {
		try {
			if (this.context) {
				logger.info('Force closing browser...');
				
				// Try to close gracefully first
				try {
					const pages = this.context.pages();
					await Promise.all(pages.map(p => p.close().catch(() => {})));
					await this.context.close();
				} catch (error) {
					// Ignore errors during force close
				}
				
				this.context = null;
				
				// CRITICAL: Fix preferences to prevent restore dialog
				await this.fixChromePreferences();
				
				logger.info('✓ Browser force closed');
			}
		} catch (error) {
			// Silent fail on force close
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
