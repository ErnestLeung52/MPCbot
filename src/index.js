// Suppress punycode deprecation warning from googleapis
process.removeAllListeners('warning');
process.on('warning', (warning) => {
	if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
		return; // Ignore punycode deprecation warnings
	}
	console.warn(warning.name, warning.message);
});

const chalk = require('chalk');
const config = require('../config/config');
const sheetMapping = require('../config/sheetMapping');
const logger = require('./utils/logger');
const display = require('./utils/display');
const errorHandler = require('./utils/errorHandler');
const googleSheets = require('./services/googleSheets');
const proxyManager = require('./services/proxyManager');
const ProxyScheduler = require('./services/proxyScheduler');
const browserService = require('./services/browser');
const formFiller = require('./automation/formFiller');
const dataSanitizer = require('./utils/dataSanitizer');

class MPCBot {
	constructor() {
		this.totalTasks = 0;
		this.completedTasks = 0;
		this.failedTasks = 0;
		this.skippedTasks = 0;
		this.consecutiveFailures = 0;
		this.startTime = null;
		this.proxyScheduler = null;
		this.isShuttingDown = false;
	}

	/**
	 * Initialize the application
	 * @returns {Promise<void>}
	 */
	async initialize() {
		try {
			// Show banner
			display.showBanner();
			
			// Initialize Google Sheets
			const sheetsSpinner = display.createSpinner('Initializing Google Sheets...');
			await googleSheets.initialize();
			sheetsSpinner.succeed('Google Sheets connected');

			// Load proxies
			const proxySpinner = display.createSpinner('Loading proxies...');
			proxyManager.loadProxies();
			const proxyCount = proxyManager.getCount();

			// Initialize proxy scheduler if we have proxies
			if (proxyCount === 0) {
				proxySpinner.warn('No proxies loaded');
				display.showNoProxyWarning();
				
				// No proxy scheduler in this case
				this.proxyScheduler = null;
			} else {
				proxySpinner.succeed(`Loaded ${proxyCount} proxies`);
				
				// Get all proxies for the scheduler
				const proxies = [];
				for (let i = 0; i < proxyCount; i++) {
					proxies.push(proxyManager.getByIndex(i));
				}

				// Create scheduler
				const usesPerProxy = config.proxy.usesPerProxy;
				this.proxyScheduler = new ProxyScheduler(proxies, usesPerProxy);

				// Log proxy configuration
				display.showProxyConfig({
					count: proxyCount,
					usesPerProxy: usesPerProxy,
					maxTasks: this.proxyScheduler.getTotalTasks()
				});
			}

			display.newLine();
			display.success('Initialization complete');
		} catch (error) {
			display.error(`Initialization failed: ${error.message}`);
			logger.error(`Initialization failed: ${error.message}`);
			process.exit(1);
		}
	}

