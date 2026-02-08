# Quick Reference: Refactored System

## What Changed? (In 30 Seconds)

### 1. **Data Sanitization** ✨
Data is now cleaned before filling forms (trim whitespace, etc.)
- **Where to customize:** `config/sheetMapping.js` → `sanitizeRowData()` function

### 2. **Card Data Only** 💳
Now extracts only 4 fields:
- Amount
- CardNumber
- Exp (Expiration)
- CVV

### 3. **Status Tracking** 📊
Status updates when task starts:
- "In Progress" → Task started
- "Success" → Completed
- "Failed" → Error occurred

---

## Your Google Sheet Structure

### Required Columns:

**Input Columns** (you fill these):
```
| RedeemCode2 | First | Last | Address | Apartment | City | State | ZipCode | Phone | Email |
```

**Output Columns** (bot fills these):
```
| Status | Amount | CardNumber | Exp | CVV | Timestamp | Error |
```

**Note:** If your column names are different, update them in `config/sheetMapping.js` → `COLUMN_MAPPINGS`

---

## Configuration Files

### 1. `config/sheetMapping.js` (MAIN CONFIG)

**Update these sections:**

**Line 10 - Sheet Name:**
```javascript
const SHEET_NAME = 'Your Sheet Name';
```

**Lines 22-40 - Column Mappings:**
```javascript
const COLUMN_MAPPINGS = {
  // Input
  redeemCode: 'YourColumnName',
  firstName: 'YourColumnName',
  // ... etc
  
  // Output (NEW)
  status: 'Status',
  amount: 'Amount',        // NEW
  cardNumber: 'CardNumber', // NEW
  exp: 'Exp',              // NEW
  cvv: 'CVV',              // NEW
  timestamp: 'Timestamp',
  error: 'Error'
};
```

**Lines 190-220 - Custom Sanitization:**
```javascript
function sanitizeRowData(rowData) {
  // Add your custom sanitization here
  // Example: Format phone numbers, clean zip codes, etc.
}
```

### 2. `config/config.js`

**Update card data selectors:**
```javascript
iframeSelectors: {
  fields: {
    amount: '#actual-amount-selector',      // TODO: Update
    cardNumber: '#actual-card-selector',    // TODO: Update
    exp: '#actual-exp-selector',            // TODO: Update
    cvv: '#actual-cvv-selector'             // TODO: Update
  }
}
```

---

## How to Find Card Data Selectors

1. Open target website in Chrome
2. Submit form manually
3. When card data appears, **right-click each field** → "Inspect"
4. Find the `id`, `class`, or `name`:
   ```html
   <div id="card-amount">$50.00</div>
   <span class="card-number">1234...</span>
   ```
5. Create CSS selector:
   - `id="card-amount"` → `#card-amount`
   - `class="card-number"` → `.card-number`
   - `name="amount"` → `[name="amount"]`

6. Update `config/config.js` with these selectors

---

## Testing Checklist

### ☑️ Step 1: Verify Sheet Columns
Make sure your Google Sheet has these columns:
- [ ] Status
- [ ] Amount
- [ ] CardNumber
- [ ] Exp
- [ ] CVV
- [ ] Timestamp
- [ ] Error

### ☑️ Step 2: Update Column Mappings
If your columns have different names, update `config/sheetMapping.js`

### ☑️ Step 3: Test Configuration
```bash
node test-mapping.js
```

**Should show:**
- ✓ All columns found
- ✓ Data extraction works
- ✓ Sanitization example
- ✓ Update data includes Amount, CardNumber, Exp, CVV

### ☑️ Step 4: Find & Update Card Selectors
1. Manually submit form on target website
2. Find selectors for: Amount, CardNumber, Exp, CVV
3. Update `config/config.js`

### ☑️ Step 5: Test with One Row
```bash
npm start
```

**Watch for:**
1. Status changes to "In Progress" ✓
2. Form fills correctly ✓
3. Card data extracted ✓
4. Status changes to "Success" ✓
5. All 4 fields populated in sheet ✓

