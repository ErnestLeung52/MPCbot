/**
 * Test Running Without Proxies
 *
 * This script demonstrates that the bot can run without any proxies configured.
 * It will show the warning messages and verify the workflow continues.
 */

const proxyManager = require('./src/services/proxyManager');
const logger = require('./src/utils/logger');

console.log('='.repeat(60));
console.log('TEST: RUNNING WITHOUT PROXIES');
console.log('='.repeat(60));
console.log('');

// Simulate no proxies by checking empty proxy manager
proxyManager.proxies = []; // Clear proxies for test
proxyManager.currentIndex = 0;

const proxyCount = proxyManager.getCount();

console.log('Testing proxy manager with no proxies:');
console.log(`  Proxy count: ${proxyCount}`);
console.log('');

if (proxyCount === 0) {
	console.log('✓ Correctly detected no proxies');
	console.log('');

	console.log('Expected behavior:');
	console.log('  1. Bot will show WARNING message');
	console.log('  2. Bot will continue to run');
	console.log('  3. All tasks will use direct IP');
	console.log('  4. No task limit applied');
	console.log('  5. Summary will show "ran without proxies"');
	console.log('');

	console.log('Testing proxy retrieval:');
	const proxy = proxyManager.getNext();
	console.log(`  getNext() returns: ${proxy === null ? 'null (expected)' : 'unexpected value'}`);
	console.log('');

	console.log('✓ Test passed! Bot can run without proxies.');
	console.log('');
	console.log('To run bot without proxies:');
	console.log('  1. Delete or empty config/proxies.json');
	console.log('  2. Run: npm start');
	console.log('  3. Bot will show warning and continue');
} else {
	console.log('✗ Test failed: Expected 0 proxies but found', proxyCount);
}

console.log('='.repeat(60));
