# Refactoring Notes: Data Sanitization, Card Extraction & Status Tracking

## Overview

This document explains the recent refactoring focused on:
1. Data sanitization before form submission
2. Extracting specific card data (Amount, CardNumber, Exp, CVV)
3. Status tracking with "In Progress" indicator

## Changes Made

### 1. Data Sanitization

**Location:** `config/sheetMapping.js`

Added a new `sanitizeRowData()` function that processes data before form submission:

```javascript
function sanitizeRowData(rowData) {
  // Basic sanitization implemented: trim whitespace
  // TODO: Add specific sanitization rules as needed
  
  const sanitized = { ...rowData };
  
  // Trim all string values
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    }
  }
  
  return sanitized;
}
```

**Usage:** Automatically called in `buildFormData()` before form data is prepared.

**Where to add custom sanitization:**
- Open `config/sheetMapping.js`
- Find the `sanitizeRowData()` function (around line 195)
- Add your custom logic inside the function

**Examples of sanitization you might add:**
```javascript
// Remove special characters from phone
if (sanitized.phone) {
  sanitized.phone = sanitized.phone.replace(/\D/g, '');
}

// Format zip code (remove spaces, dashes)
if (sanitized.zipCode) {
  sanitized.zipCode = sanitized.zipCode.replace(/[^0-9]/g, '');
}

// Uppercase state codes
if (sanitized.state) {
  sanitized.state = sanitized.state.toUpperCase();
}

// Validate and clean email
if (sanitized.email) {
  sanitized.email = sanitized.email.toLowerCase().trim();
}
```

### 2. Card Data Extraction

**Updated Columns in Google Sheet:**

Your sheet now needs these **output columns**:
- `Status` - Processing status (In Progress, Success, Failed)
- `Amount` - Card amount
- `CardNumber` - Card number
- `Exp` - Card expiration date
- `CVV` - Card CVV code
- `Timestamp` - When the task completed
- `Error` - Error message (if failed)

**Removed:**
- `ResultData` column (no longer needed)

**Column Mappings Updated:**
```javascript
// In config/sheetMapping.js
const COLUMN_MAPPINGS = {
  // ... input columns ...
  
  // Output columns (NEW)
  status: 'Status',
  amount: 'Amount',          // NEW
  cardNumber: 'CardNumber',  // NEW
  exp: 'Exp',                // NEW
  cvv: 'CVV',                // NEW
  timestamp: 'Timestamp',
  error: 'Error'
};
```

**Extraction Configuration:**

Update `config/config.js` to specify where the card data appears on the webpage:

```javascript
iframeSelectors: {
  // If data is in an iframe, uncomment one:
  // iframeSelector: '#result-iframe',
  // iframeIndex: 1,
  
  fields: {
    amount: '#card-amount',        // TODO: Update selector
    cardNumber: '#card-number',    // TODO: Update selector
    exp: '#card-exp',              // TODO: Update selector
    cvv: '#card-cvv'               // TODO: Update selector
  }
}
```

**How to find selectors:**
1. Submit form manually on the target website
2. When card data appears, right-click on each field → Inspect
3. Find the element's `id`, `class`, or `name`
4. Update the selectors in `config/config.js`

### 3. Status Tracking

**New Status Flow:**

1. **"In Progress"** - Set when task begins (before browser launches)
2. **"Success"** - Set when task completes successfully
3. **"Failed"** - Set when an error occurs

**Implementation:**

In `src/index.js`, status is now updated at the beginning of each task:

```javascript
// At the start of processTask()
await googleSheets.updateRow(rowIndex, sheetMapping.buildUpdateData({
  status: 'In Progress'
}));
```

This allows you to track which rows are currently being processed if the bot stops or crashes.

**Status Column Values:**
- `In Progress` - Task started but not finished
- `Success` - Task completed successfully, card data extracted
- `Failed` - Task encountered an error

## Updated Google Sheet Structure

Your Google Sheet should now look like this:

### Input Columns (data you provide):
| RedeemCode2 | First | Last | Address | Apartment | City | State | ZipCode | Phone | Email |

### Output Columns (bot fills these):
| Status | Amount | CardNumber | Exp | CVV | Timestamp | Error |

**Example row:**
```
Input: ABC123 | John | Doe | 123 Main | Apt 4 | NYC | NY | 10001 | 555-0100 | john@ex.com
Output: Success | $50.00 | 1234567890123456 | 12/25 | 123 | 2026-02-08T10:30:00Z | 
```

## Workflow Changes

### Previous Workflow:
1. Fetch row data
2. Fill form
3. Extract generic "ResultData"
4. Update sheet with status

### New Workflow:
1. Fetch row data
2. **Update status to "In Progress"** ← NEW
3. **Sanitize data** ← NEW
4. Fill form
5. **Extract specific card data (Amount, CardNumber, Exp, CVV)** ← CHANGED
6. Update sheet with success status and card data

## Files Modified

### 1. `config/sheetMapping.js`
- Added `sanitizeRowData()` function
- Updated `COLUMN_MAPPINGS` with card fields
- Updated `buildFormData()` to use sanitization
- Updated `buildUpdateData()` to handle card data
- Exported `sanitizeRowData` function