---

## Adding Custom Sanitization

**File:** `config/sheetMapping.js`
**Function:** `sanitizeRowData()` (around line 195)

**Examples:**

```javascript
function sanitizeRowData(rowData) {
  const sanitized = { ...rowData };
  
  // Trim whitespace (already implemented)
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    }
  }
  
  // FORMAT PHONE: Remove all non-digits
  if (sanitized.phone) {
    sanitized.phone = sanitized.phone.replace(/\D/g, '');
  }
  
  // CLEAN ZIP CODE: Keep only first 5 digits
  if (sanitized.zipCode) {
    sanitized.zipCode = sanitized.zipCode.replace(/[^0-9]/g, '').slice(0, 5);
  }
  
  // NORMALIZE EMAIL: Lowercase and trim
  if (sanitized.email) {
    sanitized.email = sanitized.email.toLowerCase().trim();
  }
  
  // CLEAN APARTMENT: Remove "Apt", "#", etc.
  if (sanitized.apartment) {
    sanitized.apartment = sanitized.apartment
      .replace(/^(apt|apartment|unit|#)\s*/i, '')
      .trim();
  }
  
  // UPPERCASE STATE
  if (sanitized.state) {
    sanitized.state = sanitized.state.toUpperCase();
  }
  
  return sanitized;
}
```

---

## Status Flow

```
Empty → In Progress → Success
                   └→ Failed
```

**Empty:** Not started yet
**In Progress:** Currently processing (or interrupted)
**Success:** Completed, card data saved
**Failed:** Error occurred (see Error column)

---

## Workflow

### Before (Old):
1. Fetch row
2. Fill form
3. Extract generic data
4. Update sheet

### Now (New):
1. Fetch row
2. **Mark "In Progress"** ⬅️ NEW
3. **Sanitize data** ⬅️ NEW
4. Fill form
5. **Extract 4 card fields only** ⬅️ CHANGED
6. Update sheet with card data

---

## Common Issues

### ❌ "Column not found"
**Fix:** Run `node test-mapping.js` to see which columns are missing, then update `COLUMN_MAPPINGS`

### ❌ Card data not extracting
**Fix:** 
1. Check selectors in `config/config.js`
2. Inspect webpage to verify selectors
3. Check if data is in iframe (set `iframeIndex` or `iframeSelector`)

### ❌ Status not updating
**Fix:**
1. Verify "Status" column exists in sheet
2. Check `COLUMN_MAPPINGS.status` is correct
3. Check Google Sheets API permissions

### ❌ Sanitization not working
**Fix:**
1. Set `LOG_LEVEL=debug` in `.env`
2. Check logs for "Sanitizing row data"
3. Add `console.log()` in `sanitizeRowData()` to debug

---

## File Locations

```
config/
  ├── sheetMapping.js    ← Main config (sheet name, columns, sanitization)
  └── config.js          ← Card data selectors

test-mapping.js          ← Run this to test configuration

REFACTORING_NOTES.md     ← Detailed documentation
```

---

## Summary

**3 Things You Must Do:**

1. **Update your Google Sheet:**
   Add columns: Status, Amount, CardNumber, Exp, CVV, Timestamp, Error

2. **Update column mappings** (if names differ):
   Edit `config/sheetMapping.js` → `COLUMN_MAPPINGS`

3. **Update card data selectors:**
   Edit `config/config.js` → `iframeSelectors.fields`

**Optional:**
4. Add custom sanitization in `sanitizeRowData()` function

**Test:**
```bash
node test-mapping.js   # Verify configuration
npm start              # Run with one row
```

Done! 🎉

---

## Need More Details?

📖 Read `REFACTORING_NOTES.md` for comprehensive documentation

🚀 Run `node test-mapping.js` to verify your setup

💡 Check logs with `LOG_LEVEL=debug` for troubleshooting
