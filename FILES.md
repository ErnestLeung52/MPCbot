# MPCBot - File Structure Reference

Complete listing of all project files with descriptions.

## Root Directory Files

### Configuration Files
- **`.env.example`** - Environment variables template (user copies to `.env`)
- **`.gitignore`** - Git ignore rules (protects credentials)
- **`package.json`** - NPM dependencies and scripts
- **`package-lock.json`** - Locked dependency versions

### Documentation Files
- **`README.md`** - Main project documentation (comprehensive)
- **`SETUP_GUIDE.md`** - Step-by-step setup instructions
- **`QUICK_START.md`** - Quick 5-step getting started guide
- **`PROJECT_SUMMARY.md`** - Complete project overview and status
- **`FILES.md`** - This file - complete file listing

### Test/Utility Scripts
- **`test-setup.js`** - Validates configuration (run with `npm test`)
- **`test-detection.js`** - Tests anti-detection capabilities

### User-Created Files (Not in Git)
- **`.env`** - Environment variables (create from `.env.example`)
- **`credentials.json`** - Google service account key (download from Cloud Console)

## `/config` Directory

### Configuration
- **`config.js`** - Main application configuration
  - Google Sheets settings
  - Browser settings (user agents, viewports)
  - Automation timing settings
  - Form selectors (user must configure)
  - Iframe selectors (user must configure)
  - Error handling settings

### User-Created Files (Not in Git)
- **`proxies.json`** - Proxy list (create from `proxies.example.json`)

### Templates
- **`proxies.example.json`** - Proxy configuration template

## `/src` Directory

### Main Application
- **`index.js`** - Main entry point and orchestrator
  - MPCBot class
  - Task processing loop
  - Initialization logic
  - Error handling
  - Summary reporting

### `/src/services` - Core Services

- **`googleSheets.js`** - Google Sheets API integration
  - Initialize API client
  - Fetch rows and headers
  - Update rows and cells
  - Append new rows
  - Column index to letter conversion

- **`browser.js`** - Patchright browser management
  - Launch browser with proxy
  - Create stealth pages
  - Apply anti-detection scripts
  - Randomize fingerprints
  - Close browsers

- **`proxyManager.js`** - Proxy rotation
  - Load proxy list
  - Validate proxy format
  - Round-robin rotation
  - Format for browser
  - Mask credentials in logs

### `/src/automation` - Automation Logic

- **`humanBehavior.js`** - Human-like behavior simulation
  - Random delays
  - Human typing (with typos)
  - Human clicking (with mouse movement)
  - Smooth scrolling
  - Reading simulation
  - Random mouse movements
  - Select dropdowns
  - Check/uncheck boxes
  - Submit delays

- **`formFiller.js`** - Form filling automation
  - Navigate to page
  - Fill text fields
  - Select dropdowns
  - Set checkboxes
  - Select radio buttons
  - Auto-detect field types
  - Submit forms
  - Verify form completion

- **`iframeExtractor.js`** - Iframe data extraction
  - Wait for iframe
  - Get iframe by selector/index/URL
  - Extract text content
  - Extract attributes
  - Extract multiple elements
  - Custom extraction functions
  - Structured data extraction

### `/src/utils` - Utilities

- **`logger.js`** - Winston logging setup
  - Console and file transports
  - Multiple log levels
  - Separate error log
  - Helper methods for task logging
  - Timestamps and formatting

- **`errorHandler.js`** - Error handling
  - Screenshot capture
  - Error classification
  - Stop-on-error behavior
  - Error wrapping utilities
  - Log error details

## `/logs` Directory (Auto-Created)

Generated at runtime:
- **`combined.log`** - All logs (info, warn, error, debug)
- **`error.log`** - Error logs only

## `/screenshots` Directory (Auto-Created)

Generated when errors occur (if enabled):
- **`error-task{N}-{timestamp}.png`** - Screenshots of errors
- **`detection-test-*.png`** - Anti-detection test screenshots

## `/node_modules` Directory

NPM dependencies (auto-installed):
- **`patchright`** - Undetectable browser automation
- **`googleapis`** - Google Sheets API client
- **`dotenv`** - Environment variable loader
- **`winston`** - Advanced logging framework
- Plus all their dependencies

## File Purposes Summary

### Must Be Configured by User
1. `.env` (from `.env.example`)
2. `credentials.json` (from Google Cloud Console)
3. `config/proxies.json` (from `proxies.example.json`) - Optional
4. `config/config.js` - Update form and iframe selectors
5. `src/index.js` - Update submit button selector

### Auto-Generated at Runtime
1. `logs/combined.log`
2. `logs/error.log`
3. `screenshots/*.png`
4. `node_modules/` (via npm install)

### Source Code (Complete)
1. All `/src` files - Fully implemented
2. All `/config` files - Configuration templates
3. Test scripts - Validation and detection testing

### Documentation (Complete)
1. `README.md` - Full documentation
2. `SETUP_GUIDE.md` - Setup walkthrough
3. `QUICK_START.md` - Quick reference
4. `PROJECT_SUMMARY.md` - Project overview
5. `FILES.md` - This file

## Size Estimates

- **Source Code**: ~2,000 lines
- **Documentation**: ~2,500 lines
- **Dependencies**: ~75 packages
- **Total Project**: ~20 MB (with node_modules)

## File Count

- **Source Files**: 12 (.js)
- **Config Files**: 2 (.js + .json)
- **Documentation**: 5 (.md)
- **Templates**: 2 (.example)
- **Test Scripts**: 2 (.js)
- **Total Project Files**: 23 files

## Customization Points

Files you'll need to edit:

1. **`.env`** - Your credentials and settings
2. **`config/config.js`** - Form and iframe selectors
3. **`config/proxies.json`** - Your proxy list
4. **`src/index.js`** - Submit button selector (line ~95)

Everything else is ready to use!

## Security-Sensitive Files

Never commit these (already in `.gitignore`):
- `.env`
- `credentials.json`
- `config/proxies.json`
- `logs/`
- `screenshots/`

## Execution Flow Through Files

1. **Entry**: `src/index.js`
2. **Loads**: `config/config.js`
3. **Initializes**: 
   - `src/utils/logger.js`
   - `src/services/googleSheets.js`
   - `src/services/proxyManager.js`
4. **Per Task**:
   - `src/services/browser.js` - Launch
   - `src/automation/humanBehavior.js` - Behavior
   - `src/automation/formFiller.js` - Fill form
   - `src/automation/iframeExtractor.js` - Extract data
   - `src/services/googleSheets.js` - Update sheet
5. **Error Handling**: `src/utils/errorHandler.js`

## Dependencies Tree

```
MPCBot
├── patchright (browser automation)
│   └── playwright-core
├── googleapis (Google Sheets API)
│   ├── google-auth-library
│   └── googleapis-common
├── dotenv (environment variables)
└── winston (logging)
    ├── winston-transport
    └── logform
```

## Quick Reference

### Run Application
```bash
node src/index.js
# or
npm start
```

### Validate Setup
```bash
node test-setup.js
# or
npm test
```

### Test Detection
```bash
node test-detection.js
# or
npm run test-detection
```

### Test Google Sheets
```bash
npm run test-sheets
```

---

**All files are implemented and ready for use!**
