# CLI Usage Examples - Bot Detection Tests

## 📱 Basic Usage

### Run All Tests (Default)
```bash
npm run test-detection
```
**Duration:** ~4 minutes  
**Tests:** All 5 sites sequentially

---

### Run Single Test by Index
```bash
npm run test-detection 1
```
**Duration:** ~40 seconds  
**Tests:** Bot Sannysoft only

```bash
npm run test-detection 2
```
**Duration:** ~40 seconds  
**Tests:** Are You Headless only

```bash
npm run test-detection 3
```
**Duration:** ~40 seconds  
**Tests:** PixelScan only

```bash
npm run test-detection 4
```
**Duration:** ~40 seconds  
**Tests:** Fingerprint Scan only

```bash
npm run test-detection 5
```
**Duration:** ~40 seconds  
**Tests:** Rebrowser Bot Detector only

---

### Run Multiple Tests
```bash
npm run test-detection 1,2
```
**Duration:** ~1.5 minutes  
**Tests:** Bot Sannysoft + Are You Headless

```bash
npm run test-detection 1,3,5
```
**Duration:** ~2.5 minutes  
**Tests:** Bot Sannysoft + PixelScan + Rebrowser

```bash
npm run test-detection 2,5
```
**Duration:** ~1.5 minutes  
**Tests:** Are You Headless + Rebrowser (modern tools)

```bash
npm run test-detection 3,4
```
**Duration:** ~1.5 minutes  
**Tests:** PixelScan + Fingerprint Scan (fingerprinting focus)

---

## 🔍 Information Commands

### List Available Tests
```bash
npm run test-detection:list
```
Shows all available test sites with indices and descriptions

### Show Help
```bash
npm run test-detection:help
```
OR
```bash
npm run test-detection -- --help
```
Displays usage instructions and available options

---

## 💼 Real-World Usage Scenarios

### Scenario 1: Quick Development Check
**Need:** Fast verification after code changes  
**Command:**
```bash
npm run test-detection 2
```
**Why:** Headless detection is the most critical indicator (~40 seconds)

---

### Scenario 2: Standard Validation
**Need:** Verify core stealth features  
**Command:**
```bash
npm run test-detection 1,2,5
```
**Why:** Covers comprehensive detection + headless + modern tools (~2.5 minutes)

---

### Scenario 3: Fingerprinting Issues
**Need:** Debug fingerprinting problems  
**Command:**
```bash
npm run test-detection 3,4
```
**Why:** Both sites focus on browser fingerprinting (~1.5 minutes)

---

### Scenario 4: Full Pre-Production Test
**Need:** Complete validation before deployment  
**Command:**
```bash
npm run test-detection
```
**Why:** Runs all 5 tests for comprehensive coverage (~4 minutes)

---

### Scenario 5: Troubleshooting Detection
**Need:** Investigate specific detection failures  
**Command:**
```bash
npm run test-detection 1    # Check navigator properties
npm run test-detection 2    # Verify headless mode
npm run test-detection 5    # Check Playwright/Puppeteer leaks
```
**Why:** Isolate specific detection vectors

---

## 🎯 Recommended Workflows

### Development Workflow
```bash
# 1. Make code changes
# 2. Quick check
npm run test-detection 2

# 3. If passing, run core tests
npm run test-detection 1,2

# 4. Full test before committing
npm run test-detection
```

### Testing Workflow
```bash
# Daily checks during testing phase
npm run test-detection 1,2,5

# Weekly full validation
npm run test-detection
```

### Production Workflow
```bash
# Pre-deployment mandatory check
npm run test-detection

# Post-deployment verification
npm run test-detection 1,2
```

---

## ⚙️ Advanced Usage

### CI/CD Integration
```bash
# In your CI pipeline
npm run test-detection 1,2,5 || exit 1
```

### Scheduled Testing
```bash
# Cron job for daily checks
0 9 * * * cd /path/to/MPCbot && npm run test-detection 2 >> logs/daily-test.log
```

### Parallel Testing (Future Enhancement)
```bash
# Currently runs sequentially
# Future: Consider parallel execution for faster results
```

---

## 🚨 Error Handling

### Invalid Index
```bash
npm run test-detection 99
```
**Output:**
```
❌ Invalid test index: 99
   Valid indices: 1-5
[Shows help menu]
```

### Invalid Format
```bash
npm run test-detection abc
```
**Output:**
```
❌ Invalid test index: abc
   Valid indices: 1-5
[Shows help menu]
```

### Mixed Valid/Invalid
```bash
npm run test-detection 1,99,3
```
**Output:**
```
❌ Invalid test index: 99
   Valid indices: 1-5
[Shows help menu]
```

---

## 📊 Output Examples

### Single Test Output
```
============================================================
MPCBot Anti-Detection Test Suite
============================================================

✓ Created screenshots directory

⚠️  No proxies configured - testing without proxy

Running selected tests:
  1. Are You Headless

============================================================
Testing: Are You Headless
URL: https://arh.antoinevastel.com/bots/areyouheadless
Description: Tests for headless browser detection
------------------------------------------------------------
Screenshot saved: ./screenshots/detection-test-are-you-headless.png
✓ Not detected as headless

Browser will stay open for 30 seconds for manual inspection...
Test completed

============================================================
1 test completed!
[Results guide displayed]
============================================================
```

### Multiple Tests Output
```
============================================================
MPCBot Anti-Detection Test Suite
============================================================

Running selected tests:
  1. Bot Sannysoft
  2. Are You Headless
  3. Rebrowser Bot Detector

[Each test runs sequentially with 5-second delays]
============================================================
3 tests completed!
[Results guide displayed]
============================================================
```

---

## 📁 File Locations

### Configuration
- Test sites: `config/bot-detection-sites.json`
- Browser settings: `config/config.js`
- Environment: `.env`

### Scripts
- Main script: `test-detection.js`
- Package scripts: `package.json`

### Output
- Screenshots: `./screenshots/`
- Logs: `./logs/` (if logging enabled)

### Documentation
- Full guide: `BOT_DETECTION_TESTING.md`
- Quick reference: `TEST_DETECTION_QUICK_REFERENCE.md`
- This file: `CLI_USAGE_EXAMPLES.md`

---

## 💡 Tips & Tricks

1. **Use test 2 for quick checks** - Fastest way to verify headless mode
2. **Combine tests intelligently** - Mix fast and comprehensive tests
3. **Check screenshots** - Visual confirmation is crucial
4. **Run before committing** - Ensure stealth features work
5. **Test after updates** - Verify changes don't break stealth
6. **Keep proxy rotation on** - More realistic testing
7. **Compare results over time** - Track detection patterns

---

## 🔗 Related Commands

```bash
# Install browser binaries
npx patchright install chromium

# Test Google Sheets connection
npm run test-sheets

# Validate full setup
npm run test

# Start main application
npm start
```

---

**Created:** 2026-02-07  
**Last Updated:** 2026-02-07
