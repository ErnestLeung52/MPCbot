# Bot Detection Tests - Quick Reference

## 🚀 Quick Commands

```bash
# Run ALL tests (3-4 minutes)
npm run test-detection

# Run SINGLE test (~40 seconds each)
npm run test-detection 1    # Bot Sannysoft
npm run test-detection 2    # Are You Headless
npm run test-detection 3    # PixelScan
npm run test-detection 4    # Fingerprint Scan
npm run test-detection 5    # Rebrowser Bot Detector

# Run MULTIPLE tests
npm run test-detection 1,2     # Quick headless check
npm run test-detection 1,3,5   # Comprehensive check
npm run test-detection 2,5     # Modern detection tools

# Show available tests
npm run test-detection:list
npm run test-detection -- --help
```

## 📋 Test Index

| # | Test Name | URL | What It Tests |
|---|-----------|-----|---------------|
| **1** | Bot Sannysoft | bot.sannysoft.com | Navigator properties, webdriver flags, plugins |
| **2** | Are You Headless | arh.antoinevastel.com | Headless browser detection |
| **3** | PixelScan | pixelscan.net | Browser fingerprinting, bot scoring |
| **4** | Fingerprint Scan | fingerprint-scan.com | Canvas/WebGL fingerprinting |
| **5** | Rebrowser Bot Detector | bot-detector.rebrowser.net | Puppeteer/Playwright detection |

## 🎯 Recommended Test Combinations

### Quick Check (< 1 minute)
```bash
npm run test-detection 2    # Just headless detection
```

### Standard Check (~2 minutes)
```bash
npm run test-detection 1,2,5    # Core detection tests
```

### Full Check (~4 minutes)
```bash
npm run test-detection    # All 5 tests
```

### Fingerprinting Focus
```bash
npm run test-detection 3,4    # Fingerprinting only
```

### Modern Tools Only
```bash
npm run test-detection 2,5    # Latest detection methods
```

## ✅ What "Passing" Looks Like

### Test 1: Bot Sannysoft
- ✅ `navigator.webdriver` = false/undefined
- ✅ Zero or minimal FAILED tests
- ✅ Plugins detected
- ✅ Chrome properties match real browser

### Test 2: Are You Headless
- ✅ **"You are not Chrome headless"** (in green)
- ✅ All checks pass

### Test 3: PixelScan
- ✅ Bot Score: 0 or very low
- ✅ Fingerprint consistency: High
- ✅ No red automation flags

### Test 4: Fingerprint Scan
- ✅ Normal browser fingerprint
- ✅ Canvas/WebGL working properly
- ✅ No tracking anomalies

### Test 5: Rebrowser Bot Detector
- ✅ Detection count: 0 or minimal
- ✅ All tests green/passing
- ✅ No function exposure leaks

## 🔴 Red Flags (What to Fix)

| Red Flag | Meaning | Severity |
|----------|---------|----------|
| "You are headless" | Headless mode detected | 🔴 CRITICAL |
| `navigator.webdriver = true` | Automation detected | 🔴 CRITICAL |
| Zero plugins | Missing browser features | 🟡 MEDIUM |
| High bot score (>50) | Multiple indicators failed | 🔴 CRITICAL |
| Canvas fingerprint mismatch | Inconsistent rendering | 🟡 MEDIUM |
| Function exposure leaks | Playwright/Puppeteer detected | 🟡 MEDIUM |

## 📸 Screenshots Location

All test screenshots are automatically saved to:
```
./screenshots/detection-test-[site-name].png
```

Examples:
- `screenshots/detection-test-bot-sannysoft.png`
- `screenshots/detection-test-are-you-headless.png`
- `screenshots/detection-test-pixelscan.png`
- `screenshots/detection-test-fingerprint-scan.png`
- `screenshots/detection-test-rebrowser-bot-detector.png`

## ⏱️ Time Estimates

| Tests | Duration | Use Case |
|-------|----------|----------|
| 1 test | ~40 sec | Quick single check |
| 2 tests | ~1.5 min | Fast verification |
| 3 tests | ~2.5 min | Standard check |
| 5 tests | ~4 min | Full comprehensive test |

## 🛠️ Current Configuration

Your setup (optimized for safety):
- **Mode**: Headful (`HEADLESS=false`) ✅
- **Delays**: 1-3 seconds (human-like) ✅
- **Typing**: 80-200ms per keystroke ✅
- **Stealth**: Patchright patches active ✅

## 💡 Pro Tips

1. **Start with test 2** - Quick headless check (40 seconds)
2. **Run test 1 next** - Comprehensive check (40 seconds)
3. **Add test 5** - Modern detection validation
4. **Use selective testing** - Save time during development
5. **Run full suite** - Before production deployment
6. **Check screenshots** - Visual confirmation of results
7. **Compare over time** - Keep old screenshots for reference

## 🔄 Typical Workflow

**Development Phase:**
```bash
npm run test-detection 2    # Quick headless check after changes
```

**Testing Phase:**
```bash
npm run test-detection 1,2,5    # Core verification
```

**Pre-Production:**
```bash
npm run test-detection    # Full comprehensive test
```

## 📞 Need Help?

- Review screenshots in `./screenshots/` directory
- Check `BOT_DETECTION_TESTING.md` for detailed guides
- Ensure `HEADLESS=false` in `.env` file
- Verify patchright is installed: `npx patchright install chromium`

## 🎨 Command Examples

```bash
# Development - Quick iteration
npm run test-detection 2

# Testing - Core checks
npm run test-detection 1,2

# Production - Full validation  
npm run test-detection

# Troubleshooting - Specific test
npm run test-detection 1    # If seeing detection issues

# Fingerprinting issues
npm run test-detection 3,4

# Modern detection concerns
npm run test-detection 5
```

---

**Last Updated:** 2026-02-07
