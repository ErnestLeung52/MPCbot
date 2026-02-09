const config = require('../config/config');
const sheetMapping = require('../config/sheetMapping');
const logger = require('./utils/logger');
const errorHandler = require('./utils/errorHandler');
const googleSheets = require('./services/googleSheets');
const proxyManager = require('./services/proxyManager');
const browserService = require('./services/browser');
const formFiller = require('./automation/formFiller');
const iframeExtractor = require('./automation/iframeExtractor');

class MPCBot {
  constructor() {
    this.totalTasks = 0;
    this.completedTasks = 0;
    this.failedTasks = 0;
    this.startTime = null;
  }

  /**
   * Initialize the application
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      logger.info('='.repeat(60));
      logger.info('MPCBot - Undetectable Chrome Automation');
      logger.info('='.repeat(60));

      // Initialize Google Sheets
      logger.info('Initializing Google Sheets service...');
      await googleSheets.initialize();

      // Load proxies
      logger.info('Loading proxy configuration...');
      proxyManager.loadProxies();

      logger.info('Initialization complete');
      logger.info('='.repeat(60));
    } catch (error) {
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
      skippedMissingData: 0
    };
    
    // Find column indices using the mappings
    const redeemCodeIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.redeemCode);
    const statusIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.status);
    const emailIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.email);
    const firstNameIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.firstName);
    const lastNameIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.lastName);
    
    // Validate that required columns exist
    if (redeemCodeIndex === -1) {
      logger.error(`Column "${sheetMapping.COLUMN_MAPPINGS.redeemCode}" not found in sheet`);
      return validTasks;
    }
    
    if (statusIndex === -1) {
      logger.error(`Column "${sheetMapping.COLUMN_MAPPINGS.status}" not found in sheet`);
      return validTasks;
    }
    
    if (emailIndex === -1) {
      logger.error(`Column "${sheetMapping.COLUMN_MAPPINGS.email}" not found in sheet`);
      return validTasks;
    }
    
    logger.info('Scanning rows for valid tasks...');
    logger.debug('Task Validation Rules:');
    logger.debug('  - RedeemCode must be exactly 12 characters');
    logger.debug('  - Status must be empty (not processed yet)');
    logger.debug('  - Required fields: Email, FirstName, LastName');
    logger.debug('');
    
    // Iterate through all rows from top to bottom
    for (let i = 0; i < rows.length; i++) {
      const rowData = rows[i];
      const sheetRowNumber = i + 2; // +2 because row 1 is header, array is 0-indexed
      
      // Rule 1: Skip completely empty rows
      if (!rowData || rowData.every(cell => !cell)) {
        logger.debug(`Row ${sheetRowNumber}: Skipping - Empty row`);
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
        logger.debug(`Row ${sheetRowNumber}: Skipping - No redeem code`);
        stats.skippedNoCode++;
        continue;
      }
      
      // Rule 3: RedeemCode exists but is not 12 characters → Skip (invalid code)
      if (redeemCode && redeemCode.length !== 12) {
        logger.debug(`Row ${sheetRowNumber}: Skipping - Invalid redeem code length (${redeemCode.length} chars, expected 12)`);
        stats.skippedInvalidCode++;
        continue;
      }
      
      // Rule 4: RedeemCode is 12 chars but Status is NOT empty → Skip (already processed/in progress/failed)
      if (redeemCode && redeemCode.length === 12 && status) {
        logger.debug(`Row ${sheetRowNumber} (${email || 'no email'}): Skipping - Already processed (Status: "${status}")`);
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
      logger.info(`Row ${sheetRowNumber} (${email}): ✓ Valid task found - RedeemCode: ${redeemCode}`);
      validTasks.push({
        rowIndex: i,                    // 0-based index for array access
        sheetRowNumber: sheetRowNumber, // Actual row number in sheet (for logging)
        rowData: rowData,
        email: email,
        redeemCode: redeemCode
      });
      stats.valid++;
    }
    
    // Log filtering summary
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('Task Filtering Summary:');
    logger.info('-'.repeat(60));
    logger.info(`  Total rows in sheet: ${stats.total}`);
    logger.info(`  Valid tasks to process: ${stats.valid}`);
    
    if (stats.skippedEmpty > 0) {
      logger.info(`  Skipped - Empty rows: ${stats.skippedEmpty}`);
    }
    if (stats.skippedNoCode > 0) {
      logger.info(`  Skipped - No redeem code: ${stats.skippedNoCode}`);
    }
    if (stats.skippedInvalidCode > 0) {
      logger.info(`  Skipped - Invalid code length: ${stats.skippedInvalidCode}`);
    }
    if (stats.skippedAlreadyProcessed > 0) {
      logger.info(`  Skipped - Already processed: ${stats.skippedAlreadyProcessed}`);
    }
    if (stats.skippedMissingData > 0) {
      logger.info(`  Skipped - Missing required data: ${stats.skippedMissingData}`);
    }
    logger.info('='.repeat(60));
    logger.info('');
    
    return validTasks;
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
      logger.info('');
      logger.info('-'.repeat(60));
      logger.logTaskStart(taskNumber, totalRows);
      logger.info('-'.repeat(60));

      // Update status to "In Progress" at the start
      logger.info('Marking task as In Progress...');
      try {
        await googleSheets.updateRow(rowIndex, sheetMapping.buildUpdateData({
          status: 'In Progress'
        }));
      } catch (statusError) {
        logger.warn(`Could not update status to In Progress: ${statusError.message}`);
      }

      // Get next proxy
      const proxy = proxyManager.getNext();
      if (proxy) {
        logger.info('Using proxy for this task');
      } else {
        logger.info('No proxy configured - running without proxy');
      }

      // Launch browser with proxy
      logger.info('Launching browser...');
      browser = await browserService.launch(proxy);
      page = await browserService.createPage(browser);

      // Fill form with data
      logger.info('Filling form...');
      
      // Extract row data using sheet mappings
      const extractedData = sheetMapping.extractRowData(rowData, headers);
      
      // Sanitize data before form submission
      logger.debug('Sanitizing row data...');
      const sanitizedData = sheetMapping.sanitizeRowData(extractedData);
      
      // Build form data with transformations (e.g., state conversion)
      const formData = sheetMapping.buildFormData(sanitizedData);
      
      // Get form selectors from mapping
      const formSelectors = sheetMapping.FORM_SELECTORS;
      const submitSelector = formSelectors.submitButton;
      
      logger.debug('Form data prepared:', JSON.stringify(formData, null, 2));

      await formFiller.fillAndSubmit(page, {
        formData,
        formSelectors,
        submitSelector,
        url: config.targetUrl
      });

      // Extract card data from webpage
      logger.info('Extracting card data from webpage...');
      
      // Configure extraction for the 4 required fields: Amount, CardNumber, Exp, CVV
      const extractionConfig = config.iframeSelectors || {
        iframeIndex: 1, // Default to first iframe (after main frame)
        fields: {
          // TODO: Update these selectors based on your actual webpage structure
          amount: '#card-amount',        // Selector for card amount
          cardNumber: '#card-number',    // Selector for card number
          exp: '#card-exp',              // Selector for expiration date
          cvv: '#card-cvv'               // Selector for CVV
        }
      };

      // Check if iframe selectors are configured
      if (!extractionConfig.fields || Object.keys(extractionConfig.fields).length === 0) {
        logger.warn('No iframe/page extraction fields configured in config.js');
        logger.warn('Please configure config.iframeSelectors with card data extraction fields');
        logger.warn('Required fields: amount, cardNumber, exp, cvv');
      }

      const cardData = await iframeExtractor.extract(page, extractionConfig);

      // Update Google Sheet with results
      logger.info('Updating Google Sheet...');
      
      // Prepare update data with card information
      const updateData = sheetMapping.buildUpdateData({
        status: 'Success',
        extractedData: cardData  // Contains: amount, cardNumber, exp, cvv
      });

      await googleSheets.updateRow(rowIndex, updateData);
      
      logger.info('Card data extracted and saved:');
      if (cardData.amount) logger.info(`  Amount: ${cardData.amount}`);
      if (cardData.cardNumber) logger.info(`  Card Number: ${cardData.cardNumber}`);
      if (cardData.exp) logger.info(`  Expiration: ${cardData.exp}`);
      if (cardData.cvv) logger.info(`  CVV: ${cardData.cvv}`);

      // Calculate duration
      const duration = Date.now() - startTime;
      logger.logTaskComplete(taskNumber, totalRows, duration);

      // Close browser
      await browserService.close(browser);

      this.completedTasks++;

      return {
        success: true,
        duration,
        cardData
      };
    } catch (error) {
      // Handle error
      await errorHandler.handleError(error, page, taskNumber);

      // Try to update sheet with error status
      try {
        const errorUpdateData = sheetMapping.buildUpdateData({
          status: 'Failed',
          error: error.message
        });
        await googleSheets.updateRow(rowIndex, errorUpdateData);
      } catch (updateError) {
        logger.error(`Failed to update error status in sheet: ${updateError.message}`);
      }

      // Close browser if still open
      if (browser) {
        await browserService.close(browser);
      }

      this.failedTasks++;

      // Re-throw error to stop execution (if configured)
      throw error;
    }
  }

  /**
   * Run the automation for all rows
   * @returns {Promise<void>}
   */
  async run() {
    try {
      this.startTime = Date.now();

      // Fetch all rows from sheet
      logger.info('Fetching data from Google Sheets...');
      const rows = await googleSheets.fetchRows();
      const headers = await googleSheets.getHeaders();

      if (rows.length === 0) {
        logger.warn('No data rows found in sheet');
        return;
      }

      logger.info(`Found ${rows.length} total row(s) in sheet`);
      logger.info('');

      // Filter valid tasks based on Status and RedeemCode criteria
      const validTasks = this.filterValidTasks(rows, headers);

      if (validTasks.length === 0) {
        logger.warn('No valid tasks to process');
        logger.warn('Possible reasons:');
        logger.warn('  - All rows are missing redeem codes');
        logger.warn('  - All rows have already been processed (Status is not empty)');
        logger.warn('  - Redeem codes are not exactly 12 characters');
        logger.warn('  - Required fields (Email, Name) are missing');
        return;
      }

      this.totalTasks = validTasks.length;
      logger.info(`Starting processing of ${this.totalTasks} valid task(s)...`);
      logger.info('');

      // Process each valid task
      for (let taskNum = 0; taskNum < validTasks.length; taskNum++) {
        const task = validTasks[taskNum];
        
        logger.info('='.repeat(60));
        logger.info(`TASK ${taskNum + 1}/${this.totalTasks}`);
        logger.info('-'.repeat(60));
        logger.info(`  Sheet Row: ${task.sheetRowNumber}`);
        logger.info(`  Email: ${task.email}`);
        logger.info(`  Redeem Code: ${task.redeemCode}`);
        logger.info('='.repeat(60));

        try {
          await this.processTask(
            task.rowData,
            headers,
            task.rowIndex,  // Use the actual row index for updating sheet
            this.totalTasks
          );
        } catch (error) {
          // Error already handled in processTask
          // Stop execution if configured
          if (config.errorHandling.stopOnError) {
            logger.error('Stopping execution due to error (STOP_ON_ERROR=true)');
            break;
          } else {
            logger.warn('Continuing to next task (STOP_ON_ERROR=false)');
          }
        }
      }

      // Print summary
      this.printSummary();
    } catch (error) {
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

    logger.info('');
    logger.info('='.repeat(60));
    logger.info('EXECUTION SUMMARY');
    logger.info('='.repeat(60));
    logger.info(`Total tasks: ${this.totalTasks}`);
    logger.info(`Completed: ${this.completedTasks}`);
    logger.info(`Failed: ${this.failedTasks}`);
    logger.info(`Duration: ${minutes}m ${seconds}s`);
    logger.info('='.repeat(60));
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
    logger.error(`Application failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

// Run the application
if (require.main === module) {
  main();
}

module.exports = MPCBot;
