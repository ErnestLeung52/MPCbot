/**
 * Test Task Filtering Logic
 * 
 * This script tests the task filtering without actually processing tasks.
 * It shows you which tasks would be processed and why others are skipped.
 * 
 * Usage: node test-task-filtering.js
 */

require('dotenv').config();
const sheetMapping = require('./config/sheetMapping');
const googleSheets = require('./src/services/googleSheets');

async function testTaskFiltering() {
  console.log('='.repeat(70));
  console.log('Task Filtering Test');
  console.log('='.repeat(70));
  console.log('');

  try {
    // Initialize Google Sheets
    console.log('1. Connecting to Google Sheets...');
    await googleSheets.initialize();
    console.log('   ✓ Connected successfully\n');

    // Fetch data
    console.log('2. Fetching sheet data...');
    const rows = await googleSheets.fetchRows();
    const headers = await googleSheets.getHeaders();
    console.log(`   ✓ Found ${rows.length} total rows\n`);

    // Show sheet structure
    console.log('3. Sheet Structure:');
    console.log('   Headers:', headers.join(' | '));
    console.log('');

    // Find column indices
    const redeemCodeIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.redeemCode);
    const statusIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.status);
    const emailIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.email);
    const firstNameIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.firstName);
    const lastNameIndex = headers.indexOf(sheetMapping.COLUMN_MAPPINGS.lastName);

    // Validate columns exist
    console.log('4. Validating Required Columns:');
    console.log(`   RedeemCode Column ("${sheetMapping.COLUMN_MAPPINGS.redeemCode}"): ${redeemCodeIndex !== -1 ? '✓ Found' : '✗ NOT FOUND'}`);
    console.log(`   Status Column ("${sheetMapping.COLUMN_MAPPINGS.status}"): ${statusIndex !== -1 ? '✓ Found' : '✗ NOT FOUND'}`);
    console.log(`   Email Column ("${sheetMapping.COLUMN_MAPPINGS.email}"): ${emailIndex !== -1 ? '✓ Found' : '✗ NOT FOUND'}`);
    console.log(`   FirstName Column ("${sheetMapping.COLUMN_MAPPINGS.firstName}"): ${firstNameIndex !== -1 ? '✓ Found' : '✗ NOT FOUND'}`);
    console.log(`   LastName Column ("${sheetMapping.COLUMN_MAPPINGS.lastName}"): ${lastNameIndex !== -1 ? '✓ Found' : '✗ NOT FOUND'}`);
    console.log('');

    if (redeemCodeIndex === -1 || statusIndex === -1 || emailIndex === -1) {
      console.error('✗ ERROR: Required columns not found!');
      console.error('   Please update column mappings in config/sheetMapping.js');
      return;
    }

    // Filter tasks
    console.log('5. Filtering Tasks:');
    console.log('   Rules:');
    console.log('   - RedeemCode must be exactly 12 characters');
    console.log('   - Status must be empty');
    console.log('   - Email, FirstName, LastName must be present');
    console.log('');
    console.log('-'.repeat(70));

    const validTasks = [];
    const stats = {
      total: rows.length,
      valid: 0,
      skippedEmpty: 0,
      skippedNoCode: 0,
      skippedInvalidCode: 0,
      skippedAlreadyProcessed: 0,
      skippedMissingData: 0
    };

    // Analyze each row
    for (let i = 0; i < rows.length; i++) {
      const rowData = rows[i];
      const sheetRowNumber = i + 2;

      // Get values
      const redeemCode = (rowData[redeemCodeIndex] || '').trim();
      const status = (rowData[statusIndex] || '').trim();
      const email = (rowData[emailIndex] || '').trim();
      const firstName = firstNameIndex !== -1 ? (rowData[firstNameIndex] || '').trim() : '';
      const lastName = lastNameIndex !== -1 ? (rowData[lastNameIndex] || '').trim() : '';

      // Format display
      const emailDisplay = email || '(no email)';
      const codeDisplay = redeemCode || '(empty)';
      const statusDisplay = status || '(empty)';

      // Rule 1: Empty row
      if (!rowData || rowData.every(cell => !cell)) {
        console.log(`Row ${sheetRowNumber}: ✗ SKIP - Completely empty`);
        stats.skippedEmpty++;
        continue;
      }

      // Rule 2: No code and no status
      if (!redeemCode && !status) {
        console.log(`Row ${sheetRowNumber} ${emailDisplay}: ✗ SKIP - No redeem code`);
        stats.skippedNoCode++;
        continue;
      }

      // Rule 3: Invalid code length
      if (redeemCode && redeemCode.length !== 12) {
        console.log(`Row ${sheetRowNumber} ${emailDisplay}: ✗ SKIP - Invalid code length (${redeemCode.length} chars)`);
        console.log(`   Code: "${codeDisplay}"`);
        stats.skippedInvalidCode++;
        continue;
      }

      // Rule 4: Already processed
      if (redeemCode && redeemCode.length === 12 && status) {
        console.log(`Row ${sheetRowNumber} ${emailDisplay}: ✗ SKIP - Already processed`);
        console.log(`   Status: "${statusDisplay}"`);
        stats.skippedAlreadyProcessed++;
        continue;
      }

      // Rule 5: Missing required data
      if (!email || !firstName || !lastName) {
        console.log(`Row ${sheetRowNumber} ${emailDisplay}: ✗ SKIP - Missing required data`);
        const missing = [];
        if (!email) missing.push('Email');
        if (!firstName) missing.push('FirstName');
        if (!lastName) missing.push('LastName');
        console.log(`   Missing: ${missing.join(', ')}`);
        stats.skippedMissingData++;
        continue;
      }

      // Valid task!
      console.log(`Row ${sheetRowNumber} ${email}: ✓ VALID TASK`);
      console.log(`   RedeemCode: ${redeemCode}`);
      validTasks.push({
        rowIndex: i,
        sheetRowNumber: sheetRowNumber,
        email: email,
        redeemCode: redeemCode
      });
      stats.valid++;
    }

    console.log('-'.repeat(70));
    console.log('');

    // Summary
    console.log('='.repeat(70));
    console.log('Filtering Summary:');
    console.log('='.repeat(70));
    console.log(`  Total rows: ${stats.total}`);
    console.log(`  Valid tasks: ${stats.valid}`);
    console.log('');
    console.log('  Skipped Breakdown:');
    console.log(`    - Empty rows: ${stats.skippedEmpty}`);
    console.log(`    - No redeem code: ${stats.skippedNoCode}`);
    console.log(`    - Invalid code length: ${stats.skippedInvalidCode}`);
    console.log(`    - Already processed: ${stats.skippedAlreadyProcessed}`);
    console.log(`    - Missing required data: ${stats.skippedMissingData}`);
    console.log('='.repeat(70));
    console.log('');

    // Show valid tasks
    if (validTasks.length > 0) {
      console.log('Valid Tasks That Will Be Processed:');
      console.log('-'.repeat(70));
      validTasks.forEach((task, index) => {
        console.log(`  ${index + 1}. Row ${task.sheetRowNumber}: ${task.email}`);
        console.log(`     RedeemCode: ${task.redeemCode}`);
      });
      console.log('-'.repeat(70));
      console.log('');
      console.log('✓ Ready to run! Execute: npm start');
    } else {
      console.log('⚠ No valid tasks found!');
      console.log('');
      console.log('Possible issues:');
      console.log('  1. All rows are missing redeem codes');
      console.log('  2. All rows have already been processed (Status is not empty)');
      console.log('  3. Redeem codes are not exactly 12 characters');
      console.log('  4. Required fields (Email, Name) are missing');
      console.log('');
      console.log('Solutions:');
      console.log('  - Add rows with 12-character redeem codes and empty Status');
      console.log('  - Clear Status column for rows you want to reprocess');
      console.log('  - Ensure Email, FirstName, LastName are filled');
    }
    console.log('');

  } catch (error) {
    console.error('');
    console.error('✗ Test failed with error:');
    console.error('  ', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Verify .env has correct GOOGLE_SHEETS_ID');
    console.error('  2. Verify credentials.json exists and is valid');
    console.error('  3. Verify sheet is shared with service account');
    console.error('  4. Verify sheet name in config/sheetMapping.js is correct');
    console.error('  5. Run: node test-mapping.js');
    console.error('');
    process.exit(1);
  }
}

// Run test
testTaskFiltering().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
