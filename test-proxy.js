/**
 * Proxy Test Script
 * Tests if proxies are properly loaded and applied to the browser
 */

require('dotenv').config();
const browserService = require('./src/services/browser');
const proxyManager = require('./src/services/proxyManager');
const logger = require('./src/utils/logger');

async function testProxy() {
  let browser = null;

  try {
    console.log('='.repeat(60));
    console.log('Proxy Configuration Test');
    console.log('='.repeat(60));
    console.log('');

    // Load proxies
    console.log('Loading proxies from config/proxies.json...');
    proxyManager.loadProxies();
    const proxyCount = proxyManager.getCount();

    if (proxyCount === 0) {
      console.error('❌ No proxies loaded!');
      console.log('');
      console.log('Please check:');
      console.log('  1. File exists: config/proxies.json');
      console.log('  2. Format: IP:PORT:USERNAME:PASSWORD (one per line)');
      console.log('  3. File is not empty');
      process.exit(1);
    }

    console.log(`✓ Loaded ${proxyCount} proxy/proxies`);
    console.log('');

    // Get first proxy
    const proxy = proxyManager.getNext();
    console.log('Selected proxy configuration:');
    console.log(`  Server: ${proxy.server}`);
    console.log(`  Username: ${proxy.username ? '****' : '(none)'}`);
    console.log(`  Password: ${proxy.password ? '****' : '(none)'}`);
    console.log('');

    // Launch browser WITH proxy
    console.log('Launching browser with proxy...');
    browser = await browserService.launch(proxy);
    const page = await browserService.createPage(browser);

    console.log('✓ Browser launched successfully with proxy');
    console.log('');

    // Test 1: Check IP address via ipify.org
    console.log('Test 1: Checking IP address...');
    await page.goto('https://api.ipify.org?format=json', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const ipResponse = await page.textContent('body');
    const ipData = JSON.parse(ipResponse);
    
    console.log(`  Your IP: ${ipData.ip}`);
    console.log('');

    // Extract proxy IP from server URL
    const proxyIp = proxy.server.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1];
    
    if (ipData.ip === proxyIp) {
      console.log('✅ SUCCESS: IP matches proxy! Proxy is working correctly.');
    } else {
      console.log(`⚠️  WARNING: IP does NOT match proxy IP (${proxyIp})`);
      console.log('   This could mean:');
      console.log('   - Proxy authentication failed');
      console.log('   - Proxy server is not responding');
      console.log('   - Direct connection is being used instead');
    }
    console.log('');

    // Test 2: Check user agent and location
    console.log('Test 2: Checking location via ipinfo.io...');
    await page.goto('https://ipinfo.io/json', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const locationResponse = await page.textContent('body');
    const locationData = JSON.parse(locationResponse);

    console.log(`  IP: ${locationData.ip}`);
    console.log(`  Location: ${locationData.city}, ${locationData.region}, ${locationData.country}`);
    console.log(`  ISP: ${locationData.org}`);
    console.log('');

    console.log('='.repeat(60));
    console.log('Proxy test completed!');
    console.log('='.repeat(60));

    await browserService.close(browser);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('');
    console.log('Common issues:');
    console.log('  1. Proxy credentials are incorrect');
    console.log('  2. Proxy server is not responding');
    console.log('  3. Proxy format is incorrect in proxies.json');
    console.log('  4. Network connectivity issues');
    
    if (browser) {
      await browserService.close(browser);
    }
    process.exit(1);
  }
}

// Run the test
testProxy();