	/**
	 * Filter valid tasks based on Status and Redeem Code criteria
	 * @param {Array<Array<string>>} rows - All rows from sheet
	 * @param {Array<string>} headers - Column headers
	 * @returns {Array<Object>} - Array of valid tasks with their row indices
	 */
	filterValidTasks(rows, headers) {
		const validTasks = [];
		const stats = {
			total: rows.length,
			valid: 0,
			skippedEmpty: 0,
			skippedNoCode: 0,
			skippedInvalidCode: 0,
			skippedAlreadyProcessed: 0,
			skippedMissingData: 0,
		};

		// Find column indices using the mappings
		const redeemCodeIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.redeemCode);
		const statusIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.status);
		const emailIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.email);
		const firstNameIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.firstName);
		const lastNameIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.lastName);

		// Validate that required columns exist
		if (redeemCodeIndex === -1) {
			display.error(`Column "${sheetMapping.COLUMN_MAPPINGS.redeemCode}" not found in sheet`);
			logger.error(`Column "${sheetMapping.COLUMN_MAPPINGS.redeemCode}" not found in sheet`);
			return validTasks;
		}

		if (statusIndex === -1) {
			display.error(`Column "${sheetMapping.COLUMN_MAPPINGS.status}" not found in sheet`);
			logger.error(`Column "${sheetMapping.COLUMN_MAPPINGS.status}" not found in sheet`);
			return validTasks;
		}

		if (emailIndex === -1) {
			display.error(`Column "${sheetMapping.COLUMN_MAPPINGS.email}" not found in sheet`);
			logger.error(`Column "${sheetMapping.COLUMN_MAPPINGS.email}" not found in sheet`);
			return validTasks;
		}

		const scanSpinner = display.createSpinner('Scanning rows for valid tasks...');
		scanSpinner.start();

		// Iterate through all rows from top to bottom
		for (let i = 0; i < rows.length; i++) {
			const rowData = rows[i];
			const sheetRowNumber = i + 2; // +2 because row 1 is header, array is 0-indexed

			// Rule 1: Skip completely empty rows
			if (!rowData || rowData.every((cell) => !cell)) {
				stats.skippedEmpty++;
				continue;
			}

			// Get and trim values
			const redeemCode = (rowData[redeemCodeIndex] || '').trim();
			const status = (rowData[statusIndex] || '').trim();
			const email = (rowData[emailIndex] || '').trim();
			const firstName = firstNameIndex !== -1 ? (rowData[firstNameIndex] || '').trim() : '';
			const lastName = lastNameIndex !== -1 ? (rowData[lastNameIndex] || '').trim() : '';

			// Rule 2: Both RedeemCode and Status are empty → Skip (no code to redeem)
			if (!redeemCode && !status) {
				stats.skippedNoCode++;
				continue;
			}

			// Rule 3: RedeemCode exists but is not 12 characters → Skip (invalid code)
			if (redeemCode && redeemCode.length !== 12) {
				stats.skippedInvalidCode++;
				continue;
			}

			// Rule 4: RedeemCode is 12 chars but Status is NOT empty → Skip (already processed/in progress/failed)
			if (redeemCode && redeemCode.length === 12 && status) {
				stats.skippedAlreadyProcessed++;
				continue;
			}

			// Rule 5: Check required fields are present
			if (!email) {
				logger.warn(`Row ${sheetRowNumber}: Skipping - Missing email address`);
				stats.skippedMissingData++;
				continue;
			}

			if (!firstName || !lastName) {
				logger.warn(`Row ${sheetRowNumber} (${email}): Skipping - Missing first name or last name`);
				stats.skippedMissingData++;
				continue;
			}

			// Rule 6: All conditions met → Valid task!
			validTasks.push({
				rowIndex: i, // 0-based index for array access
				sheetRowNumber: sheetRowNumber, // Actual row number in sheet (for logging)
				rowData: rowData,
				email: email,
				redeemCode: redeemCode,
			});
			stats.valid++;
		}

		// Stop scanning spinner and show summary
		scanSpinner.succeed(`Found ${stats.valid} valid tasks`);
		
		// Log filtering summary
		display.showTaskFilteringSummary(stats);
		
		return validTasks;
	}

	/**
	 * Process a single task with timeout wrapper
	 * @param {Array<string>} rowData - Data from sheet row
	 * @param {Array<string>} headers - Column headers
	 * @param {number} rowIndex - Index of the row (0-based)
	 * @param {number} totalRows - Total number of rows
	 * @returns {Promise<Object>} - Result object
	 */
	async processTaskWithTimeout(rowData, headers, rowIndex, totalRows) {
		const timeout = config.errorHandling.taskTimeout;
		
		return Promise.race([
			this.processTask(rowData, headers, rowIndex, totalRows),
			new Promise((_, reject) => 
				setTimeout(() => reject(new Error(`Task timeout after ${timeout}ms`)), timeout)
			)
		]);
	}

	/**
	 * Process a single task (row from sheet)
	 * @param {Array<string>} rowData - Data from sheet row
	 * @param {Array<string>} headers - Column headers
	 * @param {number} rowIndex - Index of the row (0-based)
	 * @param {number} totalRows - Total number of rows
	 * @returns {Promise<Object>} - Result object
	 */
	async processTask(rowData, headers, rowIndex, totalRows) {
		const taskNumber = rowIndex + 1;
		const startTime = Date.now();
		let browser = null;
		let page = null;

		try {
			// Update status to "In Progress" at the start
			const statusSpinner = display.createSpinner('Updating task status...');
			try {
				await googleSheets.updateRow(
					rowIndex,
					sheetMapping.buildUpdateData({
						status: 'In Progress',
					}),
				);
				statusSpinner.succeed('Status updated to In Progress');
			} catch (statusError) {
				statusSpinner.warn(`Could not update status: ${statusError.message}`);
				logger.warn(`Could not update status to In Progress: ${statusError.message}`);
			}

			// Get next proxy from scheduler (if using proxies)
			let proxy = null;
			
			if (this.proxyScheduler) {
				const proxyAllocation = this.proxyScheduler.getNext();
				
				if (!proxyAllocation) {
					throw new Error('No proxy available - all proxies exhausted');
				}

				proxy = proxyAllocation.proxy;
				const { proxyIndex, currentUsage, remaining } = proxyAllocation;

				// Log proxy usage info
				display.showProxyUsage({
					index: proxyIndex,
					current: currentUsage,
					max: config.proxy.usesPerProxy,
					remaining: remaining
				});
			} else {
				// Running without proxies
				display.info('Running without proxy (using direct IP)');
			}

			// Optional: Completely wipe browser profile before launch (if configured)
			if (config.browser.wipeProfileOnStart) {
				await browserService.wipeBrowserProfile();
			}

			// Launch browser with proxy (or without if none available)
			// NOTE: launch() automatically deletes persistent data files before starting
			const browserSpinner = display.createSpinner('Launching browser...');
			browser = await browserService.launch(proxy);
			page = await browserService.createPage(browser);
			browserSpinner.succeed('Browser launched');

			// Extract row data using sheet mappings
			const extractedData = sheetMapping.extractRowData(rowData, headers);
			
			// Sanitize the extracted data
			const sanitizedData = dataSanitizer.sanitizeFormData(extractedData);
			
			const redeemCode = sanitizedData.redeemCode;

			if (!redeemCode) {
				throw new Error('No redeem code found in row data');
			}

			// Step 1: Navigate with redeem code and validate
			const navSpinner = display.createSpinner(`Navigating with redeem code: ${redeemCode}...`);
			const validation = await formFiller.navigateWithRedeemCode(page, config.targetUrl, redeemCode);

			// Step 2: Check if redeem code is valid
			if (!validation.success) {
				navSpinner.fail('Redeem code validation failed');
				display.error(validation.message);
				logger.error(`Redeem code validation failed: ${validation.message}`);

				// Update sheet with invalid code status
				await googleSheets.updateRow(
					rowIndex,
					sheetMapping.buildUpdateData({
						status: 'Invalid Code',
						error: validation.message,
					}),
				);

				throw new Error(`Invalid redeem code: ${validation.message}`);
			}

			navSpinner.succeed('Redeem code validated');

			// Step 2: Fill and submit registration form
			const formSpinner = display.createSpinner('Filling registration form...');
			
			const formData = {
				firstName: sanitizedData.firstName,
				lastName: sanitizedData.lastName,
				streetAddress: sanitizedData.streetAddress,
				apartment: sanitizedData.apartment,
				city: sanitizedData.city,
				state: sanitizedData.state,
				zipCode: sanitizedData.zipCode,
				phoneNumber: sanitizedData.phone,
				emailAddress: sanitizedData.email,
				addressVerificationChoice: config.automation.addressVerification
			};

			// Validate required fields before filling
			const requiredFields = ['firstName', 'lastName', 'streetAddress', 'city', 'state', 'zipCode', 'phoneNumber', 'emailAddress'];
			const missingFields = requiredFields.filter(field => !formData[field]);

			if (missingFields.length > 0) {
				throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
			}

			// Step 3: Fill form and extract card data
			const cardData = await formFiller.fillRegistrationForm(page, formData);

			// Check if card data was extracted
			if (!cardData) {
				formSpinner.fail('Card activation failed');
				throw new Error('Card activation failed - no card data received');
			}
			
			formSpinner.succeed('Form submitted successfully');

			// Update Google Sheet with results
			const updateSpinner = display.createSpinner('Saving results to Google Sheets...');
			const updateData = sheetMapping.buildUpdateData({
				status: 'Success',
				extractedData: cardData, // Contains: cardNumber, exp, cvv
			});

			await googleSheets.updateRow(rowIndex, updateData);
			updateSpinner.succeed('Results saved');

			// Show card data
			display.showCardData(cardData);

			// Calculate duration
			const duration = Date.now() - startTime;
			display.showTaskComplete(taskNumber, totalRows, duration);

			// Close browser (unless keepOpen is enabled for testing)
			// NOTE: Persistent data files will be deleted on next launch
			if (!config.browser.keepOpen) {
				await browserService.close(browser);
			} else {
				display.success('Task completed successfully!');
				display.warn('Browser kept open for testing (KEEP_BROWSER_OPEN=true)');
				display.warn('Bot will NOT continue to next task until you close the browser');
				display.warn('Set KEEP_BROWSER_OPEN=false for continuous operation');
			}

			this.completedTasks++;
			this.consecutiveFailures = 0; // Reset consecutive failure counter on success

			return {
				success: true,
				duration,
				cardData,
			};
		} catch (error) {
			// Handle error
			await errorHandler.handleError(error, page, taskNumber);

			// Try to update sheet with error status
			try {
				const errorUpdateData = sheetMapping.buildUpdateData({
					status: 'Failed',
					error: error.message,
				});
				await googleSheets.updateRow(rowIndex, errorUpdateData);
			} catch (updateError) {
				logger.error(`Failed to update error status in sheet: ${updateError.message}`);
			}

			// Close browser if still open (unless keepOpen is enabled)
			// NOTE: Persistent data files will be deleted on next launch
			if (browser && !config.browser.keepOpen) {
				try {
					await browserService.close(browser);
				} catch (closeError) {
					display.warn(`Failed to close browser: ${closeError.message}`);
					logger.warn(`Failed to close browser: ${closeError.message}`);
					// Try force close
					try {
						await browserService.forceClose();
					} catch (forceError) {
						// Silent fail
					}
				}
			} else if (browser) {
				display.warn('Browser kept open for debugging (KEEP_BROWSER_OPEN=true)');
				display.warn('Bot will NOT continue to next task until you close the browser');
				display.warn('Set KEEP_BROWSER_OPEN=false for continuous operation');
			}

			this.failedTasks++;
			this.consecutiveFailures++;

			// Return error result instead of throwing (unless stopOnError is true)
			return {
				success: false,
				error: error.message,
			};
		}
	}

	/**
	 * Run the automation for all rows
	 * @returns {Promise<void>}
	 */
	async run() {
		try {
			this.startTime = Date.now();

			// Get maximum tasks we can run based on proxy availability
			// If no proxies, process all valid tasks (no limit)
			const maxTasks = this.proxyScheduler ? this.proxyScheduler.getTotalTasks() : Infinity;
			
			if (this.proxyScheduler) {
				display.showWorkflowConfig(this.proxyScheduler.getUsageSummary());
			} else {
				display.newLine();
				display.showHeader('RUNNING WITHOUT PROXIES');
				display.info('  All tasks will use your direct IP address');
				display.info('  No task limit applied');
				console.log(chalk.cyan('═'.repeat(60)));
				display.newLine();
			}

			// Fetch all rows from sheet
			const fetchSpinner = display.createSpinner('Fetching data from Google Sheets...');
			const rows = await googleSheets.fetchRows();
			const headers = await googleSheets.getHeaders();

			if (rows.length === 0) {
				fetchSpinner.warn('No data rows found in sheet');
				return;
			}

			fetchSpinner.succeed(`Found ${rows.length} total row(s) in sheet`);

			// Filter valid tasks based on Status and RedeemCode criteria
			const validTasks = this.filterValidTasks(rows, headers);

			if (validTasks.length === 0) {
				display.warn('No valid tasks to process');
				display.info('Possible reasons:');
				display.info('  - All rows are missing redeem codes');
				display.info('  - All rows have already been processed (Status is not empty)');
				display.info('  - Redeem codes are not exactly 12 characters');
				display.info('  - Required fields (Email, Name) are missing');
				return;
			}

			// Limit tasks to what we can handle with available proxies
			// If no proxies (maxTasks = Infinity), process all valid tasks
			const tasksToProcess = validTasks.slice(0, maxTasks);
			const skippedTasks = validTasks.length - tasksToProcess.length;

			this.totalTasks = tasksToProcess.length;

			if (skippedTasks > 0 && this.proxyScheduler) {
				display.showTaskLimitWarning(validTasks.length, this.totalTasks, skippedTasks, maxTasks);
			}

			display.info(`Starting processing of ${chalk.bold(this.totalTasks)} task(s)...`);
			display.newLine();

			// Process each valid task
			for (let taskNum = 0; taskNum < tasksToProcess.length; taskNum++) {
				const task = tasksToProcess[taskNum];

				// Check if we still have proxies available (only if using proxies)
				if (this.proxyScheduler && !this.proxyScheduler.hasMore()) {
					display.warn('All proxies exhausted. Stopping workflow.');
					logger.warn('All proxies exhausted. Stopping workflow.');
					break;
				}

				// Check if we've hit max consecutive failures
				if (this.consecutiveFailures >= config.errorHandling.maxConsecutiveFailures) {
					display.showMaxFailuresError(this.consecutiveFailures, config.errorHandling.maxConsecutiveFailures);
					logger.error(`Maximum consecutive failures reached: ${this.consecutiveFailures}/${config.errorHandling.maxConsecutiveFailures}`);
					break;
				}

				// Show task header
				display.showTaskHeader(taskNum + 1, this.totalTasks, {
					sheetRowNumber: task.sheetRowNumber,
					email: task.email,
					redeemCode: task.redeemCode
				});

				try {
					// Process task with timeout wrapper
					const result = await this.processTaskWithTimeout(
						task.rowData,
						headers,
						task.rowIndex, // Use the actual row index for updating sheet
						this.totalTasks,
					);

					// Check if task failed
					if (result && !result.success) {
						// Task failed but was handled gracefully
						if (config.errorHandling.stopOnError) {
							display.error('Stopping execution due to error (STOP_ON_ERROR=true)');
							logger.error('Stopping execution due to error (STOP_ON_ERROR=true)');
							break;
						} else {
							display.warn(`Skipping to next task (consecutive failures: ${this.consecutiveFailures})`);
						}
					}
				} catch (error) {
					// Timeout or unhandled error
					display.error(`Task failed with unhandled error: ${error.message}`);
					logger.error(`Task failed with unhandled error: ${error.message}`);
					
					// Try to mark as skipped in sheet
					try {
						const skipUpdateData = sheetMapping.buildUpdateData({
							status: 'Skipped',
							error: error.message,
						});
						await googleSheets.updateRow(task.rowIndex, skipUpdateData);
					} catch (updateError) {
						display.error(`Failed to update skipped status: ${updateError.message}`);
						logger.error(`Failed to update skipped status: ${updateError.message}`);
					}

					// Force close any open browser
					try {
						await browserService.forceClose();
					} catch (closeError) {
						// Silent fail
					}

					this.skippedTasks++;
					this.failedTasks++;
					this.consecutiveFailures++;

					if (config.errorHandling.stopOnError) {
						display.error('Stopping execution due to error (STOP_ON_ERROR=true)');
						logger.error('Stopping execution due to error (STOP_ON_ERROR=true)');
						break;
					} else {
						display.warn(`Skipping to next task (consecutive failures: ${this.consecutiveFailures})`);
					}
				}
			}

			// Print summary
			this.printSummary();
		} catch (error) {
			display.error(`Fatal error: ${error.message}`);
			logger.error(`Fatal error: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Print execution summary
	 * @private
	 */
	printSummary() {
		const totalDuration = Date.now() - this.startTime;

		display.showExecutionSummary({
			totalTasks: this.totalTasks,
			completed: this.completedTasks,
			failed: this.failedTasks,
			skipped: this.skippedTasks,
			duration: totalDuration,
			proxyUsage: this.proxyScheduler ? this.proxyScheduler.getUsageSummary() : null
		});
	}
}

/**
 * Graceful shutdown handler
 * Ensures browser closes properly when Ctrl+C is pressed
 */
async function gracefulShutdown(signal) {
	display.showShutdown(signal);
	
	try {
		// Force close any open browser
		const cleanupSpinner = display.createSpinner('Cleaning up...');
		await browserService.forceClose();
		cleanupSpinner.succeed('Cleanup completed');
		
		display.info('Goodbye!');
		
		process.exit(0);
	} catch (error) {
		display.error(`Error during shutdown: ${error.message}`);
		logger.error(`Error during shutdown: ${error.message}`);
		process.exit(1);
	}
}

/**
 * Main entry point
 */
async function main() {
	const bot = new MPCBot();

	try {
		await bot.initialize();
		await bot.run();

		display.success('Application completed successfully');
		logger.info('Application completed successfully');
		process.exit(0);
	} catch (error) {
		display.error(`Application failed: ${error.message}`);
		logger.error(`Application failed: ${error.message}`);
		process.exit(1);
	}
}

// Handle graceful shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT (Ctrl+C)'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught errors
// Note: These should rarely trigger as all task errors are now caught in processTask
// However, we keep them as a safety net for truly unexpected errors
process.on('unhandledRejection', async (error) => {
	display.newLine();
	console.log(chalk.red('═'.repeat(60)));
	console.log(chalk.red.bold('UNHANDLED PROMISE REJECTION (Safety Net)'));
	console.log(chalk.red('═'.repeat(60)));
	display.error(`Error: ${error.message}`);
	display.error('Stack: ' + error.stack);
	display.newLine();
	display.error('This should not happen during normal task processing.');
	display.error('All task errors should be caught by the task handler.');
	console.log(chalk.red('═'.repeat(60)));
	
	logger.error('UNHANDLED PROMISE REJECTION');
	logger.error(`Error: ${error.message}`);
	logger.error('Stack:', error.stack);
	
	// Try to clean up
	try {
		await browserService.forceClose();
	} catch (e) {
		// Silent fail
	}
	
	// Log and exit after a delay to allow logs to flush
	setTimeout(() => {
		display.error('Exiting due to unhandled rejection...');
		logger.error('Exiting due to unhandled rejection...');
		process.exit(1);
	}, 1000);
});

process.on('uncaughtException', async (error) => {
	display.newLine();
	console.log(chalk.red('═'.repeat(60)));
	console.log(chalk.red.bold('UNCAUGHT EXCEPTION (Safety Net)'));
	console.log(chalk.red('═'.repeat(60)));
	display.error(`Error: ${error.message}`);
	display.error('Stack: ' + error.stack);
	display.newLine();
	display.error('This indicates a serious issue outside normal task flow.');
	console.log(chalk.red('═'.repeat(60)));
	
	logger.error('UNCAUGHT EXCEPTION');
	logger.error(`Error: ${error.message}`);
	logger.error('Stack:', error.stack);
	
	// Try to clean up
	try {
		await browserService.forceClose();
	} catch (e) {
		// Silent fail
	}
	
	// Log and exit after a delay to allow logs to flush
	setTimeout(() => {
		display.error('Exiting due to uncaught exception...');
		logger.error('Exiting due to uncaught exception...');
		process.exit(1);
	}, 1000);
});

// Run the application
if (require.main === module) {
	main();
}

module.exports = MPCBot;
