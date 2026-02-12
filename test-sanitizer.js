/**
 * Test script for data sanitization
 * Run with: node test-sanitizer.js
 */

const dataSanitizer = require('./src/utils/dataSanitizer');

console.log('='.repeat(60));
console.log('DATA SANITIZATION TEST');
console.log('='.repeat(60));
console.log('');

// Test data with various issues
const testData = {
	// First name tests
	firstName: 'John@123!',
	
	// Last name tests - long names with middle names, special chars
	lastName: 'Smith-O\'Brien-MacDonald Jr.',
	
	// Address tests - with hyphens and unusual punctuation
	streetAddress: '123--Main--St, Apt #5-B!!!',
	
	// Zip code tests
	zipCode: '12345-6789',
	
	// Phone tests
	phone: '(555) 123-4567',
	
	// Email tests - consecutive dots
	email: 'john..doe@example..com',
	
	// Other fields (not sanitized)
	apartment: 'Apt 5B',
	city: 'New York',
	state: 'NY',
	redeemCode: 'ABC123DEF456',
};

console.log('ORIGINAL DATA:');
console.log('-'.repeat(60));
console.log(`First Name:     "${testData.firstName}"`);
console.log(`Last Name:      "${testData.lastName}"`);
console.log(`Address:        "${testData.streetAddress}"`);
console.log(`Zip Code:       "${testData.zipCode}"`);
console.log(`Phone:          "${testData.phone}"`);
console.log(`Email:          "${testData.email}"`);
console.log('');

const sanitized = dataSanitizer.sanitizeFormData(testData);

console.log('');
console.log('SANITIZED DATA:');
console.log('-'.repeat(60));
console.log(`First Name:     "${sanitized.firstName}"`);
console.log(`Last Name:      "${sanitized.lastName}"`);
console.log(`Address:        "${sanitized.streetAddress}"`);
console.log(`Zip Code:       "${sanitized.zipCode}"`);
console.log(`Phone:          "${sanitized.phone}"`);
console.log(`Email:          "${sanitized.email}"`);
console.log('');

// Additional test cases
console.log('='.repeat(60));
console.log('ADDITIONAL TEST CASES');
console.log('='.repeat(60));
console.log('');

const testCases = [
	{
		description: 'Long last name with multiple words',
		data: { lastName: 'Van Der Berg-Wellington Smith III' },
	},
	{
		description: 'Last name with dots',
		data: { lastName: 'O.Brien.MacDonald.Jr.' },
	},
	{
		description: 'Email with triple dots',
		data: { email: 'test...email@domain...com' },
	},
	{
		description: 'Phone with various formats and extension',
		data: { phone: '+1 (555) 123-4567 ext 123' },
	},
	{
		description: 'Phone with US country code (11 digits)',
		data: { phone: '1-555-123-4567' },
	},
	{
		description: 'Zip code with +4',
		data: { zipCode: '90210-1234' },
	},
	{
		description: 'Address with weird characters',
		data: { streetAddress: '123-Main-St---Apt#5@@@' },
	},
	{
		description: 'Name with accented characters',
		data: { firstName: 'José', lastName: 'García-Rodríguez' },
	},
	{
		description: 'Very long last name (over 21 chars)',
		data: { lastName: 'Schwarzenegger-Wellington-III' },
	},
];

testCases.forEach((testCase, index) => {
	console.log(`Test ${index + 1}: ${testCase.description}`);
	console.log('-'.repeat(60));
	
	const sanitized = dataSanitizer.sanitizeFormData(testCase.data);
	
	Object.keys(testCase.data).forEach(key => {
		const original = testCase.data[key];
		const cleaned = sanitized[key];
		
		if (original !== cleaned) {
			console.log(`  ${key}:`);
			console.log(`    Before: "${original}"`);
			console.log(`    After:  "${cleaned}"`);
			console.log(`    Length: ${original.length} → ${cleaned.length}`);
		} else {
			console.log(`  ${key}: "${original}" (no change)`);
		}
	});
	
	console.log('');
});

console.log('='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60));
