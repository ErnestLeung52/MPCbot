require('dotenv').config();

const config = {
  // Google Sheets Configuration
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    sheetName: process.env.GOOGLE_SHEET_NAME || 'Sheet1',
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json'
  },

  // Target Website
  targetUrl: process.env.TARGET_URL,

  // Browser Settings
  browser: {
    headless: process.env.HEADLESS === 'true',
    viewport: {
      width: 1920,
      height: 1080
    },
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ],
    viewportSizes: [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1440, height: 900 }
    ]
  },

  // Automation Settings
  automation: {
    minDelay: parseInt(process.env.MIN_DELAY) || 500,
    maxDelay: parseInt(process.env.MAX_DELAY) || 2000,
    typingSpeedMin: parseInt(process.env.TYPING_SPEED_MIN) || 50,
    typingSpeedMax: parseInt(process.env.TYPING_SPEED_MAX) || 150,
    typoChance: 0.05, // 5% chance of typo
    submitDelay: { min: 2000, max: 4000 } // Longer delay before submit
  },

  // Error Handling
  errorHandling: {
    stopOnError: process.env.STOP_ON_ERROR === 'true',
    screenshotOnError: process.env.SCREENSHOT_ON_ERROR === 'true',
    screenshotDir: './screenshots'
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: './logs'
  },

  // Form Field Selectors (customize based on target website)
  formSelectors: {
    // Example selectors - replace with actual selectors from target website
    // Format: fieldName: 'css-selector'
    // These should be customized per project
  },

  // Iframe Selectors for data extraction
  iframeSelectors: {
    // Example selectors - replace with actual selectors
    // iframe: 'iframe[id="result-frame"]',
    // dataElement: '.result-data'
  }
};

// Validation
function validateConfig() {
  const errors = [];

  if (!config.googleSheets.spreadsheetId) {
    errors.push('GOOGLE_SHEETS_ID is required in .env file');
  }

  if (!config.targetUrl) {
    errors.push('TARGET_URL is required in .env file');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
}

validateConfig();

module.exports = config;
