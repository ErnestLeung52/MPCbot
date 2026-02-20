// Suppress punycode deprecation warning from googleapis
process.removeAllListeners('warning');
process.on('warning', (warning) => {
	if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
		return; // Ignore punycode deprecation warnings
	}
	console.warn(warning.name, warning.message);
});

const readline = require('readline');
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

/**
 * Ask user to paste proxies into the terminal (one per line, IP:PORT:USER:PASS).
 * Reads until the user submits an empty line.
 * Saves valid proxies to proxies.json and returns the count.
 * @returns {Promise<number>} - Number of proxies saved
 */
function askProxies() {
	return new Promise((resolve) => {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

		display.showQuestion('Proxy Setup', 'Format: IP:PORT:USER:PASS (one per line, empty line to finish)');

		const lines = [];

		const prompt = () =>
			rl.question('', (line) => {
				const trimmed = line.trim();
				if (trimmed === '') {
					rl.close();
					const raw = lines.join('\n');
					if (!raw.trim()) {
						display.showQuestionResult('Proxies', 'None (using direct IP)');
						proxyManager.saveProxiesFromText('');
						resolve(0);
					} else {
						const count = proxyManager.saveProxiesFromText(raw);
						display.showQuestionResult('Proxies', `${count} loaded`);
						resolve(count);
					}
				} else {
					lines.push(trimmed);
					prompt();
				}
			});

		prompt();
	});
}

/**
 * Ask user how many concurrent tasks (1, 2, or 3). Used before run().
 * @returns {Promise<number>}
 */
