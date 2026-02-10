/**
 * Anti-Detection Test Script
 * Tests browser stealth capabilities on bot detection sites
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const browserService = require('./src/services/browser');
const proxyManager = require('./src/services/proxyManager');

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
		
		if (proxy) {
			// Extract IP from proxy server URL
			const proxyIp = proxy.server.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1];
			console.log(`Proxy: ${proxyIp || proxy.server}`);
		} else {
			console.log('Proxy: None');
		}

		// Launch browser
		browser = await browserService.launch(proxy);
		const page = await browserService.createPage(browser);

		// Navigate to test site - no waiting, no timeout
		await page.goto(site.url);

		console.log('✓ Browser opened');
		console.log('  Press Ctrl+C to quit when done');
		console.log('');

		// Keep browser open indefinitely until user manually closes it
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
	console.log('MPCBot Anti-Detection Test');
	console.log('='.repeat(60));
	console.log('');
	console.log('Available Test Sites:');
	console.log('');

	TEST_SITES.forEach((site, index) => {
		console.log(`  [${index + 1}] ${site.name} - ${site.url}`);
	});

	console.log('');
	console.log('Usage:');
	console.log('  npm run test-detection          # Run all tests');
	console.log('  npm run test-detection 1        # Run specific test');
	console.log('  npm run test-detection 1,3      # Run multiple tests');
	console.log('');
	console.log('Note: Browser will stay open until you close it (Ctrl+C)');
	console.log('='.repeat(60));
}


async function runTests(testIndices = null) {
	console.log('='.repeat(60));
	console.log('MPCBot Anti-Detection Test');
	console.log('='.repeat(60));

	// Load proxies
	proxyManager.loadProxies();
	const proxyCount = proxyManager.getCount();
	const useProxy = proxyCount > 0;

	if (useProxy) {
		console.log(`Using proxy: Yes (${proxyCount} available)`);
	} else {
		console.log('Using proxy: No');
	}

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
	}

	// Test each site
	for (const site of sitesToTest) {
		await testSite(site, useProxy);
	}
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
	console.log('');
	console.log('Test interrupted by user');
	process.exit(0);
});

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
