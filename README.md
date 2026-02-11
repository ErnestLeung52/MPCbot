# MPCBot - Undetectable Chrome Automation

A Node.js automation app using Patchright (undetectable Playwright fork) to perform repetitive tasks on websites with human-like behavior. Integrates with Google Sheets for data input/output and supports proxy rotation.

## Features

- **Undetectable Browser Automation**: Uses Patchright with stealth patches to avoid bot detection
- **Human-like Behavior**: Simulates realistic typing, mouse movements, and delays
- **Google Sheets Integration**: Pull input data and update results automatically
- **Continuous Workflow**: Automatically process multiple tasks based on proxy availability
- **Smart Proxy Rotation**: Round-robin allocation ensuring even proxy usage before reuse
- **Comprehensive Logging**: Winston-based logging with error tracking
- **Error Handling**: Configurable stop-on-error with screenshot capture

## Prerequisites

- Node.js 16.x or higher
- Google Cloud Project with Sheets API enabled
- List of proxies (optional but recommended)
- Target website details (form selectors, iframe structure)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Google Sheets API:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google Sheets API
   - Create Service Account credentials
   - Download JSON key file and save as `credentials.json` in project root
   - Share your Google Sheet with the service account email (found in credentials.json)

3. Configure environment variables:

Edit `.env` with your configuration:
```env
# Google Sheets
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# Target Website
TARGET_URL=https://example.com/form

# Automation Settings
HEADLESS=false
MIN_DELAY=500
MAX_DELAY=2000
TYPING_SPEED_MIN=50
TYPING_SPEED_MAX=150

# Proxy Settings
# Number of times each proxy can be used before exhaustion
# Example: 10 proxies × 3 uses = 30 total tasks
PROXY_USES_PER_CYCLE=3

# Error Handling
STOP_ON_ERROR=true
SCREENSHOT_ON_ERROR=true

# Logging
LOG_LEVEL=info
```

4. Set up proxy list (optional):
```bash
cp config/proxies.example.json config/proxies.json
```

Edit `config/proxies.json` with your proxies:
```json
[
  {
    "server": "http://proxy1.example.com:8080",
    "username": "user1",
    "password": "pass1"
  },
  {
    "server": "http://proxy2.example.com:8080",
    "username": "user2",
    "password": "pass2"
  }
]
```

## Configuration

### 1. Configure Sheet and Form Mapping

**All configuration is now centralized in `config/sheetMapping.js`**

Edit `config/sheetMapping.js`:

```javascript
// Set your sheet name
const SHEET_NAME = 'Your Sheet Name';

// Map your sheet columns to form fields
const COLUMN_MAPPINGS = {
  firstName: 'FirstName',      // Your sheet column name
  lastName: 'LastName',        // Your sheet column name
  email: 'Email',              // Your sheet column name
  // ... etc
};

// Map form fields to CSS selectors
const FORM_SELECTORS = {
  firstName: '#first-name-input',     // CSS selector
  lastName: '#last-name-input',       // CSS selector
  email: '#email-input',              // CSS selector
  submitButton: '#submit-button'      // CSS selector
};
```

**Features:**
- Automatic state abbreviation conversion (CA → California)
- Optional field handling
- Centralized configuration for easy updates

**See `SHEET_MAPPING_GUIDE.md` for detailed instructions**

### 2. Configure Iframe Extraction

Edit `config/config.js` and set up `iframeSelectors`:

```javascript
iframeSelectors: {
  // Method 1: By selector
  iframeSelector: '#result-iframe',
  
  // Method 2: By index (0 = main frame, 1 = first iframe)
  // iframeIndex: 1,
  
  // Method 3: By URL pattern
  // iframeUrl: /result\.php/,
  
  // Fields to extract
  fields: {
    'ResultData': '#result-text',
    'ConfirmationNumber': {
      selector: '#confirmation',
      type: 'text'
    },
    'Status': {
      selector: '.status-badge',
      type: 'attribute',
      attribute: 'data-status'
    }
  }
}
```

### 3. Test Your Configuration

Run these test scripts to verify everything is set up correctly:

```bash
# Test Google Sheets connection
node test-sheets.js

# Test column mappings and data extraction
node test-mapping.js
```

Fix any errors before running the full automation.

## Google Sheets Format

Your Google Sheet should have:

- **Row 1**: Headers (column names)
- **Row 2+**: Data rows

Example:

| RedeemCode2 | FirstName | LastName | Email | Phone | Status | Amount | CardNumber | Exp | CVV | Timestamp |
|-------------|-----------|----------|-------|-------|--------|--------|------------|-----|-----|-----------|
| ABC123456789 | John | Doe | john@example.com | 555-0100 | | | | | | |
| XYZ987654321 | Jane | Smith | jane@example.com | 555-0101 | Success | $50 | 1234... | 12/25 | 123 | 2026-02-08... |

The app will:
1. **Scan rows** and filter valid tasks based on RedeemCode and Status
2. **Process valid tasks**: Read input data and fill form
3. **Extract card data**: Amount, CardNumber, Exp, CVV
4. **Update sheet**: Status, card data, and Timestamp

### Task Filtering Rules

The bot automatically filters which rows to process:

**✓ Will Process** if:
- RedeemCode is exactly 12 characters
- Status is empty (not processed yet)
- Email, FirstName, LastName are present

**✗ Will Skip** if:
- RedeemCode is empty or not 12 characters
- Status is not empty (already processed/failed/in progress)
- Missing required fields

See `TASK_FILTERING_GUIDE.md` for detailed filtering logic.

## Usage

### Quick Start

For a quick setup, see `QUICK_START.md`

### Run the Application

```bash
npm start
```

Or directly with node:

```bash
node src/index.js
```

### Test Scripts

```bash
# Test Google Sheets connection
node test-sheets.js

# Test configuration and mappings
node test-mapping.js

# Test task filtering logic (see which tasks will be processed)
node test-task-filtering.js
```

## Workflow

1. **Initialize**: Connect to Google Sheets and load proxies
2. **Calculate Capacity**: Determine max tasks based on proxy count × uses per proxy
3. **Fetch Data**: Read all rows from the sheet
4. **Filter Tasks**: Identify valid tasks based on RedeemCode and Status
5. **Limit Tasks**: Process only up to proxy capacity (remaining tasks saved for next run)
6. **For Each Valid Task**:
   - Mark Status as "In Progress"
   - Select next proxy using round-robin allocation
   - Launch Patchright browser with proxy
   - Navigate to target website
   - Sanitize and prepare data
   - Fill form with data using human-like behavior
   - Submit form
   - Extract card data (Amount, CardNumber, Exp, CVV)
   - Update Google Sheet with results
   - Mark Status as "Success" or "Failed"
   - Close browser
7. **Complete**: Log summary statistics and proxy usage

### Continuous Workflow Details

The bot implements a **smart continuous workflow** that automatically manages task processing based on proxy availability:

**How it Works:**
- Total tasks = Number of proxies × Uses per proxy
- Example: 10 proxies × 3 uses = 30 tasks maximum
- Proxies are used in **round-robin** fashion (not consecutively)

**Round-Robin Pattern:**
```
Task 1 → Proxy #1 (1st use)
Task 2 → Proxy #2 (1st use)
Task 3 → Proxy #3 (1st use)
...
Task 10 → Proxy #10 (1st use)
Task 11 → Proxy #1 (2nd use)
Task 12 → Proxy #2 (2nd use)
...
```

**Benefits:**
- **Even distribution**: Each proxy gets used before any proxy is reused
- **Better IP rotation**: Consecutive tasks use different IPs
- **Automatic limiting**: Won't process more tasks than proxy capacity allows
- **Configurable**: Adjust `PROXY_USES_PER_CYCLE` to increase/decrease capacity

**Configuration:**
- Set `PROXY_USES_PER_CYCLE` in `.env` to control how many times each proxy can be used
- Default is 3 (each proxy used 3 times)
- Higher values = more tasks per run, but higher risk of proxy burnout

## Human-like Behavior Features

- **Realistic Typing**: Character-by-character with random delays (50-150ms)
- **Typo Simulation**: 5% chance of typing wrong character and correcting
- **Random Delays**: 500-2000ms between actions
- **Mouse Movement**: Smooth movement to elements with slight randomness
- **Page Scrolling**: Natural scrolling behavior
- **Reading Simulation**: Pauses to simulate reading content
- **Submit Delay**: Longer delay (2-4s) before clicking submit

## Anti-Detection Features

- **Patchright**: Built-in patches to avoid detection
- **Stealth Scripts**: Override navigator properties
- **User Agent Rotation**: Random realistic user agents
- **Viewport Randomization**: Different screen sizes
- **Proxy Rotation**: Different IP for each task
- **Plugin Mocking**: Realistic browser plugins
- **Chrome Runtime**: Proper chrome object mocking

