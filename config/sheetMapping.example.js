/**
 * Google Sheet and Form Field Mapping Configuration - EXAMPLE
 * 
 * Copy this file to sheetMapping.js and customize for your use case
 */

// ============================================================================
// SHEET CONFIGURATION
// ============================================================================

const SHEET_NAME = 'Your Sheet Name Here'; // TODO: Change this to your sheet name

// ============================================================================
// COLUMN MAPPINGS
// ============================================================================
// Map your Google Sheet column names (keys) to form field names (values)
// TODO: Change the values to match YOUR sheet's column headers

const COLUMN_MAPPINGS = {
  // Input columns (data to read from sheet)
  redeemCode: 'RedeemCode',          // TODO: Your sheet column name for redeem code
  firstName: 'FirstName',            // TODO: Your sheet column name for first name
  lastName: 'LastName',              // TODO: Your sheet column name for last name
  streetAddress: 'StreetAddress',    // TODO: Your sheet column name for street address
  apartment: 'Apartment',            // TODO: Your sheet column name for apartment (optional)
  city: 'City',                      // TODO: Your sheet column name for city
  state: 'State',                    // TODO: Your sheet column name for state
  zipCode: 'ZipCode',                // TODO: Your sheet column name for zip code
  phone: 'Phone',                    // TODO: Your sheet column name for phone
  email: 'Email',                    // TODO: Your sheet column name for email
  
  // Output columns (data to write back to sheet)
  status: 'Status',                  // TODO: Column to store processing status (In Progress, Success, Failed)
  amount: 'Amount',                  // TODO: Column to store card amount
  cardNumber: 'CardNumber',          // TODO: Column to store card number
  exp: 'Exp',                        // TODO: Column to store card expiration date
  cvv: 'CVV',                        // TODO: Column to store card CVV
  timestamp: 'Timestamp',            // TODO: Column to store processing timestamp
  error: 'Error'                     // TODO: Column to store error messages
};

// ============================================================================
// FORM FIELD SELECTORS
// ============================================================================
// CSS selectors for the target website form fields
// TODO: Update these based on your target website's HTML structure

const FORM_SELECTORS = {
  redeemCode: '#redeem-code',              // TODO: Selector for redeem code input
  firstName: '#first-name',                // TODO: Selector for first name input
  lastName: '#last-name',                  // TODO: Selector for last name input
  streetAddress: '#street-address',        // TODO: Selector for street address input
  apartment: '#apartment',                 // TODO: Selector for apartment input (optional)
  city: '#city',                           // TODO: Selector for city input
  state: '#state',                         // TODO: Selector for state dropdown/input
  zipCode: '#zip-code',                    // TODO: Selector for zip code input
  phone: '#phone',                         // TODO: Selector for phone input
  email: '#email',                         // TODO: Selector for email input
  submitButton: '#submit-button'           // TODO: Selector for submit button
};

// ============================================================================
// STATE ABBREVIATION TO FULL NAME CONVERSION
// ============================================================================

const STATE_MAPPINGS = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  'DC': 'District of Columbia',
  'PR': 'Puerto Rico',
  'VI': 'Virgin Islands',
  'GU': 'Guam',
  'AS': 'American Samoa',
  'MP': 'Northern Mariana Islands'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function convertStateToFullName(abbrev) {
  if (!abbrev) return '';
  
  const upperAbbrev = abbrev.trim().toUpperCase();
  
  if (Object.values(STATE_MAPPINGS).includes(abbrev)) {
    return abbrev;
  }
  
  return STATE_MAPPINGS[upperAbbrev] || abbrev;
}

function getColumnName(fieldKey) {
  return COLUMN_MAPPINGS[fieldKey];
}

function getFormSelector(fieldKey) {
  return FORM_SELECTORS[fieldKey];
}

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

function buildFormData(rowData) {
  return {
    redeemCode: rowData.redeemCode,
    firstName: rowData.firstName,
    lastName: rowData.lastName,
    streetAddress: rowData.streetAddress,
    apartment: rowData.apartment || '',
    city: rowData.city,
    state: convertStateToFullName(rowData.state),
    zipCode: rowData.zipCode,
    phone: rowData.phone,
    email: rowData.email
  };
}

function buildUpdateData({ status, extractedData = {}, error = null }) {
  const updateData = {
    [COLUMN_MAPPINGS.status]: status,
    [COLUMN_MAPPINGS.timestamp]: new Date().toISOString()
  };
  
  for (const [key, value] of Object.entries(extractedData)) {
    updateData[key] = value;
  }
  
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
  
  convertStateToFullName,
  getColumnName,
  getFormSelector,
  extractRowData,
  buildFormData,
  buildUpdateData
};
