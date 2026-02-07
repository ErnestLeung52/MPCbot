# MPCBot Setup Guide

This guide walks you through setting up MPCBot step by step.

## Step 1: Install Dependencies

```bash
cd /path/to/MPCbot
npm install
```

Verify installation:
```bash
npm list patchright googleapis dotenv winston
```

## Step 2: Set Up Google Sheets API

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "MPCBot")
4. Click "Create"

### 2.2 Enable Google Sheets API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on it and press "Enable"

### 2.3 Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Enter name (e.g., "mpcbot-service")
4. Click "Create and Continue"
5. Skip role assignment (optional)
6. Click "Done"

### 2.4 Download Credentials

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" → "Create New Key"
4. Choose "JSON" format
5. Click "Create"
6. Save the downloaded file as `credentials.json` in your MPCBot directory

### 2.5 Share Google Sheet

1. Open the downloaded `credentials.json`
2. Find the `client_email` field (looks like: `mpcbot-service@your-project.iam.gserviceaccount.com`)
3. Copy this email
4. Open your Google Sheet
5. Click "Share" button
6. Paste the service account email
7. Give it "Editor" access
8. Uncheck "Notify people"
9. Click "Share"

### 2.6 Get Sheet ID

Your sheet ID is in the URL:
```
https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
                                        ^^^^^^^^^^^^^^^^
                                        Copy this part
```

## Step 3: Configure Environment Variables

1. Copy the example file:
```bash
cp .env.example .env
```

2. Edit `.env`:
```env
# Google Sheets - REQUIRED
GOOGLE_SHEETS_ID=your_sheet_id_from_step_2.6
GOOGLE_SHEET_NAME=Sheet1
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# Target Website - REQUIRED
TARGET_URL=https://your-target-website.com/form

# Automation Settings - Optional (defaults shown)
HEADLESS=false
MIN_DELAY=500
MAX_DELAY=2000
TYPING_SPEED_MIN=50
TYPING_SPEED_MAX=150

# Error Handling - Optional
STOP_ON_ERROR=true
SCREENSHOT_ON_ERROR=true

# Logging - Optional
LOG_LEVEL=info
```

## Step 4: Set Up Proxy List (Optional but Recommended)

1. Copy the example file:
```bash
cp config/proxies.example.json config/proxies.json
```

2. Edit `config/proxies.json` with your proxies:
```json
[
  {
    "server": "http://proxy1.yourservice.com:8080",
    "username": "your_username",
    "password": "your_password"
  },
  {
    "server": "http://proxy2.yourservice.com:8080",
    "username": "your_username",
    "password": "your_password"
  }
]
```

**Proxy Format Options:**
- HTTP: `http://host:port`
- HTTPS: `https://host:port`
- SOCKS5: `socks5://host:port`

**Note**: If you don't have proxies, the app will run without them (not recommended for production).

## Step 5: Prepare Your Google Sheet

Set up your sheet with this structure:

| FirstName | LastName | Email | Phone | Status | ResultData | Timestamp |
|-----------|----------|-------|-------|--------|------------|-----------|
| John | Doe | john@example.com | 555-0100 | | | |
| Jane | Smith | jane@example.com | 555-0101 | | | |

**Rules:**
- Row 1: Headers (column names)
- Row 2+: Data to process
- First columns: Input data
- Last columns: Output data (Status, ResultData, Timestamp, Error)
- The app will update output columns after processing

## Step 6: Configure Form Selectors

You need to identify the CSS selectors for your target form.

### 6.1 Find Form Selectors

1. Open your target website in Chrome
2. Right-click on a form field → "Inspect"
3. Find the element's selector:
   - Look for `id` attribute: `#field-id`
   - Look for `name` attribute: `[name="field-name"]`
   - Look for `class` attribute: `.field-class`
4. Test selector in Chrome DevTools Console:
   ```javascript
   document.querySelector('#your-selector')
   ```

### 6.2 Update Config

Edit `config/config.js`:

```javascript
formSelectors: {
  // Map your Google Sheet column names to CSS selectors
  'FirstName': '#first-name-input',        // Replace with actual selector
  'LastName': '#last-name-input',          // Replace with actual selector
  'Email': 'input[name="email"]',          // Replace with actual selector
  'Phone': '#phone',                       // Replace with actual selector
  'Message': 'textarea#message'            // Replace with actual selector
},
```

### 6.3 Find Submit Button Selector

1. Right-click on submit button → "Inspect"
2. Find the button's selector
3. Edit `src/index.js` and update:
   ```javascript
   const submitSelector = '#submit-button'; // Replace with your selector
   ```

## Step 7: Configure Iframe Extraction

After form submission, data appears in an iframe. You need to configure extraction.

### 7.1 Find Iframe Selector

1. After submitting form manually, wait for result
2. Right-click on result area → "Inspect"
3. Look for `<iframe>` tag in HTML
4. Find iframe's selector (id, class, or index)

### 7.2 Find Data Selectors Inside Iframe

