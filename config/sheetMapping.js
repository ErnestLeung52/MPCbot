/**
 * Google Sheet and Form Field Mapping Configuration
 *
 * This file centralizes all sheet-related configuration:
 * - Sheet name (change this when switching sheets)
 * - Column name mappings (map your sheet columns to form fields)
 * - Data transformations (e.g., state abbreviation to full name)
 */

// ============================================================================
// SHEET CONFIGURATION
// ============================================================================

const SHEET_NAME = 'FB22 Int $4.07'; // Change this when using a different sheet

// ============================================================================
// COLUMN MAPPINGS
// ============================================================================
// Map your Google Sheet column names (keys) to form field names (values)
// Change the keys to match YOUR sheet's column headers

const COLUMN_MAPPINGS = {
	// Input columns (data to read from sheet)
	redeemCode: 'RedeemCode2', // Your sheet column name for redeem code
	firstName: 'First', // Your sheet column name for first name
	lastName: 'Last', // Your sheet column name for last name
	streetAddress: 'Address', // Your sheet column name for street address
	apartment: 'Apartment', // Your sheet column name for apartment (optional)
	city: 'City', // Your sheet column name for city
	state: 'State', // Your sheet column name for state (accepts abbreviations)
	zipCode: 'ZipCode', // Your sheet column name for zip code
	phone: 'Phone', // Your sheet column name for phone
	email: 'Email', // Your sheet column name for email

	// Output columns (data to write back to sheet)
	status: 'Status', // Column to store processing status (In Progress, Success, Failed)
	amount: 'Amount', // Column to store card amount
	cardNumber: 'CardNumber', // Column to store card number
	exp: 'Exp', // Column to store card expiration date
	cvv: 'CVV', // Column to store card CVV
	timestamp: 'Timestamp', // Column to store processing timestamp
	error: 'Error', // Column to store error messages
};

// ============================================================================
// FORM FIELD SELECTORS
// ============================================================================
// CSS selectors for the target website form fields
// Update these based on your target website's HTML structure

const FORM_SELECTORS = {
	redeemCode: '#redeem-code', // Selector for redeem code input
	firstName: '#first-name', // Selector for first name input
	lastName: '#last-name', // Selector for last name input
	streetAddress: '#street-address', // Selector for street address input
	apartment: '#apartment', // Selector for apartment input (optional)
	city: '#city', // Selector for city input
	state: '#state', // Selector for state dropdown/input
	zipCode: '#zip-code', // Selector for zip code input
	phone: '#phone', // Selector for phone input
	email: '#email', // Selector for email input
	submitButton: '#submit-button', // Selector for submit button
};

// ============================================================================
// STATE ABBREVIATION TO FULL NAME CONVERSION
// ============================================================================
// Converts state abbreviations to full names (if your form requires full names)

