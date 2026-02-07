# Google Sheet Mapping Configuration Guide

This guide explains how to configure the bot to work with different Google Sheets by modifying the `config/sheetMapping.js` file.

## Overview

All sheet-related configuration is now centralized in **`config/sheetMapping.js`**. This makes it easy to:
- Switch between different Google Sheets
- Map your sheet columns to form fields
- Handle data transformations (e.g., state abbreviations)
- Update form selectors

## Quick Start

When you need to use a different Google Sheet, follow these steps:

### 1. Update Sheet Name

```javascript
// In config/sheetMapping.js, line 10
const SHEET_NAME = 'Your New Sheet Name'; // Change this
```

### 2. Update Column Mappings

Match your Google Sheet's column headers:

```javascript
// In config/sheetMapping.js, COLUMN_MAPPINGS section
const COLUMN_MAPPINGS = {
  // Change the VALUES (right side) to match YOUR sheet's column headers
  redeemCode: 'RedeemCode',        // If your column is named "Code", change to 'Code'
  firstName: 'FirstName',          // If your column is named "First", change to 'First'
  lastName: 'LastName',            // etc.
  streetAddress: 'StreetAddress',
  apartment: 'Apartment',
  city: 'City',
  state: 'State',
  zipCode: 'ZipCode',
  phone: 'Phone',
  email: 'Email',
  
  // Output columns
  status: 'Status',
  result: 'ResultData',
  timestamp: 'Timestamp',
  error: 'Error'
};
```

### 3. Update Form Selectors (if needed)

If the target website changes, update the CSS selectors:

```javascript
// In config/sheetMapping.js, FORM_SELECTORS section
const FORM_SELECTORS = {
  redeemCode: '#redeem-code',        // Update with actual selector
  firstName: '#first-name',
  lastName: '#last-name',
  // ... etc
  submitButton: '#submit-button'     // Important: submit button selector
};
```

## Detailed Configuration

### Sheet Structure

Your Google Sheet should have:

**Row 1: Headers (column names)**
```
| RedeemCode | FirstName | LastName | StreetAddress | Apartment | City | State | ZipCode | Phone | Email | Status | ResultData | Timestamp | Error |
```

**Row 2+: Data**
```
| ABC123 | John | Doe | 123 Main St | Apt 4 | New York | NY | 10001 | 555-0100 | john@example.com | | | | |
```

### Column Mappings Explained

The `COLUMN_MAPPINGS` object maps **field keys** (left side) to **sheet column names** (right side):

```javascript
const COLUMN_MAPPINGS = {
  // fieldKey: 'SheetColumnName'
  firstName: 'FirstName',  // fieldKey is used in code, SheetColumnName must match your sheet
};
```

**Example: If your sheet uses different column names**

Your sheet:
```
| Code | First | Last | Address | City | ... |
```

Update mapping:
```javascript
const COLUMN_MAPPINGS = {
  redeemCode: 'Code',          // Changed from 'RedeemCode' to 'Code'
  firstName: 'First',          // Changed from 'FirstName' to 'First'
  lastName: 'Last',            // Changed from 'LastName' to 'Last'
  streetAddress: 'Address',    // Changed from 'StreetAddress' to 'Address'
  // ... etc
};
```

### Form Selectors Explained

The `FORM_SELECTORS` object maps **field keys** to **CSS selectors**:

```javascript
const FORM_SELECTORS = {
  // fieldKey: 'css-selector'
  firstName: '#first-name',  // The selector for the first name input field
};
```

**How to find CSS selectors:**

1. Open the target website in Chrome
2. Right-click on the form field → "Inspect"
3. Look for `id`, `name`, or `class` attributes
4. Create selector:
   - `id="first-name"` → `#first-name`
   - `name="email"` → `[name="email"]`
   - `class="input-field"` → `.input-field`

### State Abbreviation Conversion

The bot automatically converts state abbreviations (e.g., "CA") to full names (e.g., "California") before filling the form.

**If your form accepts abbreviations:**

Modify the `buildFormData` function:

```javascript
// In config/sheetMapping.js, buildFormData function
function buildFormData(rowData) {
  return {
    // ... other fields
    state: rowData.state, // Remove the convertStateToFullName() call
    // ... other fields
  };
}
```

**If you need to add more states:**

Add them to the `STATE_MAPPINGS` object:

```javascript
const STATE_MAPPINGS = {
  'CA': 'California',
  'NY': 'New York',
  // Add more as needed
};
```

## Example Scenarios

### Scenario 1: New Sheet with Same Structure

You have a new sheet "FB23 Int Track" with the same column structure.

**Change only:**
```javascript
const SHEET_NAME = 'FB23 Int Track'; // Line 10
```

### Scenario 2: New Sheet with Different Column Names

Your new sheet uses:
```
| Code | FName | LName | Addr | Suite | Town | ST | Postal | Tel | Mail |
```

**Update column mappings:**
```javascript
const COLUMN_MAPPINGS = {
  redeemCode: 'Code',
  firstName: 'FName',
  lastName: 'LName',
  streetAddress: 'Addr',
  apartment: 'Suite',
  city: 'Town',
  state: 'ST',
  zipCode: 'Postal',
  phone: 'Tel',
  email: 'Mail',
  
  // Output columns (update these too if different)
  status: 'Status',
  result: 'Result',
  timestamp: 'ProcessedAt',
  error: 'ErrorMessage'
};
```

### Scenario 3: Different Website Form

The target website changed and uses different CSS selectors.

