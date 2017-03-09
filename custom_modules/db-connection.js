const mysql = require('mysql');
const serversettings = require('./../serversettings.json');

// Ensure the server settings contain the required properties
if (!serversettings.db_connection) {
	console.error("Fatal error: \"db_connection\" property in server settings could not be found. Please ensure it exists.");
	process.exit(1);
} else if (!serversettings.db_connection.host || !serversettings.db_connection.port) {
	console.error("Fatal error: \"host\" or \"port\" property on \"db_connection\" property in server settings could not be found. Please ensure they exist");
	process.exit(1);
}

// Setup connection
var connection = mysql.createConnection(serversettings.db_connection);
connection.connect((err) => {
	if (err) { // If a connection error occured
		// Log the message
		console.error("Fatal error: Error connecting to database:");
		console.error(" > " + err.message);

		// Give a useful hint if it's a common error
		if (err.code == "ECONNREFUSED")
			console.error(`Is MySQL server running on ${serversettings.db_connection.host}:${serversettings.db_connection.port}?`)
		else if (err.code == "ER_ACCESS_DENIED_ERROR")
			console.error("Are you using the correct username and password to log in to the server?");
		
		// Shutdown the node app
		process.exit(1);

	} else // If connected successfully
		console.info(`Connected to MySQL server on ${serversettings.db_connection.host}:${serversettings.db_connection.port}`);
});

// Exports
module.exports = connection;