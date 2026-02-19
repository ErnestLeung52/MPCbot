const { chromium } = require('patchright');
const path = require('path');
const fs = require('fs').promises;
const config = require('../../config/config');
const logger = require('../utils/logger');

/** Maximum number of concurrent browser slots (profiles) */
const MAX_SLOTS = 3;

class BrowserService {
	constructor() {
		/** @type {Object.<number, import('patchright').BrowserContext>} */
		this.contexts = {};
		/** Number of concurrent slots (1, 2, or 3) */
		this.maxSlots = 1;
	}

	/**
	 * Set concurrency (number of browser profiles). Call before launch.
	 * @param {number} n - 1, 2, or 3
	 */
	setConcurrency(n) {
		const num = Math.min(MAX_SLOTS, Math.max(1, Number(n) || 1));
		this.maxSlots = num;
	}

	/**
	 * Get profile directory for a slot. Each slot has an isolated profile.
	 * @param {number} slotIndex - 0, 1, or 2
	 * @returns {string}
	 */
	getProfileDir(slotIndex) {
		const base = path.join(__dirname, '../..');
		return path.join(base, slotIndex === 0 ? '.browser-profile-0' : `.browser-profile-${slotIndex}`);
	}

	/**
	 * Fix Chrome preferences to prevent "Restore pages?" dialog
	 * Sets exit_type to "Normal" and exited_cleanly to true
	 * @param {number} [slotIndex=0]
	 * @returns {Promise<void>}
	 */
	async fixChromePreferences(slotIndex = 0) {
		try {
			const userDataDir = this.getProfileDir(slotIndex);
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
	 * @param {number} [slotIndex=0]
	 * @returns {Promise<void>}
	 */
	async deletePersistentDataFiles(slotIndex = 0) {
		try {
			const userDataDir = this.getProfileDir(slotIndex);
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
	 * Each slot uses its own profile directory so concurrent sessions stay isolated and fresh.
	 *
	 * @param {number} slotIndex - Browser slot (0 to maxSlots-1)
	 * @param {Object} [proxy=null] - Proxy configuration (optional)
	 * @returns {Promise<BrowserContext>} - Patchright persistent context
	 */
	async launch(slotIndex = 0, proxy = null) {
		try {
			// Backward compat: launch(proxy) with single argument
			if (arguments.length === 1 && slotIndex && typeof slotIndex === 'object' && slotIndex.server) {
				proxy = slotIndex;
				slotIndex = 0;
			}
			const slot = Math.min(slotIndex, this.maxSlots - 1);

			// CRITICAL: Delete all persistent data files BEFORE launching for this slot
			// This ensures a completely fresh browser state for each task
			await this.deletePersistentDataFiles(slot);

			// Fix Chrome preferences to prevent "Restore pages?" dialog
			await this.fixChromePreferences(slot);

			const userDataDir = this.getProfileDir(slot);

			// Build launch options following the guide's recommendations
			// Reference: https://roundproxies.com/blog/patchright/#step-2-configure-for-maximum-stealth
			const launchOptions = {
				channel: 'chrome',
				headless: config.browser.headless,
				viewport: null,
				args: [
					'--use-gl=angle',
					'--use-angle=metal',
					'--ignore-gpu-blocklist',
					'--enable-gpu-rasterization',
					'--disable-session-crashed-bubble',
					'--hide-crash-restore-bubble',
				],
			};

			if (proxy) {
				launchOptions.proxy = {
					server: proxy.server,
				};
				if (proxy.username) launchOptions.proxy.username = proxy.username;
				if (proxy.password) launchOptions.proxy.password = proxy.password;
			}

			const context = await chromium.launchPersistentContext(userDataDir, launchOptions);
			this.contexts[slot] = context;

			// Guard against Chrome spontaneously opening extra tabs (extension pages,
			// background pages, New Tab, etc.). Any page that opens after the initial
			// blank one is closed immediately so the bot always works with exactly one tab.
			context.on('page', () => {
				setImmediate(async () => {
					try {
						const pages = context.pages();
						for (let i = 1; i < pages.length; i++) {
							await pages[i].close().catch(() => {});
						}
					} catch {
						// Ignore — context may already be closing
					}
				});
			});

			return context;
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
			const actualContext = context || this.contexts[0];

			if (!actualContext) {
				throw new Error('Browser context not initialized. Call launch() first.');
			}

			// launchPersistentContext always opens exactly one blank page.
			// Close any extras that Chrome may have opened (extension pages, NTP, etc.)
			// then return the single working page.
			const existingPages = actualContext.pages();

			// Close any pages beyond the first one
			for (let i = 1; i < existingPages.length; i++) {
				await existingPages[i].close().catch(() => {});
			}

			if (existingPages.length > 0) {
				logger.info('✓ Reusing existing browser page (1 tab only)');
				return existingPages[0];
			}

			// Fallback: create a page if none exists (edge case)
			logger.warn('No existing page found — creating new page');
			return await actualContext.newPage();
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
			const actualContext = context || this.contexts[0];
			
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
	 * Completely wipe the browser profile folder for a slot
	 * WARNING: This removes ALL data including the entire profile
	 * @param {number} [slotIndex=0]
	 * @returns {Promise<void>}
	 */
	async wipeBrowserProfile(slotIndex = 0) {
		try {
			const userDataDir = this.getProfileDir(slotIndex);
			
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
	 * Close browser context gracefully. Finds the slot for this context and clears it.
	 * Prevents "Restore pages?" dialog on next launch.
	 * Uses a 5-second timeout to prevent hanging when the browser process is already dead.
	 * @param {BrowserContext} [context=null] - Context to close
	 * @returns {Promise<void>}
	 */
	async close(context = null) {
		const actualContext = context || this.contexts[0];
		if (!actualContext) return;

		// Find and immediately clear the slot so the next batch can reuse it
		let closedSlot = null;
		for (let s = 0; s < this.maxSlots; s++) {
			if (this.contexts[s] === actualContext) {
				closedSlot = s;
				this.contexts[s] = null; // Free the slot immediately
				break;
			}
		}

		// Close all pages first (graceful shutdown), with a per-page timeout
		const pages = actualContext.pages();
		await Promise.all(pages.map(p =>
			Promise.race([
				p.close(),
				new Promise(resolve => setTimeout(resolve, 2000)),
			]).catch(() => {})
		));

		// Close the context with a 5-second timeout to prevent hanging
		try {
			await Promise.race([
				actualContext.close(),
				new Promise((_, reject) => setTimeout(() => reject(new Error('close timeout')), 5000)),
			]);
			logger.info('✓ Browser closed gracefully');
		} catch (error) {
			if (error.message === 'close timeout') {
				logger.warn('Browser close timed out, forcing shutdown');
			} else {
				logger.warn(`Browser close error (non-fatal): ${error.message}`);
			}
		}

		// Fix Chrome preferences in the background — do not block the caller
		if (closedSlot !== null) {
			this.fixChromePreferences(closedSlot).catch(() => {});
		}
	}

	/**
	 * Emergency cleanup - force close all slots
	 * Used when Ctrl+C is pressed or process is terminating
	 * @returns {Promise<void>}
	 */
	async forceClose() {
		try {
			let anyOpen = false;
			for (let s = 0; s < this.maxSlots; s++) {
				const ctx = this.contexts[s];
				if (ctx) {
					anyOpen = true;
					break;
				}
			}
			if (!anyOpen) return;

			logger.info('Force closing browser(s)...');

			for (let s = 0; s < this.maxSlots; s++) {
				const ctx = this.contexts[s];
				if (!ctx) continue;
				this.contexts[s] = null; // Free slot immediately
				try {
					const pages = ctx.pages();
					await Promise.all(pages.map(p => p.close().catch(() => {})));
					await Promise.race([
						ctx.close(),
						new Promise(resolve => setTimeout(resolve, 3000)),
					]);
				} catch {
					// Ignore errors during force close
				}
				this.fixChromePreferences(s).catch(() => {});
			}

			logger.info('✓ Browser(s) force closed');
		} catch (error) {
			// Silent fail on force close
		}
	}

	/**
	 * Get first active browser context (for backward compatibility)
	 * @returns {BrowserContext|null}
	 */
	getBrowser() {
		for (let s = 0; s < this.maxSlots; s++) {
			if (this.contexts[s]) return this.contexts[s];
		}
		return null;
	}
}

module.exports = new BrowserService();