**Update form selectors:**
```javascript
const FORM_SELECTORS = {
  redeemCode: 'input[name="code"]',        // New selector
  firstName: '#firstName',                  // New selector
  lastName: '#lastName',                    // New selector
  streetAddress: '#address1',               // New selector
  apartment: '#address2',                   // New selector
  city: '#city',                            // New selector
  state: 'select[name="state"]',            // New selector (dropdown)
  zipCode: '#postalCode',                   // New selector
  phone: 'input[type="tel"]',               // New selector
  email: '#emailAddress',                   // New selector
  submitButton: 'button[type="submit"]'     // New selector
};
```

## Testing Your Configuration

### Test 1: Verify Sheet Connection

```bash
node test-sheets.js
```

This should print your sheet headers and first row.

### Test 2: Check Column Mapping

Add this test script `test-mapping.js`:

```javascript
require('dotenv').config();
const sheetMapping = require('./config/sheetMapping');
const googleSheets = require('./src/services/googleSheets');

async function test() {
  await googleSheets.initialize();
  
  const headers = await googleSheets.getHeaders();
  const rows = await googleSheets.fetchRows();
  
  console.log('Sheet Headers:', headers);
  console.log('Column Mappings:', sheetMapping.COLUMN_MAPPINGS);
  
  // Extract first row
  const extractedData = sheetMapping.extractRowData(rows[0], headers);
  console.log('Extracted Data:', extractedData);
  
  // Build form data
  const formData = sheetMapping.buildFormData(extractedData);
  console.log('Form Data:', formData);
}

test().catch(console.error);
```

Run:
```bash
node test-mapping.js
```

Verify that:
- All your sheet columns are correctly mapped
- State abbreviations are converted (e.g., "CA" → "California")
- All required fields have values

### Test 3: Run with One Row

Modify your sheet to have only 1 data row, then run:

```bash
npm start
```

Watch for errors and verify the form is filled correctly.

## Troubleshooting

### Error: "Column not found in headers"

**Problem:** The column name in `COLUMN_MAPPINGS` doesn't match your sheet.

**Solution:** 
1. Run `test-sheets.js` to see your actual headers
2. Update `COLUMN_MAPPINGS` to match exactly (case-sensitive)

### Error: "Element not found" or timeout

**Problem:** The CSS selector in `FORM_SELECTORS` is incorrect.

**Solution:**
1. Open target website in browser
2. Inspect the form field
3. Test selector in Console: `document.querySelector('#your-selector')`
4. Update `FORM_SELECTORS` with working selector

### State Not Converting

**Problem:** State abbreviation isn't being converted to full name.

**Solution:**
1. Check if abbreviation is in `STATE_MAPPINGS`
2. Verify the state data is in the correct column
3. Check the `buildFormData` function is calling `convertStateToFullName()`

### Optional Fields Causing Errors

**Problem:** Empty apartment/suite field causes form to fail.

**Solution:**
The code already handles this (skips empty apartment fields). If other fields should be optional, update `fillForm`:

```javascript
// In src/automation/formFiller.js, fillForm method
// Add more optional fields
if (!value && (fieldKey === 'apartment' || fieldKey === 'yourOptionalField')) {
  logger.debug(`Skipping optional field "${fieldKey}" (empty)`);
  continue;
}
```

## Advanced Customization

### Adding New Fields

If you need to add a new field:

1. **Add to column mapping:**
```javascript
const COLUMN_MAPPINGS = {
  // ... existing mappings
  companyName: 'Company', // New field
};
```

2. **Add to form selector:**
```javascript
const FORM_SELECTORS = {
  // ... existing selectors
  companyName: '#company-name', // New selector
};
```

3. **Add to form data builder:**
```javascript
function buildFormData(rowData) {
  return {
    // ... existing fields
    companyName: rowData.companyName, // New field
  };
}
```

### Custom Data Transformations

If you need custom transformations (like state conversion), add them to `buildFormData`:

```javascript
function buildFormData(rowData) {
  return {
    // ... other fields
    
    // Example: Format phone number
    phone: formatPhoneNumber(rowData.phone),
    
    // Example: Uppercase state
    state: rowData.state.toUpperCase(),
    
    // Example: Clean zip code
    zipCode: rowData.zipCode.replace(/[^0-9]/g, ''),
  };
}

// Add helper function
function formatPhoneNumber(phone) {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  // Format as (XXX) XXX-XXXX
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`;
}
```

## File Reference

All configuration happens in one file:

```
config/
  └── sheetMapping.js    ← Edit this file for all sheet/form configuration
```

Key sections in `sheetMapping.js`:
- **Line 10**: `SHEET_NAME` - Change sheet name here
- **Lines 17-34**: `COLUMN_MAPPINGS` - Map sheet columns
- **Lines 42-56**: `FORM_SELECTORS` - Map form field selectors
- **Lines 64-115**: `STATE_MAPPINGS` - State abbreviation mappings
- **Lines 164-181**: `buildFormData()` - Customize data transformations

## Summary Checklist

When switching to a new sheet:

- [ ] Update `SHEET_NAME` (line 10)
- [ ] Update `COLUMN_MAPPINGS` to match your sheet's headers
- [ ] Update `FORM_SELECTORS` if target website changed
- [ ] Test with `test-sheets.js`
- [ ] Test with `test-mapping.js`
- [ ] Run with one row: `npm start`
- [ ] Verify form fills correctly
- [ ] Check Google Sheet updates with correct data

## Need Help?

1. Enable debug logging in `.env`:
   ```env
   LOG_LEVEL=debug
   ```

2. Run with visible browser:
   ```env
   HEADLESS=false
   ```

3. Check logs in `logs/combined.log`

4. Review screenshots in `screenshots/` (if errors occur)
