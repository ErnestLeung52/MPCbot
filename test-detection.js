/**
 * Anti-Detection Test Script
 * Tests browser stealth capabilities on bot detection sites
 */

require('dotenv').config();
const browserService = require('./src/services/browser');
const proxyManager = require('./src/services/proxyManager');
const logger = require('./src/utils/logger');

const TEST_SITES = [
  {
    name: 'Bot Sannysoft',
    url: 'https://bot.sannysoft.com/',
    description: 'Comprehensive bot detection tests'
  },
  {
    name: 'PixelScan',
    url: 'https://pixelscan.net/',
    description: 'Browser fingerprinting analysis'
  },
  {
    name: 'CreepJS',
    url: 'https://abrahamjuliot.github.io/creepjs/',
    description: 'Advanced fingerprint detection'
  }
];

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

async function runTests() {
  console.log('='.repeat(60));
  console.log('MPCBot Anti-Detection Test Suite');
  console.log('='.repeat(60));
  console.log('');
  console.log('This will test the browser on known bot detection sites.');
  console.log('Check the browser window and screenshots for any red flags.');
  console.log('');
  
  // Load proxies
  proxyManager.loadProxies();
  const proxyCount = proxyManager.getCount();
  const useProxy = proxyCount > 0;
  
  if (useProxy) {
    console.log(`✓ Found ${proxyCount} proxy/proxies - will use for testing`);
  } else {
    console.log('⚠️  No proxies configured - testing without proxy');
  }

  // Test each site
  for (const site of TEST_SITES) {
    await testSite(site, useProxy);
    
    // Delay between tests
    if (site !== TEST_SITES[TEST_SITES.length - 1]) {
      console.log('');
      console.log('Waiting 5 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('All tests completed!');
  console.log('');
  console.log('What to look for:');
  console.log('✓ navigator.webdriver should be undefined or false');
  console.log('✓ Chrome should appear as a normal browser');
  console.log('✓ Plugins should be present');
  console.log('✓ WebGL and Canvas should work normally');
  console.log('✓ No red "FAILED" indicators');
  console.log('');
  console.log('Check screenshots in ./screenshots/ directory');
  console.log('='.repeat(60));
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