function askConcurrency() {
	return new Promise((resolve) => {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

		display.showQuestion('Concurrency', 'How many tasks to run in parallel? (1-3)');

		rl.question('', (answer) => {
			rl.close();
			const raw = (answer || '1').trim();
			const n = parseInt(raw, 10);
			const value = Number.isNaN(n) || n < 1 || n > 3 ? 1 : Math.min(3, n);
			display.showQuestionResult('Concurrency', `${value} task(s)`);
			resolve(value);
		});
	});
}

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
		/** Number of concurrent browser slots (1, 2, or 3) */
		this.concurrency = 1;
		/** Set by workers when max consecutive failures or stopOnError is triggered */
		this.shouldStop = false;
	}

	/**
	 * Initialize the application
	 * @returns {Promise<void>}
	 */
	async initialize() {
		try {
			// Clear proxies from the previous run before starting fresh
			proxyManager.clearProxies();

			// Show banner
			display.showBanner();

			// Initialize Google Sheets
			const sheetsSpinner = display.createSpinner('Connecting to Google Sheets...');
			await googleSheets.initialize();
			const sheetName = config.googleSheets.sheetName || 'Sheet';
			sheetsSpinner.succeed(`Google Sheets connected: ${chalk.green.bold(sheetName)}`);
			logger.info(`✓ Connected to Google Sheets: "${sheetName}"`);

			// display.success('Initialization complete');
			sheetsSpinner.succeed('Initialization complete!');
			logger.info('=== INITIALIZATION COMPLETE ===');

			// Ask user to paste proxies, save to proxies.json, then load them
			const proxyCount = await askProxies();
			proxyManager.loadProxies();

			// Initialize proxy scheduler if we have proxies
			if (proxyCount === 0) {
				display.showNoProxyWarning();
				logger.warn('No proxies loaded - using direct IP for all tasks');
				this.proxyScheduler = null;
			} else {
				// Get all proxies for the scheduler
				const proxies = [];
				for (let i = 0; i < proxyCount; i++) {
					proxies.push(proxyManager.getByIndex(i));
				}

				logger.info(`✓ Loaded ${proxyCount} proxy/proxies`);

				// Create scheduler
				const usesPerProxy = config.proxy.usesPerProxy;
				this.proxyScheduler = new ProxyScheduler(proxies, usesPerProxy);

				// Log proxy configuration to file only
				logger.info(
					`Proxy config: ${proxyCount} proxies × ${usesPerProxy} uses = ${this.proxyScheduler.getTotalTasks()} max tasks`,
				);
			}
		} catch (error) {
			display.error(`Initialization Failed: ${error.message}`);
			logger.error(`Initialization Failed: ${error.message}`);
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

		return validTasks;
	}

	/**
	 * Process a single task with timeout wrapper
	 * @param {Array<string>} rowData - Data from sheet row
	 * @param {Array<string>} headers - Column headers
	 * @param {number} rowIndex - Index of the row (0-based)
	 * @param {number} totalRows - Total number of rows
	 * @param {{ proxy?: Object, proxyInfo?: Object, slotIndex?: number }} [allocation] - Pre-allocated proxy and slot (for concurrent runs)
	 * @param {Object} [listrTask] - Listr task object for progress updates
	 * @returns {Promise<Object>} - Result object
	 */
	async processTaskWithTimeout(rowData, headers, rowIndex, totalRows, allocation = null, listrTask = null) {
		const timeout = config.errorHandling.taskTimeout;
		let timeoutId = null;
		const timeoutPromise = new Promise((_, reject) => {
			timeoutId = setTimeout(() => reject(new Error(`Task timeout after ${timeout}ms`)), timeout);
		});
		try {
			return await Promise.race([
				this.processTask(rowData, headers, rowIndex, totalRows, allocation, listrTask),
				timeoutPromise,
			]);
		} finally {
			if (timeoutId != null) clearTimeout(timeoutId);
		}
	}

	/**
	 * Process a single task (row from sheet)
	 * @param {Array<string>} rowData - Data from sheet row
	 * @param {Array<string>} headers - Column headers
	 * @param {number} rowIndex - Index of the row (0-based)
	 * @param {number} totalRows - Total number of rows
	 * @param {{ proxy?: Object, proxyInfo?: Object, slotIndex?: number }} [allocation] - Pre-allocated proxy and slot (for concurrent runs)
	 * @returns {Promise<Object>} - Result object
	 */
	async processTask(rowData, headers, rowIndex, totalRows, allocation = null, listrTask = null) {
		const taskNumber = rowIndex + 1;
		const startTime = Date.now();
		let browser = null;
		let page = null;

		try {
			// Add separator for task in logs
			logger.separator();

			// Update status to "In Progress" at the start (silent)
			try {
				await googleSheets.updateRow(
					rowIndex,
					sheetMapping.buildUpdateData({
						status: 'In Progress',
					}),
				);
			} catch (statusError) {
				logger.warn(`Could not update status to In Progress: ${statusError.message}`);
			}

			// Proxy: use pre-allocated allocation (concurrent) or get next from scheduler (sequential)
			let proxy = null;
			let proxyInfo = null;
			const slotIndex = allocation && allocation.slotIndex !== undefined ? allocation.slotIndex : 0;

			if (allocation && allocation.proxy != null && allocation.proxyInfo != null) {
				proxy = allocation.proxy;
				proxyInfo = allocation.proxyInfo;
			} else if (this.proxyScheduler) {
				const proxyAllocation = this.proxyScheduler.getNext();
				if (!proxyAllocation) {
					throw new Error('No proxy available - all proxies exhausted');
				}
				proxy = proxyAllocation.proxy;
				const { proxyIndex, currentUsage, remaining } = proxyAllocation;
				proxyInfo = {
					index: proxyIndex + 1,
					usage: currentUsage,
					max: config.proxy.usesPerProxy,
					remaining: remaining,
				};
				logger.info(
					`Using Proxy #${proxyInfo.index} (Usage: ${proxyInfo.usage}/${proxyInfo.max}, Remaining: ${proxyInfo.remaining})`,
				);
			}

			// Optional: Completely wipe browser profile before launch (if configured)
			if (config.browser.wipeProfileOnStart) {
				await browserService.wipeBrowserProfile(slotIndex);
			}

			// Launch browser for this slot with proxy; each slot uses its own profile (fresh session)
			if (listrTask) listrTask.output = 'Initializing browser...';
			browser = await browserService.launch(slotIndex, proxy);
			page = await browserService.createPage(browser);

			// Extract row data using sheet mappings
			const extractedData = sheetMapping.extractRowData(rowData, headers);

			// Sanitize the extracted data
			const sanitizedData = dataSanitizer.sanitizeFormData(extractedData);

			const redeemCode = sanitizedData.redeemCode;
			const email = sanitizedData.email;
			const sheetRow = rowIndex + 2; // Convert to actual sheet row number

			if (!redeemCode) {
				throw new Error('No redeem code found in row data');
			}

			// Calculate display task number (current task / max capacity)
			const maxCapacity = this.proxyScheduler ? this.proxyScheduler.getTotalTasks() : this.totalTasks;
			const currentTaskNum = this.completedTasks + this.failedTasks + 1;

			// Log task start to file
			logger.logTaskStart(currentTaskNum, maxCapacity, sheetRow, email, redeemCode);

			// Update listr progress
			if (listrTask) listrTask.output = `Redeem code: ${redeemCode}`;

			// Step 1: Navigate with redeem code and validate
			if (listrTask) listrTask.output = 'Validating redeem code...';
			const validation = await formFiller.navigateWithRedeemCode(page, config.targetUrl, redeemCode);

			// Check if redeem code is valid
			if (!validation.success) {
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

			// Update progress
			if (listrTask) listrTask.output = 'Autofilling form...';

			// Step 2: Fill and submit registration form
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
				addressVerificationChoice: config.automation.addressVerification,
			};

			// Validate required fields before filling
			const requiredFields = [
				'firstName',
				'lastName',
				'streetAddress',
				'city',
				'state',
				'zipCode',
				'phoneNumber',
				'emailAddress',
			];
			const missingFields = requiredFields.filter((field) => !formData[field]);

			if (missingFields.length > 0) {
				throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
			}

			// Step 3: Fill form and extract card data — pass a step callback so Listr2 shows live progress
			if (listrTask) listrTask.output = 'Starting form...';
			const onStep = listrTask
				? (msg) => {
						listrTask.output = msg;
					}
				: null;
			const cardData = await formFiller.fillRegistrationForm(page, formData, onStep);

			// Check if card data was extracted
			if (!cardData) {
				throw new Error('Card activation failed - no card data received');
			}

			// Detect modal and extract card
			if (listrTask) listrTask.output = 'Modal detected - extracting card data...';

			// Update progress: Saving to sheet
			if (listrTask) listrTask.output = 'Updating Google Sheet...';

			// Update Google Sheet with results
			const updateData = sheetMapping.buildUpdateData({
				status: 'Success',
				extractedData: cardData, // Contains: cardNumber, exp, cvv
			});

			await googleSheets.updateRow(rowIndex, updateData);

			// Update the task title so the final state persists in the Listr2 display after completion
			// Clear output so no intermediate step message lingers beneath the title
			if (listrTask) {
				listrTask.title = chalk.gray(
					`${chalk.cyan(`Task #${sheetRow}`)} ${chalk.dim('|')} ${chalk.white(email)} ${chalk.dim('·')} ${chalk.green(cardData.cardNumber)} ${chalk.dim('·')} ${chalk.gray(cardData.exp)} ${chalk.dim('·')} ${chalk.gray(cardData.cvv)}`,
				);
				listrTask.output = '';
			}

			// Log success to file
			logger.logTaskSuccess(redeemCode, email, sheetRow, cardData.cardNumber);
			logger.info(`Card details: ${cardData.cardNumber} | Exp: ${cardData.exp} | CVV: ${cardData.cvv}`);

			// Record proxy usage on successful task completion
			if (proxy && proxy.server) {
				proxyManager.incrementUsed(proxy.server);
			}

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

			const duration = Date.now() - startTime;
			return {
				success: true,
				duration,
				cardData,
				redeemCode,
			};
		} catch (error) {
			// Handle error
			await errorHandler.handleError(error, page, taskNumber);

			// Get row data for error display
			const extractedData = sheetMapping.extractRowData(rowData, headers);
			const sanitizedData = dataSanitizer.sanitizeFormData(extractedData);
			const redeemCode = sanitizedData.redeemCode || 'N/A';
			const email = sanitizedData.email || 'N/A';
			const sheetRow = rowIndex + 2;

			// Update the task title so the failure state persists in the Listr2 display
			// Keep the error in the title itself so it's visible after completion
			if (listrTask) {
				listrTask.title = `Row ${sheetRow} | ${email} | Failed: ${error.message}`;
				listrTask.output = '';
			}

			// Log failure to file
			logger.logTaskFailure(redeemCode, email, sheetRow, error.message);

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
				redeemCode: redeemCode,
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
			this.shouldStop = false;

			// Ask concurrency (1, 2, or 3) and configure browser slots
			this.concurrency = await askConcurrency();
			browserService.setConcurrency(this.concurrency);

			// Get maximum tasks we can run based on proxy availability
			const maxTasks = this.proxyScheduler ? this.proxyScheduler.getTotalTasks() : Infinity;

			// Fetch all rows from sheet
			const rows = await googleSheets.fetchRows();
			const headers = await googleSheets.getHeaders();

			if (rows.length === 0) {
				display.warn('No data rows found in sheet');
				return;
			}

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

			// Limit tasks to proxy capacity and build work items with pre-allocated proxies.
			// Round-robin order: task 0 → proxy 0, task 1 → proxy 1, ... task 4 → proxy 4, task 5 → proxy 0 (reuse), ...
			// So with 5 proxies and 3 concurrent: first batch uses proxies 0,1,2; second batch uses 3,4,0 (2 new + 1 reused).
			const tasksToProcess = validTasks.slice(0, maxTasks);
			this.totalTasks = tasksToProcess.length;

			const workItems = [];
			for (const task of tasksToProcess) {
				if (this.proxyScheduler && !this.proxyScheduler.hasMore()) break;
				const alloc = this.proxyScheduler ? this.proxyScheduler.getNext() : null;
				if (this.proxyScheduler && !alloc) break;
				const proxyInfo = alloc
					? {
							index: alloc.proxyIndex + 1,
							usage: alloc.currentUsage,
							max: config.proxy.usesPerProxy,
							remaining: alloc.remaining,
						}
					: null;
				workItems.push({
					task,
					proxy: alloc ? alloc.proxy : null,
					proxyInfo,
				});
			}

			// If we had to limit by proxy, update totalTasks to actual work item count
			this.totalTasks = workItems.length;
			if (workItems.length === 0) {
				display.warn('No tasks to run (no proxies available or no valid tasks).');
				return;
			}

			const maxTasksForDisplay = this.proxyScheduler ? this.proxyScheduler.getTotalTasks() : this.totalTasks;
			if (this.proxyScheduler) {
				logger.info(
					`Starting batch: ${this.totalTasks} tasks | Concurrency: ${this.concurrency} | Max capacity: ${maxTasksForDisplay}`,
				);
			} else {
				logger.info(
					`Starting batch: ${this.totalTasks} tasks | Concurrency: ${this.concurrency} | No proxy limit`,
				);
			}

			display.showTaskStartInfo(this.totalTasks, workItems[0].task.sheetRowNumber);

			// Process in batches: open 3 browsers, run 3 tasks, wait for ALL to finish, then next batch.
			// Listr2 is used only for display (progress); we use bot (not this) in listr task so context is correct for every batch.
			const concurrency = Math.min(this.concurrency, workItems.length);
			const STAGGER_MS_MIN = 1000;
			const STAGGER_MS_MAX = 2000;
			const bot = this;

			for (let batchStart = 0; batchStart < workItems.length; batchStart += concurrency) {
				if (bot.shouldStop) break;

				const batch = workItems.slice(batchStart, batchStart + concurrency);
				const batchNumber = Math.floor(batchStart / concurrency) + 1;
				const totalBatches = Math.ceil(workItems.length / concurrency);
				logger.info(
					`Starting batch ${batchNumber}: tasks ${batchStart + 1}-${batchStart + batch.length} (rows: ${batch.map((b) => b.task.sheetRowNumber).join(', ')})`,
				);

				// Print batch separator BEFORE creating listr tasks
				if (batchNumber > 1) {
					console.log(''); // Add spacing between batches
				}
				console.log(chalk.dim(`  Batch ${batchNumber}/${totalBatches} `) + chalk.gray('─'.repeat(38)));

				const ctx = { results: new Array(batch.length) };
				const listrTasks = batch.map((workItem, batchIndex) => {
					// Build title with proxy info
					let title = `Row ${workItem.task.sheetRowNumber} | ${workItem.task.email}`;
					if (workItem.proxyInfo) {
						title += ` | Proxy #${workItem.proxyInfo.index}`;
					} else {
						title += ` | Direct IP`;
					}

					return {
						title: title,
						task: async (ctx, listrTask) => {
							if (batchIndex > 0) {
								const staggerMs =
									batchIndex * (STAGGER_MS_MIN + Math.random() * (STAGGER_MS_MAX - STAGGER_MS_MIN));
								await new Promise((r) => setTimeout(r, Math.round(staggerMs)));
							}

							const allocation = {
								proxy: workItem.proxy,
								proxyInfo: workItem.proxyInfo,
								slotIndex: batchIndex,
							};

							try {
								const result = await bot.processTaskWithTimeout(
									workItem.task.rowData,
									headers,
									workItem.task.rowIndex,
									bot.totalTasks,
									allocation,
									listrTask,
								);
								ctx.results[batchIndex] = { result, workItem, error: null };
							} catch (error) {
								ctx.results[batchIndex] = { result: null, workItem, error };
							}
						},
					};
				});

				const taskRunner = display.createTaskRunner(listrTasks, batch.length);
				await taskRunner.run(ctx);

				// Give Listr2's renderer a tick to fully flush its final output to the terminal
				await new Promise((r) => setTimeout(r, 100));

				// Process results for error handling
				for (let i = 0; i < batch.length; i++) {
					const item = ctx.results[i];
					if (!item) continue;
					const { result, workItem, error } = item;

					// processTask already updates completed/failed counters for handled outcomes.
					// We only handle truly unhandled errors here (timeout/unexpected throw before processTask return).
					if (error) {
						display.error(`Task failed with unhandled error: ${error.message}`);
						logger.error(`Task failed with unhandled error: ${error.message}`);
						try {
							const skipUpdateData = sheetMapping.buildUpdateData({
								status: 'Skipped',
								error: error.message,
							});
							await googleSheets.updateRow(workItem.task.rowIndex, skipUpdateData);
						} catch (updateError) {
							logger.error(`Failed to update skipped status: ${updateError.message}`);
						}
						try {
							await browserService.forceClose();
						} catch (closeError) {
							// Silent
						}
						bot.skippedTasks++;
						bot.failedTasks++;
						bot.consecutiveFailures++;
					}

					if (config.errorHandling.stopOnError && (error || (result && !result.success))) {
						bot.shouldStop = true;
						display.error('Stopping execution due to error (STOP_ON_ERROR=true)');
						logger.error('Stopping execution due to error (STOP_ON_ERROR=true)');
					} else if (error || (result && !result.success)) {
						display.warn(`Skipping to next batch (consecutive failures: ${bot.consecutiveFailures})`);
					}

					if (bot.consecutiveFailures >= config.errorHandling.maxConsecutiveFailures) {
						bot.shouldStop = true;
						display.showMaxFailuresError(
							bot.consecutiveFailures,
							config.errorHandling.maxConsecutiveFailures,
						);
						logger.error(
							`Maximum consecutive failures reached: ${bot.consecutiveFailures}/${config.errorHandling.maxConsecutiveFailures}`,
						);
					}
				}
			}

			// Wait for listr2 to fully flush its output before printing summary
			await new Promise((resolve) => setTimeout(resolve, 200));

			logger.separator();
			logger.info('=== BATCH COMPLETED ===');

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
		const minutes = Math.floor(totalDuration / 60000);
		const seconds = Math.floor((totalDuration % 60000) / 1000);

		// Log summary to file
		logger.info(`Total tasks: ${this.totalTasks}`);
		logger.info(`Completed: ${this.completedTasks}`);
		logger.info(`Failed: ${this.failedTasks}`);
		if (this.skippedTasks > 0) {
			logger.info(`Skipped: ${this.skippedTasks}`);
		}
		logger.info(`Duration: ${minutes}m ${seconds}s`);

		if (this.totalTasks > 0) {
			const successRate = ((this.completedTasks / this.totalTasks) * 100).toFixed(1);
			logger.info(`Success Rate: ${successRate}%`);
		}

		// if (this.proxyScheduler) {
		// 	logger.info(this.proxyScheduler.getUsageSummary());
		// }

		// Display summary on console
		display.showExecutionSummary({
			totalTasks: this.totalTasks,
			completed: this.completedTasks,
			failed: this.failedTasks,
			skipped: this.skippedTasks,
			duration: totalDuration,
			// proxyUsage: this.proxyScheduler ? this.proxyScheduler.getUsageSummary() : null,
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

		// display.info('Goodbye!');

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
