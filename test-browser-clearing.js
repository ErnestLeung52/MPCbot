/**
 * Test Browser Data Clearing
 * 
 * This script verifies that browser history and data are completely cleared
 * between browser launches.
 */

const browserService = require('./src/services/browser');
const logger = require('./src/utils/logger');

async function testBrowserClearing() {
  console.log('='.repeat(60));
  console.log('BROWSER DATA CLEARING TEST');
  console.log('='.repeat(60));
  console.log('');

  try {
    // ========================================
    // STEP 1: First Launch - Visit Some Sites
    // ========================================
    console.log('STEP 1: Launching browser and visiting test sites...');
    console.log('-'.repeat(60));
    
    const browser1 = await browserService.launch();
    const page1 = await browserService.createPage(browser1);
    
    // Visit multiple sites to create history
    const testSites = [
      'https://example.com',
      'https://httpbin.org/get',
      'https://www.google.com'
    ];
    
    for (const site of testSites) {
      console.log(`Visiting: ${site}`);
      await page1.goto(site, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page1.waitForTimeout(1000);
    }
    
    console.log('✓ Visited 3 test sites');
    console.log('');
    
    // Keep browser open for manual inspection
    console.log('MANUAL CHECK #1:');
    console.log('  1. Press Cmd+Y (or click History menu)');
    console.log('  2. Verify you can see the 3 sites we just visited');
    console.log('  3. Press Enter to continue...');
    console.log('');
    
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
    console.log('Closing browser...');
    await browserService.close(browser1);
    console.log('✓ Browser closed');
    console.log('');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // ========================================
    // STEP 2: Second Launch - Check if History is Cleared
    // ========================================
    console.log('STEP 2: Re-launching browser (should delete persistent data)...');
    console.log('-'.repeat(60));
    
    const browser2 = await browserService.launch();
    const page2 = await browserService.createPage(browser2);
    
    console.log('✓ Browser re-launched');
    console.log('');
    
    // Navigate to a neutral page
    await page2.goto('chrome://history/', { timeout: 10000 }).catch(() => {
      // chrome:// URLs might not work, use a regular page
      return page2.goto('https://example.com', { timeout: 10000 });
    });
    
    console.log('MANUAL CHECK #2:');
    console.log('  1. Press Cmd+Y (or click History menu)');
    console.log('  2. History should be EMPTY (no previous sites)');
    console.log('  3. If you see the previous sites, the clearing FAILED');
    console.log('  4. If history is empty, the clearing SUCCEEDED ✓');
    console.log('');
    console.log('Press Enter to finish test...');
    console.log('');
    
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
    console.log('Closing browser...');
    await browserService.close(browser2);
    console.log('');
    
    // ========================================
    // SUMMARY
    // ========================================
    console.log('='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('');
    console.log('Expected Result:');
    console.log('  ✓ First launch: History shows 3 visited sites');
    console.log('  ✓ Second launch: History is completely empty');
    console.log('');
    console.log('If history was empty on second launch:');
    console.log('  → Browser clearing is working correctly! 🎉');
    console.log('');
    console.log('If history still showed previous sites:');
    console.log('  → Enable profile wiping: WIPE_PROFILE_ON_START=true in .env');
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

// Make stdin readable
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

// Run test
testBrowserClearing();
