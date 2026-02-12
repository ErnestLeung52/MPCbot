/**
 * Data Sanitization Utility
 * 
 * Sanitizes data extracted from Google Sheets to ensure it meets
 * form field requirements and validation rules.
 */

const logger = require('./logger');

/**
 * Sanitize first name
 * Rules:
 * - Only letters (A-Z, a-z, accented characters), spaces, hyphens (-), and apostrophes (')
 * - Maximum 21 characters
 * 
 * @param {string} firstName - Raw first name from sheet
 * @returns {string} - Sanitized first name
 */
function sanitizeFirstName(firstName) {
	if (!firstName) return '';
	
	// Remove any characters that are not letters, spaces, hyphens, or apostrophes
	// Keep accented characters (unicode letters)
	let sanitized = firstName.replace(/[^\p{L}\s'\-]/gu, '');
	
	// Trim whitespace
	sanitized = sanitized.trim();
	
	// Truncate to 21 characters if longer
	if (sanitized.length > 21) {
		sanitized = sanitized.substring(0, 21).trim();
	}
	
	return sanitized;
}

/**
 * Sanitize last name
 * Rules:
 * - Only letters (A-Z, a-z, accented characters), spaces, hyphens (-), and apostrophes (')
 * - Maximum 21 characters
 * - Strategy: If last name is long or contains multiple words, use the longest word
 * 
 * @param {string} lastName - Raw last name from sheet
 * @returns {string} - Sanitized last name
 */
function sanitizeLastName(lastName) {
	if (!lastName) return '';
	
	// Remove any characters that are not letters, spaces, hyphens, or apostrophes
	// Keep accented characters (unicode letters)
	let sanitized = lastName.replace(/[^\p{L}\s'\-]/gu, '');
	
	// Trim whitespace
	sanitized = sanitized.trim();
	
	// If longer than 21 characters, extract the longest word
	if (sanitized.length > 21) {
		// Split by spaces, hyphens, or apostrophes to get individual words
		const words = sanitized.split(/[\s'\-]+/).filter(word => word.length > 0);
		
		if (words.length > 0) {
			// Find the longest word
			sanitized = words.reduce((longest, current) => 
				current.length > longest.length ? current : longest
			);
			
			// Still truncate if the longest word is over 21 chars
			if (sanitized.length > 21) {
				sanitized = sanitized.substring(0, 21).trim();
			}
		}
	}
	
	return sanitized;
}

/**
 * Sanitize street address
 * Rules:
 * - Remove unusual punctuation (keep only letters, numbers, spaces, # and basic punctuation)
 * - Remove consecutive hyphens or other weird punctuation
 * - Ensure proper format
 * 
 * @param {string} address - Raw street address from sheet
 * @returns {string} - Sanitized address
 */
function sanitizeAddress(address) {
	if (!address) return '';
	
	// Remove unusual characters, keep only: letters, numbers, spaces, #, comma, period
	// Keep accented characters (unicode letters)
	let sanitized = address.replace(/[^\p{L}\p{N}\s#,.]/gu, ' ');
	
	// Replace multiple consecutive spaces with a single space
	sanitized = sanitized.replace(/\s+/g, ' ');
	
	// Trim whitespace
	sanitized = sanitized.trim();
	
	return sanitized;
}

/**
 * Sanitize zip code
 * Rules:
 * - Must be exactly 5 digits
 * - Extract first 5 digits if longer
 * 
 * @param {string} zipCode - Raw zip code from sheet
 * @returns {string} - Sanitized zip code (5 digits)
 */
function sanitizeZipCode(zipCode) {
	if (!zipCode) return '';
	
	// Extract only digits
	const digits = zipCode.replace(/\D/g, '');
	
	// Take first 5 digits
	const sanitized = digits.substring(0, 5);
	
	// Pad with zeros if less than 5 digits (optional - you may want to return empty instead)
	// return sanitized.padStart(5, '0');
	
	// Return as-is (must be exactly 5 digits to be valid)
	return sanitized;
}

/**
 * Sanitize phone number
 * Rules:
 * - Must be exactly 10 digits
 * - Extract only digits
 * - Handle US country code (if starts with 1 and has 11 digits, remove the 1)
 * 
 * @param {string} phone - Raw phone number from sheet
 * @returns {string} - Sanitized phone number (10 digits)
 */
function sanitizePhone(phone) {
	if (!phone) return '';
	
	// Extract only digits
	let digits = phone.replace(/\D/g, '');
	
	// If starts with 1 and has 11 digits, it's likely a US number with country code
	// Remove the leading 1
	if (digits.length === 11 && digits.startsWith('1')) {
		digits = digits.substring(1);
	}
	
	// Take first 10 digits
	const sanitized = digits.substring(0, 10);
	
	return sanitized;
}

/**
 * Sanitize email address
 * Rules:
 * - Remove consecutive dots (..)
 * - Replace consecutive dots with a single dot
 * 
 * @param {string} email - Raw email from sheet
 * @returns {string} - Sanitized email
 */
function sanitizeEmail(email) {
	if (!email) return '';
	
	// Trim whitespace
	let sanitized = email.trim();
	
	// Replace consecutive dots with a single dot
	sanitized = sanitized.replace(/\.{2,}/g, '.');
	
	// Remove leading/trailing dots (optional, for safety)
	sanitized = sanitized.replace(/^\.+|\.+$/g, '');
	
	return sanitized;
}

/**
 * Sanitize all form data
 * 
 * @param {Object} data - Raw data extracted from Google Sheets
 * @returns {Object} - Sanitized data with the same structure
 */
function sanitizeFormData(data) {
	const original = { ...data };
	const sanitized = {
		...data,
		firstName: sanitizeFirstName(data.firstName),
		lastName: sanitizeLastName(data.lastName),
		streetAddress: sanitizeAddress(data.streetAddress),
		zipCode: sanitizeZipCode(data.zipCode),
		phone: sanitizePhone(data.phone),
		email: sanitizeEmail(data.email),
	};
	
	// Log sanitization changes (only if values changed)
	const changes = [];
	
	if (original.firstName !== sanitized.firstName) {
		changes.push(`First Name: "${original.firstName}" → "${sanitized.firstName}"`);
	}
	if (original.lastName !== sanitized.lastName) {
		changes.push(`Last Name: "${original.lastName}" → "${sanitized.lastName}"`);
	}
	if (original.streetAddress !== sanitized.streetAddress) {
		changes.push(`Address: "${original.streetAddress}" → "${sanitized.streetAddress}"`);
	}
	if (original.zipCode !== sanitized.zipCode) {
		changes.push(`Zip Code: "${original.zipCode}" → "${sanitized.zipCode}"`);
	}
	if (original.phone !== sanitized.phone) {
		changes.push(`Phone: "${original.phone}" → "${sanitized.phone}"`);
	}
	if (original.email !== sanitized.email) {
		changes.push(`Email: "${original.email}" → "${sanitized.email}"`);
	}
	
	if (changes.length > 0) {
		logger.info('Data Sanitization Applied:');
		changes.forEach(change => logger.info(`  ${change}`));
	}
	
	return sanitized;
}

module.exports = {
	sanitizeFirstName,
	sanitizeLastName,
	sanitizeAddress,
	sanitizeZipCode,
	sanitizePhone,
	sanitizeEmail,
	sanitizeFormData,
};