const STATE_MAPPINGS = {
	AL: 'Alabama',
	AK: 'Alaska',
	AZ: 'Arizona',
	AR: 'Arkansas',
	CA: 'California',
	CO: 'Colorado',
	CT: 'Connecticut',
	DE: 'Delaware',
	FL: 'Florida',
	GA: 'Georgia',
	HI: 'Hawaii',
	ID: 'Idaho',
	IL: 'Illinois',
	IN: 'Indiana',
	IA: 'Iowa',
	KS: 'Kansas',
	KY: 'Kentucky',
	LA: 'Louisiana',
	ME: 'Maine',
	MD: 'Maryland',
	MA: 'Massachusetts',
	MI: 'Michigan',
	MN: 'Minnesota',
	MS: 'Mississippi',
	MO: 'Missouri',
	MT: 'Montana',
	NE: 'Nebraska',
	NV: 'Nevada',
	NH: 'New Hampshire',
	NJ: 'New Jersey',
	NM: 'New Mexico',
	NY: 'New York',
	NC: 'North Carolina',
	ND: 'North Dakota',
	OH: 'Ohio',
	OK: 'Oklahoma',
	OR: 'Oregon',
	PA: 'Pennsylvania',
	RI: 'Rhode Island',
	SC: 'South Carolina',
	SD: 'South Dakota',
	TN: 'Tennessee',
	TX: 'Texas',
	UT: 'Utah',
	VT: 'Vermont',
	VA: 'Virginia',
	WA: 'Washington',
	WV: 'West Virginia',
	WI: 'Wisconsin',
	WY: 'Wyoming',
	DC: 'District of Columbia',
	PR: 'Puerto Rico',
	VI: 'Virgin Islands',
	GU: 'Guam',
	AS: 'American Samoa',
	MP: 'Northern Mariana Islands',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert state abbreviation to full name
 * @param {string} abbrev - State abbreviation (e.g., 'CA')
 * @returns {string} - Full state name (e.g., 'California') or original if not found
 */
function convertStateToFullName(abbrev) {
	if (!abbrev) return '';

	const upperAbbrev = abbrev.trim().toUpperCase();

	// If it's already a full name, return as-is
	if (Object.values(STATE_MAPPINGS).includes(abbrev)) {
		return abbrev;
	}

	// Convert abbreviation to full name
	return STATE_MAPPINGS[upperAbbrev] || abbrev;
}

/**
 * Get the sheet column name for a given field
 * @param {string} fieldKey - Field key (e.g., 'firstName')
 * @returns {string} - Sheet column name
 */
function getColumnName(fieldKey) {
	return COLUMN_MAPPINGS[fieldKey];
}

/**
 * Get the form selector for a given field
 * @param {string} fieldKey - Field key (e.g., 'firstName')
 * @returns {string} - CSS selector
 */
function getFormSelector(fieldKey) {
	return FORM_SELECTORS[fieldKey];
}

/**
 * Extract data from row using column mappings
 * @param {Array<string>} rowData - Row data array
 * @param {Array<string>} headers - Column headers array
 * @returns {Object} - Mapped data object
 */
function extractRowData(rowData, headers) {
	const data = {};

	for (const [fieldKey, columnName] of Object.entries(COLUMN_MAPPINGS)) {
		const columnIndex = headers.indexOf(columnName);
		if (columnIndex !== -1 && columnIndex < rowData.length) {
			data[fieldKey] = rowData[columnIndex] || '';
		} else {
			data[fieldKey] = '';
		}
	}

	return data;
}

/**
 * Sanitize row data before form submission
 * @param {Object} rowData - Extracted row data
 * @returns {Object} - Sanitized data
 */
function sanitizeRowData(rowData) {
	// TODO: Implement specific sanitization logic here
	// Examples:
	// - Trim whitespace
	// - Remove special characters
	// - Format phone numbers
	// - Validate email format
	// - Clean zip codes

	const sanitized = { ...rowData };

	// Basic sanitization (trim all string values)
	for (const [key, value] of Object.entries(sanitized)) {
		if (typeof value === 'string') {
			sanitized[key] = value.trim();
		}
	}

	// Add more specific sanitization rules as needed
	// Example: Remove non-numeric characters from phone
	// if (sanitized.phone) {
	//   sanitized.phone = sanitized.phone.replace(/\D/g, '');
	// }

	return sanitized;
}

/**
 * Build form data with transformations
 * @param {Object} rowData - Extracted row data
 * @returns {Object} - Form data ready for submission
 */
function buildFormData(rowData) {
	// Apply sanitization first
	const sanitized = sanitizeRowData(rowData);

	return {
		redeemCode: sanitized.redeemCode,
		firstName: sanitized.firstName,
		lastName: sanitized.lastName,
		streetAddress: sanitized.streetAddress,
		apartment: sanitized.apartment || '', // Optional field
		city: sanitized.city,
		state: convertStateToFullName(sanitized.state), // Convert state abbreviation
		zipCode: sanitized.zipCode,
		phone: sanitized.phone,
		email: sanitized.email,
	};
}

/**
 * Build update data object for Google Sheets
 * @param {Object} params - Parameters
 * @param {string} params.status - Status (e.g., 'In Progress', 'Success', 'Failed')
 * @param {Object} params.extractedData - Extracted data from webpage (Amount, CardNumber, Exp, CVV)
 * @param {string} params.error - Error message (optional)
 * @returns {Object} - Update data object with sheet column names as keys
 */
function buildUpdateData({ status, extractedData = {}, error = null }) {
	const updateData = {
		[COLUMN_MAPPINGS.status]: status,
		[COLUMN_MAPPINGS.timestamp]: new Date().toISOString(),
	};

	// Add extracted card data (only these 4 fields)
	if (extractedData.amount !== undefined) {
		updateData[COLUMN_MAPPINGS.amount] = extractedData.amount;
	}
	if (extractedData.cardNumber !== undefined) {
		updateData[COLUMN_MAPPINGS.cardNumber] = extractedData.cardNumber;
	}
	if (extractedData.exp !== undefined) {
		updateData[COLUMN_MAPPINGS.exp] = extractedData.exp;
	}
	if (extractedData.cvv !== undefined) {
		updateData[COLUMN_MAPPINGS.cvv] = extractedData.cvv;
	}

	// Add error if present
	if (error) {
		updateData[COLUMN_MAPPINGS.error] = error;
	}

	return updateData;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
	SHEET_NAME,
	COLUMN_MAPPINGS,
	FORM_SELECTORS,
	STATE_MAPPINGS,

	// Helper functions
	convertStateToFullName,
	getColumnName,
	getFormSelector,
	extractRowData,
	sanitizeRowData,
	buildFormData,
	buildUpdateData,
};
