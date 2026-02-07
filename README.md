# MPCBot - Undetectable Chrome Automation

A Node.js automation app using Patchright (undetectable Playwright fork) to perform repetitive tasks on websites with human-like behavior. Integrates with Google Sheets for data input/output and supports proxy rotation.

## Features

- **Undetectable Browser Automation**: Uses Patchright with stealth patches to avoid bot detection
- **Human-like Behavior**: Simulates realistic typing, mouse movements, and delays
- **Google Sheets Integration**: Pull input data and update results automatically
- **Proxy Rotation**: Each task uses a different proxy from your list
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
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Google Sheets
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SHEET_NAME=Sheet1
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# Target Website
TARGET_URL=https://example.com/form

# Automation Settings
HEADLESS=false
MIN_DELAY=500
MAX_DELAY=2000
TYPING_SPEED_MIN=50
TYPING_SPEED_MAX=150

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

### 1. Configure Form Field Mapping

Edit `config/config.js` and set up `formSelectors`:

```javascript
formSelectors: {
  // Map Google Sheets column names to CSS selectors
  'FirstName': '#first-name-input',
  'LastName': '#last-name-input',
  'Email': '#email-input',
  'Phone': 'input[name="phone"]',
  'Message': 'textarea#message'
}
```

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

### 3. Set Submit Button Selector

Edit `src/index.js` and update the submit button selector:

```javascript
const submitSelector = '#submit-button'; // Change to your submit button selector
```

## Google Sheets Format

Your Google Sheet should have:

- **Row 1**: Headers (column names)
- **Row 2+**: Data rows

Example:

| FirstName | LastName | Email | Phone | Status | ResultData | Timestamp |
|-----------|----------|-------|-------|--------|------------|-----------|
| John | Doe | john@example.com | 555-0100 | | | |
| Jane | Smith | jane@example.com | 555-0101 | | | |

The app will:
1. Read input data from the first columns
2. Fill form and submit
3. Extract results from iframe
4. Update `Status`, `ResultData`, `Timestamp` columns

## Usage

Run the application:

```bash
npm start
```

Or directly with node:

```bash
node src/index.js
```

## Workflow

1. **Initialize**: Connect to Google Sheets and load proxies
2. **Fetch Data**: Read all rows from the sheet
3. **For Each Row**:
   - Select next proxy from rotation
   - Launch Patchright browser with proxy
   - Navigate to target website
   - Fill form with data using human-like behavior
   - Submit form
   - Wait for and extract data from iframe
   - Update Google Sheet with results
   - Close browser
4. **Complete**: Log summary statistics

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
│   ├── config.js              # Main configuration
│   ├── proxies.json           # Proxy list (create from example)
│   └── proxies.example.json   # Proxy list template
├── src/
│   ├── index.js               # Main application entry point
│   ├── services/
│   │   ├── googleSheets.js    # Google Sheets integration
│   │   ├── browser.js         # Patchright browser manager
│   │   └── proxyManager.js    # Proxy rotation logic
│   ├── automation/
│   │   ├── formFiller.js      # Form filling automation
│   │   ├── iframeExtractor.js # Iframe data extraction
│   │   └── humanBehavior.js   # Human-like behavior utilities
│   └── utils/
│       ├── logger.js          # Winston logger setup
│       └── errorHandler.js    # Error handling utilities
├── logs/                      # Runtime logs (auto-created)
├── screenshots/               # Error screenshots (auto-created)
├── .env                       # Environment variables (create from example)
├── .env.example               # Environment template
├── credentials.json           # Google service account key (create)
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
