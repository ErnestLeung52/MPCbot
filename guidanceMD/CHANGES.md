# Configuration Changes Summary

## What Changed?

The bot now uses a centralized configuration file for all sheet and form mappings, making it much easier to switch between different sheets and update form configurations.

## New File Structure

```
MPCbot/
├── config/
│   ├── sheetMapping.js           ← NEW: All sheet/form configuration goes here
│   ├── sheetMapping.example.js   ← NEW: Example/template file
│   └── config.js                 ← UPDATED: Now imports from sheetMapping.js
├── .env                          ← UPDATED: Removed GOOGLE_SHEET_NAME
├── test-mapping.js               ← NEW: Test your configuration
├── SHEET_MAPPING_GUIDE.md        ← NEW: Detailed guide
├── QUICK_START.md                ← NEW: Quick setup guide
└── CHANGES.md                    ← This file
```

## What Was Changed?

### 1. Created `config/sheetMapping.js`

**This is now your main configuration file** for:
- Sheet name
- Column mappings (sheet columns → form fields)
- Form selectors (form fields → CSS selectors)
- State abbreviation conversions
- Data transformations

### 2. Updated `.env`

**Removed:** `GOOGLE_SHEET_NAME` (moved to `sheetMapping.js`)

**Before:**
```env
GOOGLE_SHEETS_ID=...
GOOGLE_SHEET_NAME=FB22 Int Track
GOOGLE_APPLICATION_CREDENTIALS=...
```

**After:**
```env
GOOGLE_SHEETS_ID=...
GOOGLE_APPLICATION_CREDENTIALS=...
```

### 3. Updated `config/config.js`

Now imports sheet name and form configuration from `sheetMapping.js`:

```javascript
const sheetMapping = require('./sheetMapping');

const config = {
  googleSheets: {
    sheetName: sheetMapping.SHEET_NAME,  // From sheetMapping.js
    // ...
  },
  formSelectors: sheetMapping.FORM_SELECTORS,  // From sheetMapping.js
  // ...
};
```

### 4. Updated `src/index.js`

Now uses the mapping functions to:
- Extract data from sheet rows
- Transform data (e.g., state abbreviations → full names)
- Build form data
- Build update data for writing back to sheet

**Before:**
```javascript
await formFiller.fillAndSubmit(page, {
  rowData,
  headers,
  fieldMapping,
  submitSelector,
  url: config.targetUrl
});
```

**After:**
```javascript
const extractedData = sheetMapping.extractRowData(rowData, headers);
const formData = sheetMapping.buildFormData(extractedData);

await formFiller.fillAndSubmit(page, {
  formData,
  formSelectors: sheetMapping.FORM_SELECTORS,
  submitSelector: sheetMapping.FORM_SELECTORS.submitButton,
  url: config.targetUrl
});
```

### 5. Updated `src/automation/formFiller.js`

Now accepts `formData` and `formSelectors` objects directly instead of raw row data.

## Why These Changes?

### Before (Old Way)
❌ Sheet name in `.env` (not really a secret)
❌ Column mappings scattered in code
❌ Form selectors in `config.js`
❌ Hard to see what columns map to what fields
❌ Need to edit multiple files to switch sheets

### After (New Way)
✅ Everything in ONE file: `config/sheetMapping.js`
✅ Clear mapping: field key → sheet column → form selector
✅ Easy to switch sheets: change one line
✅ Easy to update columns: update one object
✅ Built-in state conversion
✅ Better organization

## How to Use the New System

### When Switching to a New Sheet

**Edit `config/sheetMapping.js` only:**

1. **Update sheet name (line 10):**
   ```javascript
   const SHEET_NAME = 'Your New Sheet Name';
   ```

2. **Update column mappings (lines 17-34):**
   ```javascript
   const COLUMN_MAPPINGS = {
     redeemCode: 'YourColumnName',    // Match your sheet exactly
     firstName: 'YourColumnName',
     // ... etc
   };
   ```

3. **Update form selectors if website changed (lines 42-56):**
   ```javascript
   const FORM_SELECTORS = {
     redeemCode: '#your-actual-selector',
     firstName: '#your-actual-selector',
     // ... etc
   };
   ```