### 2. `src/index.js`
- Added status update to "In Progress" at task start
- Added sanitization step before form filling
- Changed extraction from generic to card-specific
- Updated logging to show extracted card data
- Renamed variables for clarity (iframeData → cardData)

### 3. `config/config.js`
- Updated `iframeSelectors` configuration
- Added comments for card data fields
- Removed generic result extraction config

### 4. `config/sheetMapping.example.js`
- Updated to match the new structure

## Testing Your Changes

### Step 1: Update Your Google Sheet

Add these columns to your sheet (if they don't exist):
- `Status`
- `Amount`
- `CardNumber`
- `Exp`
- `CVV`
- `Timestamp`
- `Error`

### Step 2: Update Column Mappings

If your column names are different, update `config/sheetMapping.js`:

```javascript
const COLUMN_MAPPINGS = {
  // ... input columns ...
  
  status: 'YourStatusColumnName',
  amount: 'YourAmountColumnName',
  cardNumber: 'YourCardNumberColumnName',
  exp: 'YourExpColumnName',
  cvv: 'YourCVVColumnName',
  // ... etc
};
```

### Step 3: Find Card Data Selectors

1. Open your target website
2. Submit form manually
3. When card data appears, inspect elements
4. Update `config/config.js` with actual selectors:

```javascript
iframeSelectors: {
  fields: {
    amount: '#actual-amount-selector',
    cardNumber: '#actual-card-selector',
    exp: '#actual-exp-selector',
    cvv: '#actual-cvv-selector'
  }
}
```

### Step 4: Test Configuration

```bash
node test-mapping.js
```

This should show:
- ✓ All columns found (including Amount, CardNumber, Exp, CVV)
- ✓ Data sanitization working (trimmed values)

### Step 5: Test with One Row

Edit your sheet to have only 1 data row, then:

```bash
npm start
```

Watch for:
1. Status changes to "In Progress"
2. Form fills with sanitized data
3. Card data is extracted
4. Status changes to "Success"
5. All 4 card fields are populated in the sheet

## Adding Custom Sanitization

To add specific sanitization rules:

1. Open `config/sheetMapping.js`
2. Find the `sanitizeRowData()` function
3. Add your custom logic:

```javascript
function sanitizeRowData(rowData) {
  const sanitized = { ...rowData };
  
  // Trim all strings (already implemented)
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    }
  }
  
  // YOUR CUSTOM SANITIZATION HERE:
  
  // Example: Format phone to digits only
  if (sanitized.phone) {
    sanitized.phone = sanitized.phone.replace(/\D/g, '');
  }
  
  // Example: Clean zip code
  if (sanitized.zipCode) {
    sanitized.zipCode = sanitized.zipCode.replace(/[^0-9]/g, '').slice(0, 5);
  }
  
  // Example: Normalize email
  if (sanitized.email) {
    sanitized.email = sanitized.email.toLowerCase().trim();
  }
  
  // Example: Remove apartment prefixes
  if (sanitized.apartment) {
    sanitized.apartment = sanitized.apartment
      .replace(/^(apt|apartment|unit|#)\s*/i, '')
      .trim();
  }
  
  return sanitized;
}
```

## Status Tracking Use Cases

### Monitoring Progress
Check your Google Sheet to see which rows are being processed:
- Rows with "In Progress" = currently processing or interrupted
- Rows with "Success" = completed successfully
- Rows with "Failed" = encountered errors
- Empty status = not yet started

### Resuming After Interruption
If the bot crashes or is stopped:
1. Look for rows with "In Progress" status
2. These were interrupted mid-process
3. You may want to clear their status and retry

### Error Analysis
Rows with "Failed" status will have error messages in the `Error` column to help you debug.

## Troubleshooting

### "Column not found" errors
- Run `node test-mapping.js` to see which columns are missing
- Update `COLUMN_MAPPINGS` in `config/sheetMapping.js` to match your sheet

### Card data not extracting
- Check that selectors in `config/config.js` are correct
- Use browser DevTools to inspect the actual elements
- Check if data is in an iframe (configure `iframeSelector` or `iframeIndex`)

### Status not updating
- Verify the `Status` column exists in your sheet
- Check `COLUMN_MAPPINGS.status` points to the correct column name
- Check logs for Google Sheets API errors

### Sanitization not working
- Add `LOG_LEVEL=debug` to `.env`
- Check logs for "Sanitizing row data" message
- Add console.log() in `sanitizeRowData()` to debug

## Summary

**What changed:**
1. ✅ Data sanitization added (customizable)
2. ✅ Card extraction streamlined (Amount, CardNumber, Exp, CVV only)
3. ✅ Status tracking with "In Progress" indicator
4. ✅ Removed generic "ResultData" field

**What you need to do:**
1. Update your Google Sheet columns (add Amount, CardNumber, Exp, CVV)
2. Update column mappings if your column names differ
3. Find and update card data selectors in `config/config.js`
4. Add custom sanitization rules as needed
5. Test with one row before running full automation

**Files to configure:**
- `config/sheetMapping.js` - Column mappings and custom sanitization
- `config/config.js` - Card data selectors

Everything else is handled automatically! 🎉
