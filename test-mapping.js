/**
 * Test script to verify sheet mapping configuration
 * 
 * This script tests:
 * 1. Connection to Google Sheets
 * 2. Column mappings are correct
 * 3. Data extraction works
 * 4. Form data building works (including state conversion)
 * 
 * Usage: node test-mapping.js
 */

require('dotenv').config();
const sheetMapping = require('./config/sheetMapping');
const googleSheets = require('./src/services/googleSheets');

async function test() {
  console.log('='.repeat(60));
  console.log('Sheet Mapping Configuration Test');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Initialize Google Sheets
    console.log('1. Initializing Google Sheets...');
    await googleSheets.initialize();
    console.log('   ✓ Google Sheets initialized successfully');
    console.log('');

    // Get sheet info
    console.log('2. Fetching sheet data...');
    const headers = await googleSheets.getHeaders();
    const rows = await googleSheets.fetchRows();
    console.log(`   ✓ Sheet Name: ${sheetMapping.SHEET_NAME}`);
    console.log(`   ✓ Found ${headers.length} columns`);
    console.log(`   ✓ Found ${rows.length} data rows`);
    console.log('');

    // Display headers
    console.log('3. Sheet Headers:');
    console.log('   ', headers.join(' | '));
    console.log('');

    // Display column mappings
    console.log('4. Column Mappings (config):');
    console.log('   Field Key          → Sheet Column');
    console.log('   ' + '-'.repeat(50));
    for (const [key, value] of Object.entries(sheetMapping.COLUMN_MAPPINGS)) {
      const found = headers.includes(value) ? '✓' : '✗';
      console.log(`   ${found} ${key.padEnd(17)} → ${value}`);
    }
    console.log('');

    // Check for missing columns
    const missingColumns = Object.values(sheetMapping.COLUMN_MAPPINGS)
      .filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('   ⚠ WARNING: Missing columns in sheet:');
      missingColumns.forEach(col => console.log(`      - ${col}`));
      console.log('');
    }

    // Test data extraction with first row
    if (rows.length > 0) {
      console.log('5. Testing Data Extraction (First Row):');
      console.log('   ' + '-'.repeat(50));
      
      const extractedData = sheetMapping.extractRowData(rows[0], headers);
      
      for (const [key, value] of Object.entries(extractedData)) {
        if (key.includes('status') || key.includes('result') || 
            key.includes('timestamp') || key.includes('error')) {
          continue; // Skip output columns
        }
        const displayValue = value ? value : '(empty)';
        console.log(`   ${key.padEnd(17)}: ${displayValue}`);
      }
      console.log('');

      // Test form data building
      console.log('6. Testing Form Data Building:');
      console.log('   (with transformations like state conversion)');
      console.log('   ' + '-'.repeat(50));
      
      const formData = sheetMapping.buildFormData(extractedData);
      
      for (const [key, value] of Object.entries(formData)) {
        const displayValue = value ? value : '(empty)';
        const changed = (key === 'state' && extractedData.state !== value) 
          ? ` [converted from "${extractedData.state}"]` 
          : '';
        console.log(`   ${key.padEnd(17)}: ${displayValue}${changed}`);
      }
      console.log('');

      // Test form selectors
      console.log('7. Form Selectors:');
      console.log('   Field Key          → CSS Selector');
      console.log('   ' + '-'.repeat(50));
      for (const [key, selector] of Object.entries(sheetMapping.FORM_SELECTORS)) {
        console.log(`   ${key.padEnd(17)} → ${selector}`);
      }
      console.log('');

      // Test update data building
      console.log('8. Testing Update Data Building:');
      console.log('   (for writing back to sheet)');
      console.log('   ' + '-'.repeat(50));
      
      const updateData = sheetMapping.buildUpdateData({
        status: 'Success',
        extractedData: { 'CardNumber': '1234567890' },
        error: null
      });
      
      for (const [key, value] of Object.entries(updateData)) {
        console.log(`   Column "${key}" = ${value}`);
      }
      console.log('');
    } else {
      console.log('⚠ No data rows found in sheet. Add at least one row to test data extraction.');
      console.log('');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('Test Summary:');
    console.log('='.repeat(60));
    
    const allColumnsFound = missingColumns.length === 0;
    const hasDataRows = rows.length > 0;
    
    if (allColumnsFound && hasDataRows) {
      console.log('✓ All tests passed!');
      console.log('✓ Configuration looks good.');
      console.log('');
      console.log('Next steps:');
      console.log('1. Verify form selectors match your target website');
      console.log('2. Test with: npm start');
    } else {
      console.log('⚠ Configuration needs attention:');
      if (!allColumnsFound) {
        console.log('  - Update column mappings in config/sheetMapping.js');
      }
      if (!hasDataRows) {
        console.log('  - Add data rows to your Google Sheet');
      }
    }
    console.log('='.repeat(60));

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
    console.error('');
    process.exit(1);
  }
}

// Run test
test().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
