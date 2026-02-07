# MPCBot Quick Start Guide

Get up and running in 5 steps!

## Prerequisites Checklist

- [ ] Node.js 16+ installed
- [ ] Google Cloud account
- [ ] Google Sheet created
- [ ] Proxy list (optional but recommended)

## Step 1: Install (2 minutes)

```bash
cd MPCbot
npm install
```

## Step 2: Google Sheets Setup (5 minutes)

### A. Create Service Account

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable "Google Sheets API"
3. Create Service Account → Download JSON key
4. Save as `credentials.json` in project root

### B. Share Sheet

1. Open your Google Sheet
2. Click "Share"
3. Add service account email from `credentials.json`
4. Give "Editor" permission

### C. Get Sheet ID

From URL: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`

## Step 3: Configure (3 minutes)

### A. Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
GOOGLE_SHEETS_ID=your_sheet_id_here
TARGET_URL=https://your-website.com/form
HEADLESS=false
STOP_ON_ERROR=true
```

### B. Proxy List (Optional)

```bash
cp config/proxies.example.json config/proxies.json
```

Edit `config/proxies.json` with your proxies.

## Step 4: Configure Selectors (10 minutes)

### A. Find Form Selectors

1. Open target website in Chrome
2. Right-click form field → Inspect
3. Copy selector (e.g., `#email`, `input[name="phone"]`)

### B. Update Config

Edit `config/config.js`:

```javascript
formSelectors: {
  'Email': '#email-input',      // Your actual selectors
  'Name': '#name-input',         // Your actual selectors
  'Phone': 'input[name="phone"]' // Your actual selectors
}
```

### C. Find Submit Button

Edit `src/index.js`:
```javascript
const submitSelector = '#submit-btn'; // Your actual selector
```

### D. Configure Iframe Extraction

Edit `config/config.js`:

```javascript
iframeSelectors: {
  iframeSelector: '#result-frame',  // Your iframe selector
  fields: {
    'Result': '#result-text'         // Your data selectors
  }
}
```

## Step 5: Run (1 minute)

### Validate Setup

```bash
npm run validate
```

Fix any errors shown.

### Test Connection

```bash
npm run test-sheets
```

Should show: ✓ Google Sheets connected successfully!

### Test Stealth (Optional)

```bash
npm run test-detection
```

Checks browser stealth on detection sites.

### Run Application

```bash
npm start
```

Watch logs and browser for first run!

## Your Google Sheet Format

| Email | Name | Phone | Status | Result | Timestamp |
|-------|------|-------|--------|--------|-----------|
| john@example.com | John Doe | 555-0100 | | | |
| jane@example.com | Jane Smith | 555-0101 | | | |

- **Columns 1-3**: Input data (configure as needed)
- **Columns 4-6**: Output data (auto-filled by app)

## Common Issues

### "Credentials file not found"
- Check `credentials.json` is in project root
- Verify filename is exact

### "Failed to fetch rows"
- Verify Sheet ID in `.env`
- Check service account has access
- Ensure sheet name is correct

### "Element not found"
- Double-check selectors in config
- Test selectors in browser console
- Ensure page is fully loaded

### "Proxy connection failed"
- Verify proxy credentials
- Check proxy format (http://, https://, socks5://)
- Try without proxy first

## Tips

1. **Start Small**: Test with 1 row first
2. **Watch Browser**: Use `HEADLESS=false` for first runs
3. **Check Logs**: `logs/combined.log` has details
4. **Debug Mode**: Set `LOG_LEVEL=debug` for more info
5. **Screenshot Errors**: Check `screenshots/` folder

## Need Help?

1. Run validation: `npm run validate`
2. Check logs: `logs/error.log`
3. Read full guide: `SETUP_GUIDE.md`
4. Check docs: `README.md`

## Security Reminder

Never commit these files:
- `credentials.json`
- `.env`
- `config/proxies.json`

They're in `.gitignore` already ✓

## What Happens When You Run

1. ✓ Loads configuration
2. ✓ Connects to Google Sheets
3. ✓ Fetches all rows
4. ✓ For each row:
   - Gets next proxy
   - Launches stealth browser
   - Navigates to website
   - Fills form (human-like)
   - Submits form
   - Extracts results from iframe
   - Updates Google Sheet
   - Closes browser
5. ✓ Shows summary

## Performance

- Sequential processing (one at a time)
- ~30-60 seconds per task (depends on website)
- Fresh browser for each task (anti-detection)
- Proxy rotation per task

## Next Steps

After successful first run:

1. **Scale Up**: Add more rows to sheet
2. **Optimize**: Adjust delays in config
3. **Monitor**: Watch logs for issues
4. **Maintain**: Update selectors when website changes

## Support

- Full documentation: `README.md`
- Setup guide: `SETUP_GUIDE.md`
- Project info: `PROJECT_SUMMARY.md`

---

**You're ready to go! Run `npm start` when configured.**
