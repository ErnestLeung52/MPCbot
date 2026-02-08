require('dotenv').config();
const googleSheets = require('./src/services/googleSheets');

async function test() {
	await googleSheets.initialize();

	// Get headers
	const headers = await googleSheets.getHeaders();
	console.log('Headers:', headers);

	// Get all rows
	const rows = await googleSheets.fetchRows();
	console.log('Number of rows:', rows.length);
	console.log('First row:', rows[0]);
}

test();
