# Bot Detection Testing

This document explains how to test your browser automation setup against popular bot detection websites.

## Overview

The bot detection testing functionality helps you verify that your Patchright browser automation is properly configured to avoid detection by anti-bot systems. It tests your setup against multiple well-known bot detection services.

## Test Sites

The test suite checks your browser against the following websites (configured in `config/bot-detection-sites.json`):

1. **Bot Sannysoft** (`https://bot.sannysoft.com`)
   - Comprehensive bot detection tests
   - Checks for common automation indicators
   - Tests navigator properties, webdriver flags, and more

2. **Are You Headless** (`https://arh.antoinevastel.com/bots/areyouheadless`)
   - Specialized in detecting headless browsers
   - Checks for headless Chrome indicators
   - Tests various JavaScript APIs

3. **PixelScan** (`https://pixelscan.net`)
   - Advanced browser fingerprinting
   - Bot score calculation
   - Consistency checks across multiple signals

4. **Fingerprint Scan** (`https://fingerprint-scan.com`)
   - Browser fingerprinting analysis
   - Tracking and automation detection
   - Canvas and WebGL fingerprinting

## Running Tests

### Quick Start

Run all bot detection tests:

```bash
npm run test-detection
```

### What Happens During Tests

1. **Proxy Loading**: If proxies are configured in `config/proxies.json`, they will be used for testing
2. **Browser Launch**: Each test site is opened in a separate browser instance using Patchright
3. **Page Load**: The page loads completely and waits 5 seconds for all detection scripts to run
4. **Screenshot**: A full-page screenshot is saved to `./screenshots/` directory
5. **Results Extraction**: Site-specific detection results are extracted and displayed
6. **Manual Inspection**: Browser stays open for 30 seconds for manual review

### Test Duration

- Each site takes approximately 35-40 seconds to test
- Total test time: ~2-3 minutes for all 4 sites
- Additional 5-second delay between tests

## Understanding Results

### Bot Sannysoft Results

Look for:
- ✅ **PASS** indicators in green
- ❌ **FAILED** indicators in red (these need attention)
- Check that `navigator.webdriver` is `undefined` or `false`
- Verify plugins are detected
- Ensure Chrome appears as a normal browser

### Are You Headless Results

Look for:
- ✅ "You are not headless" message
- ❌ "You are headless" message (indicates detection)
- All individual checks should pass

### PixelScan Results

Check the screenshot for:
- **Bot Score**: Should be 0 or very low
- **Consistency**: All fingerprint elements should be consistent
- **Automation Flags**: Should not show any automation indicators
- **WebGL/Canvas**: Should render properly

### Fingerprint Scan Results

Check the screenshot for:
- **Fingerprint Quality**: Should appear as a normal browser
- **Tracking Protection**: Check detection status
- **Browser Signals**: Should match a real Chrome browser
- **Anomaly Detection**: No unusual patterns should be detected

## Screenshots

All test screenshots are automatically saved to:

```
./screenshots/detection-test-[site-name].png
```

Examples:
- `detection-test-bot-sannysoft.png`
- `detection-test-are-you-headless.png`
- `detection-test-pixelscan.png`
- `detection-test-fingerprint-scan.png`

## Configuration

### Adding New Test Sites

Edit `config/bot-detection-sites.json`:

```json
{
  "sites": [
    {
      "name": "Site Name",
      "url": "https://example.com",
      "description": "What this site tests for"
    }
  ]
}
```

### Using Proxies

To test with proxies:

1. Copy `config/proxies.example.json` to `config/proxies.json`
2. Add your proxy configurations
3. Run the test - proxies will be used automatically

## Troubleshooting

### Common Issues

**Issue**: Tests fail immediately
- **Solution**: Check your internet connection
- Verify patchright is installed: `npm install`

**Issue**: All tests show "FAILED"
- **Solution**: Review browser configuration in `config/config.js`
- Check that patchright is properly patched
- Verify stealth scripts in `src/services/browser.js`

**Issue**: Screenshots not saved
- **Solution**: Check write permissions for `./screenshots/` directory
- The directory is created automatically if it doesn't exist

**Issue**: Browser closes too quickly
- **Solution**: Adjust the `waitForTimeout` values in `test-detection.js`
- Default: 30 seconds manual inspection time

### Best Practices

1. **Test Regularly**: Run detection tests whenever you update browser configuration
2. **Compare Results**: Keep previous screenshots to track changes over time
3. **Test with Proxies**: Verify detection with and without proxy rotation
4. **Monitor Updates**: Bot detection sites update regularly - retest periodically
5. **Multiple Profiles**: Test different user agents and viewport configurations

## Technical Details

### Browser Configuration

The test uses the same browser service (`src/services/browser.js`) as the main automation, including:

- Patchright chromium with stealth patches
- Random user agent selection
- Random viewport sizes
- Random timezone selection
- Navigator property overrides
- Plugin mocking
- WebGL and Canvas consistency

### Stealth Features

Active stealth measures:
- `navigator.webdriver` override
- Chrome runtime mocking
- Plugin array population
- Hardware concurrency randomization
- Language array consistency
- Permission API mocking
- Battery API mocking

## Advanced Usage

### Running Specific Sites

Edit `test-detection.js` to filter sites:

```javascript
const TEST_SITES = sitesConfig.sites.filter(site => 
  site.name === 'Bot Sannysoft'
);
```

### Automated Testing

Integrate into CI/CD:

```bash
# Exit with error if any detection fails
npm run test-detection || exit 1
```

### Custom Detection Logic

Add site-specific detection in `test-detection.js`:

```javascript
if (site.name === 'Your Site') {
  const results = await page.evaluate(() => {
    // Your custom detection logic
    return { status: 'pass' };
  });
  console.log(results);
}
```

## Support

If you encounter issues:
1. Check screenshots for visual clues
2. Review browser console logs
3. Verify proxy configuration
4. Test without proxy to isolate issues
5. Compare with a real Chrome browser

## Related Files

- `test-detection.js` - Main test script
- `config/bot-detection-sites.json` - Test site configuration
- `src/services/browser.js` - Browser service with stealth features
- `config/config.js` - Main configuration
- `config/proxies.json` - Proxy configuration (optional)
