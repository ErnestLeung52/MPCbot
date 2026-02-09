# Task Filtering Logic Guide

## Overview

The bot now intelligently filters which rows to process from your Google Sheet based on **Status** and **RedeemCode** columns. This prevents reprocessing completed tasks and skips rows without valid redeem codes.

## How It Works

### Processing Order
- Rows are scanned **from top to bottom** in your sheet
- Each row is evaluated against filtering rules
- Only valid tasks are processed

### Filtering Rules

The bot checks each row in this order:

#### ✅ Valid Task (Will Process)
A row is processed if **ALL** these conditions are met:
1. ✓ RedeemCode is exactly **12 characters** (after trimming whitespace)
2. ✓ Status is **empty** (not processed yet)
3. ✓ Email is **present**
4. ✓ FirstName and LastName are **present**

#### ❌ Skipped Tasks (Will NOT Process)

A row is skipped if **ANY** of these apply:

| Condition | Reason | Example |
|-----------|--------|---------|
| **Row is completely empty** | No data to process | All cells are blank |
| **Both RedeemCode and Status are empty** | No code to redeem | `RedeemCode: ""`, `Status: ""` |
| **RedeemCode is not 12 characters** | Invalid code format | `RedeemCode: "ABC123"` (only 6 chars) |
| **Status is not empty** | Already processed/in progress/failed | `Status: "Success"` or `"In Progress"` or `"Failed"` |
| **Email is missing** | Cannot identify task | `Email: ""` |
| **FirstName or LastName is missing** | Cannot fill form | `FirstName: ""` or `LastName: ""` |

## Example Google Sheet

| Email | RedeemCode2 | FirstName | LastName | Status | Result |
|-------|-------------|-----------|----------|--------|--------|
| john@ex.com | ABC123456789 | John | Doe | | | ← **✓ VALID** (12 chars, empty status)
| jane@ex.com | | Jane | Smith | | | ← **✗ SKIP** (no code)
| bob@ex.com | XYZ987654321 | Bob | Jones | Success | Done | ← **✗ SKIP** (already processed)
| alice@ex.com | SHORT | Alice | Brown | | | ← **✗ SKIP** (not 12 chars)
| mike@ex.com | DEF147258369 | Mike | Wilson | In Progress | | ← **✗ SKIP** (has status)
| | | | | | | ← **✗ SKIP** (empty row)
| sara@ex.com | GHI753951456 | Sara | Lee | | | ← **✓ VALID** (12 chars, empty status)
| tim@ex.com | JKL321654987 | | | | | ← **✗ SKIP** (missing name)
| amy@ex.com | MNO147852369 | Amy | Clark | Failed | Error | ← **✗ SKIP** (has status)

**Result:** Bot processes **2 tasks** (john@ex.com and sara@ex.com)

## Status Values and Behavior

### Empty Status → Will Process
```
Status: "" (empty cell)
```
Bot will process this task.

### Any Status → Will Skip
```
Status: "Success"
Status: "In Progress"
Status: "Failed"
Status: "Completed"
Status: "Error"
Status: "anything else"
```
Bot will skip all of these (regardless of the status text).

### How to Retry a Failed/Stuck Task

If you want to retry a task that failed or got stuck:
1. Open your Google Sheet
2. Find the row
3. **Clear the Status cell** (make it empty)
4. Run the bot again

The bot will now see the empty status and process it again.

## Logging Output

### When Bot Starts

You'll see detailed filtering information:

```
Fetching data from Google Sheets...
Found 50 total row(s) in sheet

Scanning rows for valid tasks...
Row 2 (john@example.com): ✓ Valid task found - RedeemCode: ABC123456789
Row 3: Skipping - No redeem code
Row 4 (bob@example.com): Skipping - Already processed (Status: "Success")
Row 5: Skipping - Invalid redeem code length (6 chars, expected 12)
...

============================================================
Task Filtering Summary:
------------------------------------------------------------
  Total rows in sheet: 50
  Valid tasks to process: 2
  Skipped - No redeem code: 10
  Skipped - Invalid code length: 3
  Skipped - Already processed: 35
  Skipped - Missing required data: 0
============================================================

Starting processing of 2 valid task(s)...

============================================================
TASK 1/2
------------------------------------------------------------
  Sheet Row: 2
  Email: john@example.com
  Redeem Code: ABC123456789
============================================================
```

### Debug Logging

For more detailed information, set in `.env`:
```env
LOG_LEVEL=debug
```

