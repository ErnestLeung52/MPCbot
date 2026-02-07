/**
 * Anti-Detection Test Script
 * Tests browser stealth capabilities on bot detection sites
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const browserService = require('./src/services/browser');
const proxyManager = require('./src/services/proxyManager');
const logger = require('./src/utils/logger');

// Load test sites from configuration file
const configPath = path.join(__dirname, 'config', 'bot-detection-sites.json');
const sitesConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const TEST_SITES = sitesConfig.sites;

async function testSite(site, useProxy = false) {
  let browser = null;
  
  try {
    console.log('');
    console.log('='.repeat(60));
    console.log(`Testing: ${site.name}`);
    console.log(`URL: ${site.url}`);
    console.log(`Description: ${site.description}`);
    if (useProxy) {
      console.log('Using proxy: Yes');
    }
    console.log('-'.repeat(60));

    // Get proxy if requested
    const proxy = useProxy ? proxyManager.getNext() : null;
    
    // Launch browser
    browser = await browserService.launch(proxy);
    const page = await browserService.createPage(browser);

    // Navigate to test site
    await page.goto(site.url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for page to fully load and run tests
    await page.waitForTimeout(5000);

    // Take screenshot
    const screenshotPath = `./screenshots/detection-test-${site.name.toLowerCase().replace(/\s/g, '-')}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);

    // Try to extract detection results (site-specific)
    if (site.name === 'Bot Sannysoft') {
      const results = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tr'));
        const failed = rows.filter(row => {
          const text = row.textContent || '';
          return text.includes('FAILED') || text.includes('failed');
        }).length;
        
        return {
          totalTests: rows.length,
          failedTests: failed
        };
      }).catch(() => ({ totalTests: 'Unknown', failedTests: 'Unknown' }));
      
      console.log(`Tests run: ${results.totalTests}`);
      console.log(`Failed tests: ${results.failedTests}`);
      
      if (results.failedTests > 0) {
        console.log('⚠️  Some tests failed - check screenshot for details');
      } else {
        console.log('✓ All tests passed!');
      }
    } else if (site.name === 'Are You Headless') {
      const results = await page.evaluate(() => {
        const body = document.body.textContent || '';
        const isHeadless = body.toLowerCase().includes('you are headless');
        return { isHeadless };
      }).catch(() => ({ isHeadless: 'Unknown' }));
      
      if (results.isHeadless === true) {
        console.log('❌ Detected as HEADLESS browser');
      } else if (results.isHeadless === false) {
        console.log('✓ Not detected as headless');
      } else {
        console.log('⚠️  Could not determine headless status - check screenshot');
      }
    } else if (site.name === 'Rebrowser Bot Detector') {
      const results = await page.evaluate(() => {
        const table = document.querySelector('table');
        if (!table) return { tests: 'Unknown', message: 'Table not found' };
        
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const testResults = rows.map(row => {
          const cells = row.querySelectorAll('td');
          return {
            name: cells[0]?.textContent?.trim() || '',
            detected: row.classList.contains('detected') || row.style.backgroundColor === 'red'
          };
        }).filter(r => r.name);
        
        const detectedCount = testResults.filter(t => t.detected).length;
        return { 
          totalTests: testResults.length, 
          detectedCount,
          tests: testResults
        };
      }).catch(() => ({ totalTests: 'Unknown', detectedCount: 'Unknown' }));
      
      console.log(`Tests run: ${results.totalTests}`);
      console.log(`Detected as bot: ${results.detectedCount} tests`);
      
      if (results.detectedCount > 0) {
        console.log('⚠️  Some automation detected - check screenshot for details');
      } else if (results.detectedCount === 0) {
        console.log('✓ No automation detected!');
      } else {
        console.log('ℹ️  Check screenshot for detailed results');
      }
    } else if (site.name === 'PixelScan' || site.name === 'Fingerprint Scan') {
      console.log('ℹ️  Check screenshot for detailed analysis');
      console.log('   Look for: Bot Score, Fingerprint Consistency, Automation Indicators');
    }

    // Keep browser open for manual inspection
    console.log('');
    console.log('Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

    await browserService.close(browser);
    console.log('Test completed');
    
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    if (browser) {
      await browserService.close(browser);
    }
  }
}

function displayMenu() {
  console.log('='.repeat(60));
  console.log('MPCBot Anti-Detection Test Suite');
  console.log('='.repeat(60));
  console.log('');
  console.log('Available Test Sites:');
  console.log('');
  
  TEST_SITES.forEach((site, index) => {
    console.log(`  [${index + 1}] ${site.name}`);
    console.log(`      ${site.url}`);
    console.log(`      ${site.description}`);
    console.log('');
  });
  
  console.log('Usage:');
  console.log('  npm run test-detection          # Run all tests');
  console.log('  npm run test-detection 1        # Run specific test by index');
  console.log('  npm run test-detection 1,3,5    # Run multiple tests');
  console.log('');
  console.log('='.repeat(60));
}

function printTestGuide() {
  console.log('');
  console.log('='.repeat(60));
  console.log('What to look for in results:');
  console.log('');
  console.log('Bot Sannysoft:');
  console.log('  ✓ navigator.webdriver should be undefined or false');
  console.log('  ✓ No red "FAILED" indicators');
  console.log('  ✓ Chrome should appear as a normal browser');
  console.log('');
  console.log('Are You Headless:');
  console.log('  ✓ Should NOT detect as headless browser');
  console.log('  ✓ All checks should pass');
  console.log('');
  console.log('PixelScan & Fingerprint Scan:');
  console.log('  ✓ Low or zero bot score');
  console.log('  ✓ Consistent browser fingerprint');
  console.log('  ✓ No automation indicators');
  console.log('  ✓ WebGL and Canvas should work normally');
  console.log('');
  console.log('Rebrowser Bot Detector:');
  console.log('  ✓ Zero or minimal detections');
  console.log('  ✓ No function exposure leaks');
  console.log('  ✓ Proper context isolation');
  console.log('  ✓ All tests should be green/passing');
  console.log('');
  console.log('Check screenshots in ./screenshots/ directory for detailed results');
  console.log('='.repeat(60));
}

async function runTests(testIndices = null) {
  console.log('='.repeat(60));
  console.log('MPCBot Anti-Detection Test Suite');
  console.log('='.repeat(60));
  console.log('');
  
  // Create screenshots directory if it doesn't exist
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
    console.log('✓ Created screenshots directory');
    console.log('');
  }
  
  // Load proxies
  proxyManager.loadProxies();
  const proxyCount = proxyManager.getCount();
  const useProxy = proxyCount > 0;
  
  if (useProxy) {
    console.log(`✓ Found ${proxyCount} proxy/proxies - will use for testing`);
  } else {
    console.log('⚠️  No proxies configured - testing without proxy');
  }
  console.log('');

  // Determine which tests to run
  let sitesToTest = TEST_SITES;
  
  if (testIndices && testIndices.length > 0) {
    sitesToTest = testIndices
      .map(index => TEST_SITES[index - 1])
      .filter(site => site !== undefined);
    
    if (sitesToTest.length === 0) {
      console.error('❌ Invalid test index provided.');
      console.log('');
      displayMenu();
      process.exit(1);
    }
    
    console.log('Running selected tests:');
    sitesToTest.forEach((site, idx) => {
      console.log(`  ${idx + 1}. ${site.name}`);
    });
    console.log('');
  } else {
    console.log(`Running all ${TEST_SITES.length} tests...`);
    console.log('');
  }

  // Test each site
  for (let i = 0; i < sitesToTest.length; i++) {
    const site = sitesToTest[i];
    await testSite(site, useProxy);
    
    // Delay between tests
    if (i < sitesToTest.length - 1) {
      console.log('');
      console.log('Waiting 5 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`${sitesToTest.length} test${sitesToTest.length > 1 ? 's' : ''} completed!`);
  printTestGuide();
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length > 0) {
  const firstArg = args[0].toLowerCase();
  
  // Check for help flag
  if (firstArg === '-h' || firstArg === '--help' || firstArg === 'help') {
    displayMenu();
    process.exit(0);
  }
  
  // Check for list flag
  if (firstArg === '-l' || firstArg === '--list' || firstArg === 'list') {
    displayMenu();
    process.exit(0);
  }
  
  // Parse test indices
  const indices = firstArg.split(',').map(s => {
    const num = parseInt(s.trim());
    if (isNaN(num) || num < 1 || num > TEST_SITES.length) {
      console.error(`❌ Invalid test index: ${s.trim()}`);
      console.log(`   Valid indices: 1-${TEST_SITES.length}`);
      console.log('');
      displayMenu();
      process.exit(1);
    }
    return num;
  });
  
  // Run tests with specified indices
  runTests(indices).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
} else {
  // Run all tests
  runTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}