1. In DevTools, click on the iframe in Elements tab
2. Now you're inspecting inside the iframe
3. Find selectors for data you want to extract

### 7.3 Update Config

Edit `config/config.js`:

```javascript
iframeSelectors: {
  // Choose ONE method to identify iframe:
  
  // Method A: By CSS selector
  iframeSelector: '#result-iframe',
  
  // Method B: By index (0 = main page, 1 = first iframe, 2 = second iframe)
  // iframeIndex: 1,
  
  // Method C: By URL pattern
  // iframeUrl: /result\.php/,
  
  // Define what to extract from iframe
  fields: {
    'ResultData': '#result-text',              // Extract text from element
    'ConfirmationNumber': {
      selector: '#confirmation-id',
      type: 'text'                             // Extract text
    },
    'Status': {
      selector: '.status-badge',
      type: 'attribute',                       // Extract attribute
      attribute: 'data-status'                 // Which attribute
    }
  }
}
```

## Step 8: Test Your Configuration

### 8.1 Test Google Sheets Connection

Create a simple test file `test-sheets.js`:

```javascript
require('dotenv').config();
const googleSheets = require('./src/services/googleSheets');

async function test() {
  await googleSheets.initialize();
  const headers = await googleSheets.getHeaders();
  console.log('Headers:', headers);
  
  const rows = await googleSheets.fetchRows();
  console.log('First row:', rows[0]);
}

test();
```

Run:
```bash
node test-sheets.js
```

### 8.2 Test Browser Launch

Create `test-browser.js`:

```javascript
require('dotenv').config();
const browserService = require('./src/services/browser');

async function test() {
  const browser = await browserService.launch();
  const page = await browserService.createPage(browser);
  await page.goto('https://bot.sannysoft.com/');
  await page.waitForTimeout(5000);
  await browser.close();
  console.log('Browser test complete');
}

test();
```

Run:
```bash
node test-browser.js
```

Check the page for any red flags indicating bot detection.

### 8.3 Test Full Flow with One Row

Edit your Google Sheet to have only 1 data row for testing.

Run:
```bash
npm start
```

Watch the logs and browser behavior.

## Step 9: Run in Production

Once testing is successful:

1. Add all your data rows to Google Sheet
2. Consider running with headless mode:
   ```env
   HEADLESS=true
   ```
3. Run:
   ```bash
   npm start
   ```

## Common Issues and Solutions

### Issue: "Credentials file not found"

**Solution**: 
- Verify `credentials.json` is in project root
- Check path in `.env` matches actual file location

### Issue: "Failed to fetch rows"

**Solution**:
- Verify sheet ID in `.env` is correct
- Ensure service account has access to sheet
- Check sheet name matches exactly (case-sensitive)

### Issue: "Element not found" or timeout errors

**Solution**:
- Double-check CSS selectors in config
- Test selectors in browser DevTools console
- Increase timeouts if page loads slowly
- Make sure page is fully loaded before interaction

### Issue: Proxy connection errors

**Solution**:
- Verify proxy credentials are correct
- Test proxy connectivity separately
- Check proxy format (http://, https://, socks5://)
- Try without proxy first to isolate issue

### Issue: Bot detection

**Solution**:
- Test on https://bot.sannysoft.com/ first
- Use residential proxies instead of datacenter
- Increase delays in config
- Run with headless=false to observe behavior
- Check if website has CAPTCHA

### Issue: Iframe not found

**Solution**:
- Verify iframe appears after form submission
- Check if iframe is in a popup or new window
- Try different iframe identification methods (selector, index, URL)
- Use DevTools to inspect iframe structure

## Next Steps

After successful setup:

1. **Monitor Logs**: Check `logs/combined.log` for issues
2. **Review Results**: Verify data in Google Sheet
3. **Optimize Timing**: Adjust delays based on website response
4. **Scale Up**: Process larger datasets
5. **Schedule**: Consider cron jobs for automated runs

## Getting Help

If you encounter issues:

1. Enable debug logging:
   ```env
   LOG_LEVEL=debug
   ```

2. Run with visible browser:
   ```env
   HEADLESS=false
   ```

3. Check error screenshots in `screenshots/` directory

4. Review logs in `logs/` directory

## Security Checklist

- [ ] `.gitignore` includes `credentials.json`
- [ ] `.gitignore` includes `.env`
- [ ] `.gitignore` includes `config/proxies.json`
- [ ] Credentials not committed to version control
- [ ] Proxy passwords are secure
- [ ] Google Sheet shared only with service account
- [ ] Logs don't contain sensitive data

## Performance Tips

1. **Parallel Processing**: Current design is sequential. For parallel, consider worker threads
2. **Proxy Health**: Monitor proxy response times
3. **Error Recovery**: Consider retry logic for transient failures
4. **Rate Limiting**: Add delays if website has rate limits
5. **Resource Cleanup**: Ensure browsers close properly

Congratulations! Your MPCBot is now set up and ready to use.
