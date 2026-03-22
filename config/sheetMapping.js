/**
 * Google Sheet and Form Field Mapping Configuration
 *
 * This file centralizes all sheet-related configuration:
 * - Sheet name (set via SHEET_NAME in .env)
 * - Column name mappings (map your sheet columns to form fields)
 * - Data transformations (e.g., state abbreviation to full name)
 */

require('dotenv').config();

// ============================================================================
// SHEET CONFIGURATION
// ============================================================================

const SHEET_NAME = process.env.SHEET_NAME;

// ============================================================================
// COLUMN MAPPINGS
// ============================================================================
// Map your Google Sheet column names (keys) to form field names (values)
// Change the keys to match YOUR sheet's column headers

const COLUMN_MAPPINGS = {
	// Input columns (data to read from sheet)
	redeemCode: 'Redeem Code', // Your sheet column name for redeem code
	firstName: 'First', // Your sheet column name for first name
	lastName: 'Last', // Your sheet column name for last name
	streetAddress: 'Address', // Your sheet column name for street address
	apartment: 'Apartment', // Your sheet column name for apartment (optional)
	city: 'City', // Your sheet column name for city
	state: 'State', // Your sheet column name for state (accepts abbreviations)
	zipCode: 'Zip Code', // Your sheet column name for zip code
	phone: 'Phone', // Your sheet column name for phone
	email: 'Email', // Your sheet column name for email

	// Output columns (data to write back to sheet)
	status: 'Status', // Column to store processing status (In Progress, Success, Failed)
	amount: 'Amount', // Column to store card amount
	cardNumber: 'Card Number', // Column to store card number
	exp: 'EXP', // Column to store card expiration date
	cvv: 'CVV', // Column to store card CVV
	timestamp: 'Timestamp', // Column to store processing timestamp
	error: 'Error', // Column to store error messages
};

// Note: Form field selectors are now hardcoded in src/automation/formFiller.js
// for better maintainability and clarity. The form uses specific selectors
// tailored to the target website's structure.

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
 * Build update data object for Google Sheets
 * @param {Object} params - Parameters
 * @param {string} params.status - Status (e.g., 'In Progress', 'Success', 'Failed')
 * @param {Object} params.extractedData - Extracted data from webpage (Amount, CardNumber, Exp, CVV)
 * @param {string} params.error - Error message (optional)
 * @returns {Object} - Update data object with sheet column names as keys
 */
function buildUpdateData({ status, extractedData = {}, error = null }) {
	// Format timestamp as MM-DD-YY HH:MM:SS in local time
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	const year = String(now.getFullYear()).slice(-2);
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');
	const timestamp = `${month}-${day}-${year} ${hours}:${minutes}:${seconds}`;

	const updateData = {
		[COLUMN_MAPPINGS.status]: status,
		[COLUMN_MAPPINGS.timestamp]: timestamp,
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

	// Helper functions
	extractRowData,
	buildUpdateData,
};
