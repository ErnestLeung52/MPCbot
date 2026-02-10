const { google } = require('googleapis');
const fs = require('fs');
const config = require('../../config/config');
const logger = require('../utils/logger');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = config.googleSheets.spreadsheetId;
    this.sheetName = config.googleSheets.sheetName;
    this.initialized = false;
  }

  /**
   * Initialize Google Sheets API client
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Check if credentials file exists
      if (!fs.existsSync(config.googleSheets.credentialsPath)) {
        throw new Error(
          `Credentials file not found at ${config.googleSheets.credentialsPath}\n` +
          'Please download your service account JSON key from Google Cloud Console and save it as credentials.json'
        );
      }

      // Load credentials
      const credentials = JSON.parse(
        fs.readFileSync(config.googleSheets.credentialsPath, 'utf8')
      );

      // Create auth client
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const authClient = await auth.getClient();

      // Initialize sheets API
      this.sheets = google.sheets({ version: 'v4', auth: authClient });
      this.initialized = true;

      logger.info(`✓ Connected to Google Sheets: "${this.sheetName}"`);
    } catch (error) {
      logger.error(`Failed to initialize Google Sheets API: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ensure the service is initialized
   * @private
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Google Sheets service not initialized. Call initialize() first.');
    }
  }

  /**
   * Fetch all rows from the sheet (excluding header row)
   * @returns {Promise<Array<Array<string>>>} - Array of row data
   */
  async fetchRows() {
    this.ensureInitialized();

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A2:ZZ` // Start from row 2 (skip header)
      });

      const rows = response.data.values || [];
      return rows;
    } catch (error) {
      logger.error(`Failed to fetch rows: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get headers from the first row
   * @returns {Promise<Array<string>>} - Array of header names
   */
  async getHeaders() {
    this.ensureInitialized();

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A1:ZZ1` // First row only
      });

      const headers = response.data.values ? response.data.values[0] : [];
      return headers;
    } catch (error) {
      logger.error(`Failed to fetch headers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a specific row with new data
   * @param {number} rowIndex - Row index (0-based, where 0 is the first data row after header)
   * @param {Object} data - Object with column names as keys and values to update
   * @returns {Promise<void>}
   */
  async updateRow(rowIndex, data) {
    this.ensureInitialized();

    try {
      const headers = await this.getHeaders();
      const sheetRowNumber = rowIndex + 2; // +2 because: +1 for header, +1 for 1-based indexing

      // Build update requests for each column
      const updates = [];
      for (const [columnName, value] of Object.entries(data)) {
        const columnIndex = headers.indexOf(columnName);
        if (columnIndex === -1) {
          logger.warn(`Column "${columnName}" not found in headers, skipping`);
          continue;
        }

        // Convert column index to letter (A, B, C, etc.)
        const columnLetter = this.columnToLetter(columnIndex);
        const range = `${this.sheetName}!${columnLetter}${sheetRowNumber}`;

        updates.push({
          range,
          values: [[value]]
        });
      }

      if (updates.length === 0) {
        logger.warn('No valid columns to update');
        return;
      }

      // Batch update
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: updates
        }
      });
    } catch (error) {
      logger.error(`Failed to update row: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a specific cell
   * @param {number} rowIndex - Row index (0-based data rows)
   * @param {number} columnIndex - Column index (0-based)
   * @param {string} value - Value to set
   * @returns {Promise<void>}
   */
  async updateCell(rowIndex, columnIndex, value) {
    this.ensureInitialized();

    try {
      const sheetRowNumber = rowIndex + 2; // +2 for header and 1-based indexing
      const columnLetter = this.columnToLetter(columnIndex);
      const range = `${this.sheetName}!${columnLetter}${sheetRowNumber}`;

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[value]]
        }
      });
    } catch (error) {
      logger.error(`Failed to update cell: ${error.message}`);
      throw error;
    }
  }

  /**
   * Append a new row to the sheet
   * @param {Array<string>} values - Array of values to append
   * @returns {Promise<void>}
   */
  async appendRow(values) {
    this.ensureInitialized();

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:ZZ`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [values]
        }
      });
    } catch (error) {
      logger.error(`Failed to append row: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert column index to letter (0 -> A, 1 -> B, etc.)
   * @param {number} index - Column index (0-based)
   * @returns {string} - Column letter
   * @private
   */
  columnToLetter(index) {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }
}

module.exports = new GoogleSheetsService();
