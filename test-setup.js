/**
 * Setup Validation Script
 * Run this to verify your configuration is correct
 */

require('dotenv').config();
const fs = require('fs');
const config = require('./config/config');

console.log('='.repeat(60));
console.log('MPCBot Setup Validation');
console.log('='.repeat(60));
console.log('');

let hasErrors = false;

// Check 1: Environment file
console.log('1. Checking .env file...');
if (!fs.existsSync('.env')) {
  console.error('   ❌ .env file not found. Copy from .env.example');
  hasErrors = true;
} else {
  console.log('   ✓ .env file exists');
}

// Check 2: Credentials file
console.log('2. Checking Google credentials...');
if (!fs.existsSync(config.googleSheets.credentialsPath)) {
  console.error(`   ❌ Credentials file not found at ${config.googleSheets.credentialsPath}`);
  console.error('      Download from Google Cloud Console');
  hasErrors = true;
} else {
  console.log('   ✓ Credentials file exists');
  
  try {
    const creds = JSON.parse(fs.readFileSync(config.googleSheets.credentialsPath, 'utf8'));
    if (creds.type === 'service_account') {
      console.log(`   ✓ Valid service account: ${creds.client_email}`);
    } else {
      console.error('   ❌ Not a service account credential file');
      hasErrors = true;
    }
  } catch (e) {
    console.error('   ❌ Invalid JSON in credentials file');
    hasErrors = true;
  }
}

// Check 3: Google Sheets configuration
console.log('3. Checking Google Sheets configuration...');
if (!config.googleSheets.spreadsheetId) {
  console.error('   ❌ GOOGLE_SHEETS_ID not set in .env');
  hasErrors = true;
} else {
  console.log(`   ✓ Sheet ID: ${config.googleSheets.spreadsheetId.substring(0, 20)}...`);
}

if (!config.googleSheets.sheetName) {
  console.error('   ❌ GOOGLE_SHEET_NAME not set in .env');
  hasErrors = true;
} else {
  console.log(`   ✓ Sheet Name: ${config.googleSheets.sheetName}`);
}

// Check 4: Target URL
console.log('4. Checking target URL...');
if (!config.targetUrl) {
  console.error('   ❌ TARGET_URL not set in .env');
  hasErrors = true;
} else if (config.targetUrl === 'https://example.com/form') {
  console.warn('   ⚠️  TARGET_URL is still the example value. Update in .env');
} else {
  console.log(`   ✓ Target URL: ${config.targetUrl}`);
}

// Check 5: Proxy configuration
console.log('5. Checking proxy configuration...');
const proxyPath = './config/proxies.json';
if (!fs.existsSync(proxyPath)) {
  console.warn('   ⚠️  Proxies file not found. Will run without proxy.');
  console.warn('      For production use, create config/proxies.json');
} else {
  try {
    const proxies = JSON.parse(fs.readFileSync(proxyPath, 'utf8'));
    if (Array.isArray(proxies) && proxies.length > 0) {
      console.log(`   ✓ ${proxies.length} proxy/proxies configured`);
      
      // Validate first proxy format
      const firstProxy = proxies[0];
      if (firstProxy.server) {
        console.log(`   ✓ First proxy: ${firstProxy.server.replace(/:\/\/.*@/, '://*****:*****@')}`);
      } else {
        console.error('   ❌ First proxy missing "server" field');
        hasErrors = true;
      }
    } else {
      console.warn('   ⚠️  Proxies file is empty');
    }
  } catch (e) {
    console.error('   ❌ Invalid JSON in proxies file');
    hasErrors = true;
  }
}

// Check 6: Form selectors
console.log('6. Checking form configuration...');
if (!config.formSelectors || Object.keys(config.formSelectors).length === 0) {
  console.warn('   ⚠️  No form selectors configured in config/config.js');
  console.warn('      You need to configure formSelectors before running');
} else {
  console.log(`   ✓ ${Object.keys(config.formSelectors).length} form field(s) configured`);
  Object.entries(config.formSelectors).slice(0, 3).forEach(([field, selector]) => {
    console.log(`      - ${field}: ${selector}`);
  });
}

// Check 7: Iframe selectors
console.log('7. Checking iframe extraction configuration...');
if (!config.iframeSelectors || Object.keys(config.iframeSelectors).length === 0) {
  console.warn('   ⚠️  No iframe selectors configured in config/config.js');
  console.warn('      You need to configure iframeSelectors before running');
} else {
  console.log('   ✓ Iframe extraction configured');
  if (config.iframeSelectors.iframeSelector) {
    console.log(`      Method: By selector (${config.iframeSelectors.iframeSelector})`);
  } else if (config.iframeSelectors.iframeIndex !== undefined) {
    console.log(`      Method: By index (${config.iframeSelectors.iframeIndex})`);
  } else if (config.iframeSelectors.iframeUrl) {
    console.log(`      Method: By URL (${config.iframeSelectors.iframeUrl})`);
  }
  
  if (config.iframeSelectors.fields) {
    console.log(`      Fields to extract: ${Object.keys(config.iframeSelectors.fields).length}`);
  }
}

// Check 8: Node modules
console.log('8. Checking dependencies...');
const requiredModules = ['patchright', 'googleapis', 'dotenv', 'winston'];
let missingModules = [];

for (const module of requiredModules) {
  try {
    require.resolve(module);
  } catch (e) {
    missingModules.push(module);
  }
}

if (missingModules.length > 0) {
  console.error(`   ❌ Missing modules: ${missingModules.join(', ')}`);
  console.error('      Run: npm install');
  hasErrors = true;
} else {
  console.log('   ✓ All required dependencies installed');
}

// Check 9: Directories
console.log('9. Checking directory structure...');
const requiredDirs = ['src', 'src/services', 'src/automation', 'src/utils', 'config'];
let missingDirs = requiredDirs.filter(dir => !fs.existsSync(dir));

if (missingDirs.length > 0) {
  console.error(`   ❌ Missing directories: ${missingDirs.join(', ')}`);
  hasErrors = true;
} else {
  console.log('   ✓ All required directories exist');
}

// Summary
console.log('');
console.log('='.repeat(60));
if (hasErrors) {
  console.error('❌ Setup validation failed. Please fix the errors above.');
  console.log('='.repeat(60));
  process.exit(1);
} else {
  console.log('✓ Basic setup validation passed!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Configure form selectors in config/config.js');
  console.log('2. Configure iframe selectors in config/config.js');
  console.log('3. Test Google Sheets connection:');
  console.log('   node -e "require(\'./src/services/googleSheets\').initialize().then(() => console.log(\'Connected!\'))"');
  console.log('4. Run the application: npm start');
  console.log('='.repeat(60));
  process.exit(0);
}
