/**
 * Test Ghost Cursor Integration
 * This test verifies that ghost-cursor is working correctly with our automation
 */

const browserService = require('./src/services/browser');
const humanBehavior = require('./src/automation/humanBehavior');
const logger = require('./src/utils/logger');

async function testGhostCursor() {
  let browser = null;
  
  try {
    logger.info('='.repeat(60));
    logger.info('Testing Ghost Cursor Integration');
    logger.info('='.repeat(60));
    
    // Launch browser
    logger.info('Launching browser...');
    browser = await browserService.launch();
    const page = await browserService.createPage(browser);
    
    // Navigate to a test page (Google homepage)
    logger.info('Navigating to Google...');
    await page.goto('https://www.google.com', { waitUntil: 'load' });
    
    // Test 1: Ghost cursor click on search box
    logger.info('Test 1: Using ghost-cursor to click search box...');
    await humanBehavior.humanClick(page, 'textarea[name="q"]');
    logger.info('✓ Ghost-cursor click successful!');
    
    // Test 2: Type with human behavior
    logger.info('Test 2: Typing with human-like behavior...');
    await humanBehavior.humanType(page, 'textarea[name="q"]', 'ghost cursor test');
    logger.info('✓ Typing successful!');
    
    // Test 3: Random mouse movement
    logger.info('Test 3: Testing random mouse movement...');
    await humanBehavior.randomMouseMovement(page);
    await humanBehavior.randomDelay(500, 1000);
    logger.info('✓ Random mouse movement successful!');
    
    // Test 4: Click at specific coordinates
    logger.info('Test 4: Testing click at coordinates...');
    await humanBehavior.clickAtCoordinates(page, 200, 200);
    logger.info('✓ Coordinate click successful!');
    
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('✓ All tests passed! Ghost-cursor is working correctly.');
    logger.info('='.repeat(60));
    
    // Keep browser open for 5 seconds to observe
    logger.info('Keeping browser open for 5 seconds for observation...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Close browser
    await browserService.close(browser);
    logger.info('Browser closed. Test complete!');
    
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    logger.error(error.stack);
    
    if (browser) {
      await browserService.close(browser);
    }
    
    process.exit(1);
  }
}

// Run test
testGhostCursor()
  .then(() => {
    logger.info('Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Test failed: ${error.message}`);
    process.exit(1);
  });