This will show why each row was skipped.

## Common Scenarios

### Scenario 1: Interrupted Run (Force Quit)

**What happens:**
```
Before force quit:
Row 5: Status = "In Progress"

After restart:
Row 5: Status = "In Progress" → SKIPPED
```

**How to fix:**
1. Clear the "In Progress" status
2. Run bot again

### Scenario 2: Failed Task

**What happens:**
```
Task failed:
Row 10: Status = "Failed", Error = "Network timeout"

Next run:
Row 10: Status = "Failed" → SKIPPED
```

**How to fix:**
1. Clear the "Failed" status (and optionally the Error column)
2. Run bot again

### Scenario 3: Partial Data

**What happens:**
```
Row has code but missing email:
Row 15: RedeemCode = "ABC123456789", Email = "" → SKIPPED
```

**How to fix:**
1. Fill in the missing email
2. Run bot again

### Scenario 4: All Tasks Completed

**What happens:**
```
All rows have Status filled:
Row 2: Status = "Success"
Row 3: Status = "Success"
Row 4: Status = "Failed"

Bot output:
No valid tasks to process
```

**How to add more tasks:**
1. Add new rows with empty Status
2. Or clear Status on existing rows to reprocess

## Configuration

### Column Mappings

The filtering uses your column mappings from `config/sheetMapping.js`:

```javascript
const COLUMN_MAPPINGS = {
  redeemCode: 'RedeemCode2',    // Column name in your sheet
  status: 'Status',              // Column name in your sheet
  email: 'Email',                // Column name in your sheet
  firstName: 'First',            // Column name in your sheet
  lastName: 'Last',              // Column name in your sheet
  // ...
};
```

If your column names are different, update them in `config/sheetMapping.js`.

### Validation Rules

The redeem code validation is:
- **Exactly 12 characters** (after trimming whitespace)
- Case-sensitive (preserves original case)
- No format validation (can be alphanumeric, symbols, etc.)

**Example valid codes:**
- `ABC123456789` ✓
- `XYZ987654321` ✓
- `A1B2C3D4E5F6` ✓
- `123456789012` ✓

**Example invalid codes:**
- `ABC12345678` ✗ (11 chars)
- `ABC1234567890` ✗ (13 chars)
- `ABC 23456789` ✗ (space = 12 chars but may be intended as 11)
- `            ` ✗ (12 spaces, but trimmed to 0)

## Troubleshooting

### Problem: Bot says "No valid tasks to process"

**Possible causes:**
1. All RedeemCode columns are empty
2. All Status columns are filled (already processed)
3. RedeemCode values are not exactly 12 characters
4. Missing required fields (Email, FirstName, LastName)

**Solution:**
1. Enable debug logging: `LOG_LEVEL=debug` in `.env`
2. Run bot and check logs for skip reasons
3. Fix the issues in your sheet

### Problem: Bot processes wrong tasks

**Check:**
1. Column names in `config/sheetMapping.js` match your sheet exactly
2. Run `node test-mapping.js` to verify configuration
3. Check logs to see which tasks were found

### Problem: Stuck "In Progress" tasks

**Solution:**
1. Find rows with `Status = "In Progress"`
2. Clear the Status cell
3. Run bot again

### Problem: Want to reprocess a completed task

**Solution:**
1. Find the row with `Status = "Success"`
2. Clear the Status cell
3. Run bot again

## Testing

### Test the Filtering Logic

```bash
# Enable debug logging
echo "LOG_LEVEL=debug" >> .env

# Run bot (it will show detailed skip reasons)
npm start
```

### Test with One Task

1. Edit your sheet to have only 1 row with:
   - RedeemCode = 12 characters
   - Status = empty
   - Email, FirstName, LastName = filled
2. Run: `npm start`
3. Verify it processes correctly

### Verify Column Mappings

```bash
node test-mapping.js
```

This shows which columns were found and if any are missing.

## Summary

**Task will be processed if:**
- ✓ RedeemCode is exactly 12 characters
- ✓ Status is empty
- ✓ Email, FirstName, LastName are present

**Task will be skipped if:**
- ✗ Row is empty
- ✗ No RedeemCode
- ✗ RedeemCode is not 12 characters
- ✗ Status is not empty (any value)
- ✗ Missing required data

**To retry a task:**
- Clear the Status cell in your sheet

**To see why tasks were skipped:**
- Set `LOG_LEVEL=debug` in `.env`