That's it! Everything else stays the same.

## Testing Your Configuration

### 1. Test Google Sheets Connection
```bash
node test-sheets.js
```
Should show your headers and first row.

### 2. Test Column Mappings
```bash
node test-mapping.js
```
Shows:
- Your sheet headers
- Your configured mappings
- Which columns are missing (if any)
- Data extraction test
- State conversion test

### 3. Run with One Row
```bash
npm start
```

## Migration Checklist

If you're updating from the old structure:

- [x] Created `config/sheetMapping.js` with your configuration
- [x] Removed `GOOGLE_SHEET_NAME` from `.env`
- [x] Updated `config/config.js` to import from `sheetMapping.js`
- [x] Updated `src/index.js` to use mapping functions
- [x] Updated `src/automation/formFiller.js` to accept new parameters
- [ ] **Run `test-mapping.js` to verify configuration**
- [ ] **Test with `npm start`**

## Configuration Reference

### config/sheetMapping.js Structure

```javascript
// Line 10: Sheet name
const SHEET_NAME = 'FB22 Int Track';

// Lines 17-34: Column mappings
const COLUMN_MAPPINGS = {
  // fieldKey: 'SheetColumnName'
  redeemCode: 'RedeemCode',
  firstName: 'FirstName',
  // ...
};

// Lines 42-56: Form selectors
const FORM_SELECTORS = {
  // fieldKey: 'css-selector'
  redeemCode: '#redeem-code',
  firstName: '#first-name',
  // ...
};

// Lines 64-115: State mappings (pre-configured)
const STATE_MAPPINGS = {
  'CA': 'California',
  'NY': 'New York',
  // ... all US states
};

// Helper functions (auto-generated)
function extractRowData(rowData, headers) { /* ... */ }
function buildFormData(rowData) { /* ... */ }
function buildUpdateData({ status, extractedData, error }) { /* ... */ }
```

## Key Features

### 1. Automatic State Conversion
```javascript
// Your sheet has: "CA"
// Form receives: "California"
```

### 2. Flexible Column Mapping
```javascript
// Sheet column: "First Name"
// Maps to: firstName
// Form field: #first-name
```

### 3. Optional Fields Handling
```javascript
// Apartment field is optional - skipped if empty
```

### 4. Error Handling
```javascript
// Automatically maps errors to your configured error column
```

## Examples

### Example 1: Same Structure, Different Sheet

**Only change:**
```javascript
const SHEET_NAME = 'FB23 Int Track'; // Line 10
```

### Example 2: Different Column Names

**Your sheet uses:**
```
| Code | First | Last | Address | ... |
```

**Update mappings:**
```javascript
const COLUMN_MAPPINGS = {
  redeemCode: 'Code',        // Changed
  firstName: 'First',        // Changed
  lastName: 'Last',          // Changed
  streetAddress: 'Address',  // Changed
  // ...
};
```

### Example 3: Different Website

**Update form selectors:**
```javascript
const FORM_SELECTORS = {
  redeemCode: 'input[name="code"]',      // Changed
  firstName: '#firstName',                // Changed
  lastName: '#lastName',                  // Changed
  // ...
  submitButton: 'button[type="submit"]'  // Changed
};
```

## Need Help?

### Documentation
- **Quick setup:** Read `QUICK_START.md`
- **Detailed guide:** Read `SHEET_MAPPING_GUIDE.md`
- **Original setup:** Read `guidanceMD/SETUP_GUIDE.md`

### Testing
```bash
node test-sheets.js     # Test Google Sheets connection
node test-mapping.js    # Test configuration
npm start               # Run the bot
```

### Debugging
1. Enable debug logging in `.env`:
   ```env
   LOG_LEVEL=debug
   ```

2. Run with visible browser:
   ```env
   HEADLESS=false
   ```

3. Check logs:
   ```bash
   tail -f logs/combined.log
   ```

## Summary

**One file to rule them all:** `config/sheetMapping.js`

When you need to switch sheets or update form configuration:
1. Edit `config/sheetMapping.js`
2. Test with `test-mapping.js`
3. Run with `npm start`

That's it! 🎉
