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
		console.log(`Testing: ${site.name}`);
		console.log(`URL: ${site.url}`);

		// Get proxy if requested
		const proxy = useProxy ? proxyManager.getNext() : null;

		// Launch browser
		browser = await browserService.launch(proxy);
		const page = await browserService.createPage(browser);

		// Navigate to test site
		await page.goto(site.url, {
			waitUntil: 'networkidle',
			timeout: 30000,
		});

		console.log('✓ Browser opened - You can now manually inspect the page');
		console.log('  Press Ctrl+C to quit when done');
		console.log('');

		// Keep browser open indefinitely until user manually closes it
		// No timeout, no automatic closure
		await new Promise(() => {}); // Never resolves - waits forever

	} catch (error) {
		if (error.message.includes('Target page, context or browser has been closed')) {
			console.log('Browser closed by user');
		} else {
			console.error(`Error: ${error.message}`);
		}
		if (browser) {
			await browserService.close(browser).catch(() => {});
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
		sitesToTest = testIndices.map((index) => TEST_SITES[index - 1]).filter((site) => site !== undefined);

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
			await new Promise((resolve) => setTimeout(resolve, 5000));
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
	const indices = firstArg.split(',').map((s) => {
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
	runTests(indices).catch((error) => {
		console.error('Test suite failed:', error);
		process.exit(1);
	});
} else {
	// Run all tests
	runTests().catch((error) => {
		console.error('Test suite failed:', error);
		process.exit(1);
	});
}
