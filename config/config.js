require('dotenv').config();
const sheetMapping = require('./sheetMapping');

const config = {
  // Google Sheets Configuration
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    sheetName: sheetMapping.SHEET_NAME,
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json'
  },

  // Target Website - Base URL for redeem page
  // The redeem code will be appended to this URL: targetUrl + redeemCode
  targetUrl: 'https://www.myprepaidcenter.com/redeem?ecode=',

  // Browser Settings
  browser: {
    // IMPORTANT: Set to false for production scraping
    // Modern detection can spot headless browsers instantly
    // Patchright with real Chrome (channel: 'chrome') handles all stealth automatically
    // Reference: https://roundproxies.com/blog/patchright/
    headless: process.env.HEADLESS === 'true',
  },

  // Automation Settings
  automation: {
    minDelay: parseInt(process.env.MIN_DELAY) || 500,
    maxDelay: parseInt(process.env.MAX_DELAY) || 2000,
    typingSpeedMin: parseInt(process.env.TYPING_SPEED_MIN) || 50,
    typingSpeedMax: parseInt(process.env.TYPING_SPEED_MAX) || 150,
    typoChance: 0.05, // 5% chance of typo
    submitDelay: { min: 2000, max: 4000 }, // Longer delay before submit
    addressVerification: 'entered' // 'entered' or 'suggested' - which address to use if verification modal appears
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
  }
};

// Validation
function validateConfig() {
  const errors = [];

  if (!config.googleSheets.spreadsheetId) {
    errors.push('GOOGLE_SHEETS_ID is required in .env file');
  }

  if (!config.targetUrl) {
    errors.push('targetUrl is required in config.js');
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