## Logging

Logs are saved to `logs/` directory:

- `combined.log`: All logs
- `error.log`: Error logs only

Log levels: error, warn, info, debug

## Error Handling

When `STOP_ON_ERROR=true`:
- Application stops on first error
- Screenshot saved to `screenshots/` (if enabled)
- Error logged with full stack trace

When `STOP_ON_ERROR=false`:
- Application continues to next task
- Failed tasks marked in Google Sheet

## Troubleshooting

### Bot Detection

If the website detects automation:

1. Test with headless=false to see behavior
2. Increase delays in config
3. Add more human-like behavior patterns
4. Test with residential proxies
5. Check browser fingerprint on sites like:
   - https://bot.sannysoft.com/
   - https://pixelscan.net/
   - https://abrahamjuliot.github.io/creepjs/

### Google Sheets API Errors

- Verify credentials.json is correct
- Check if service account email has access to sheet
- Ensure Google Sheets API is enabled in Cloud Console

### Proxy Errors

- Verify proxy format (http://, https://, socks5://)
- Test proxy connectivity
- Check proxy authentication credentials

### Form Filling Errors

- Use browser DevTools to find correct selectors
- Check if page is fully loaded before interaction
- Verify field mapping in config.js

### Iframe Extraction Errors

- Check iframe selector or index
- Verify iframe content loads after submit
- Use browser DevTools to inspect iframe structure

## Project Structure

```
MPCbot/
├── config/
│   ├── sheetMapping.js        # Sheet & form configuration (EDIT THIS)
│   ├── sheetMapping.example.js # Template for sheetMapping.js
│   ├── config.js              # Main configuration
│   ├── proxies.json           # Proxy list (create from example)
│   └── proxies.example.json   # Proxy list template
├── src/
│   ├── index.js               # Main application entry point
│   ├── services/
│   │   ├── googleSheets.js    # Google Sheets integration
│   │   ├── browser.js         # Patchright browser manager
│   │   ├── proxyManager.js    # Proxy loading and management
│   │   └── proxyScheduler.js  # Round-robin proxy allocation
│   ├── automation/
│   │   ├── formFiller.js      # Form filling automation
│   │   ├── iframeExtractor.js # Iframe data extraction
│   │   └── humanBehavior.js   # Human-like behavior utilities
│   └── utils/
│       ├── logger.js          # Winston logger setup
│       └── errorHandler.js    # Error handling utilities
├── logs/                      # Runtime logs (auto-created)
├── screenshots/               # Error screenshots (auto-created)
├── test-sheets.js             # Test Google Sheets connection
├── test-mapping.js            # Test configuration and mappings
├── .env                       # Environment variables
├── credentials.json           # Google service account key (create)
├── QUICK_START.md             # Quick setup guide
├── SHEET_MAPPING_GUIDE.md     # Detailed mapping configuration guide
├── CHANGES.md                 # Recent configuration changes
├── package.json
└── README.md
```

## Development

### Testing Stealth

Test your setup on bot detection sites before running on target:

```javascript
// Temporarily change TARGET_URL in .env
TARGET_URL=https://bot.sannysoft.com/
```

Run and check for red flags in the output.

### Debugging

Set log level to debug in `.env`:

```env
LOG_LEVEL=debug
```

Run with headless=false to watch browser behavior:

```env
HEADLESS=false
```

## Best Practices

1. **Start Small**: Test with 1-2 rows before processing large datasets
2. **Use Residential Proxies**: Better for avoiding detection
3. **Randomize Timing**: Don't run at exact same times
4. **Monitor Logs**: Watch for patterns of failures
5. **Update Selectors**: Websites change, keep selectors current
6. **Respect Rate Limits**: Add delays between tasks if needed
7. **Test Proxies**: Verify proxy health before running
8. **Backup Data**: Keep copy of Google Sheet

## Security Notes

- Never commit `credentials.json` or `proxies.json` to version control
- Keep `.env` file secure and out of git
- Use strong passwords for proxy authentication
- Rotate proxies regularly
- Monitor for suspicious activity

## License

ISC

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review error screenshots in `screenshots/`
3. Enable debug logging for more details
4. Test individual components separately

## Disclaimer

This tool is for educational purposes and automating your own legitimate tasks. Ensure you comply with the target website's Terms of Service and robots.txt. Use responsibly and ethically.
