const config = require('../config/config');
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
      
      // IMPORTANT: Customize this section based on your target website
      // This is a basic example - you need to configure:
      // 1. Field mapping (which columns map to which form fields)
      // 2. Submit button selector
      // 3. Any custom form logic
      
      const fieldMapping = config.formSelectors || {};
      const submitSelector = '#submit-button'; // CUSTOMIZE THIS
      
      // Check if field mapping is configured
      if (Object.keys(fieldMapping).length === 0) {
        logger.warn('No form field mapping configured in config.js');
        logger.warn('Please configure config.formSelectors with your field mappings');
        logger.warn('Example: { "FirstName": "#first-name-input", "Email": "#email-input" }');
      }

      await formFiller.fillAndSubmit(page, {
        rowData,
        headers,
        fieldMapping,
        submitSelector,
        url: config.targetUrl
      });

      // Extract data from iframe
      logger.info('Extracting data from iframe...');
      
      // IMPORTANT: Customize this section based on your target website
      // Configure the iframe extraction settings
      const extractionConfig = config.iframeSelectors || {
        iframeIndex: 1, // Default to first iframe (after main frame)
        fields: {
          // Example: 'ResultData': '#result-element'
          // Customize based on your needs
        }
      };

      // Check if iframe selectors are configured
      if (!extractionConfig.fields || Object.keys(extractionConfig.fields).length === 0) {
        logger.warn('No iframe extraction fields configured in config.js');
        logger.warn('Please configure config.iframeSelectors with your extraction fields');
        logger.warn('Example: { iframeSelector: "#result-iframe", fields: { "Result": "#result-text" } }');
      }

      const extractedData = await iframeExtractor.extract(page, extractionConfig);

      // Update Google Sheet with results
      logger.info('Updating Google Sheet...');
      
      // Prepare update data
      const updateData = {
        Status: 'Success',
        Timestamp: new Date().toISOString(),
        ...extractedData
      };

      await googleSheets.updateRow(rowIndex, updateData);

      // Calculate duration
      const duration = Date.now() - startTime;
      logger.logTaskComplete(taskNumber, totalRows, duration);

      // Close browser
      await browserService.close(browser);

      this.completedTasks++;

      return {
        success: true,
        duration,
        extractedData
      };
    } catch (error) {
      // Handle error
      await errorHandler.handleError(error, page, taskNumber);

      // Try to update sheet with error status
      try {
        await googleSheets.updateRow(rowIndex, {
          Status: 'Failed',
          Error: error.message,
          Timestamp: new Date().toISOString()
        });
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

      this.totalTasks = rows.length;
      logger.info(`Found ${this.totalTasks} task(s) to process`);

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const rowData = rows[i];
        
        // Skip empty rows
        if (!rowData || rowData.every(cell => !cell)) {
          logger.info(`Skipping empty row ${i + 2}`);
          continue;
        }

        try {
          await this.processTask(rowData, headers, i, this.totalTasks);
        } catch (error) {
          // Error already handled in processTask
          // Stop execution if configured
          if (config.errorHandling.stopOnError) {
            logger.error('Stopping execution due to error');
            break;
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
