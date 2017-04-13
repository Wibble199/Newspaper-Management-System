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

/**
 * Performs a query on the database and returns a promise which will resolve with the result of the query or, if an error occurs, will reject with that error.
 * @param {string} query The query to perform on the database
 * @param {object | *[]} [queryParams] Any parameters to be passed to the query (see https://www.npmjs.com/package/mysql#performing-queries)
 * @returns {Promise}
 */
function asyncQuery(query, queryParams) {
	return new Promise(function(resolve, reject) {
		console.log("SQL > " + connection.query(query, queryParams, (err, results) => {
			if (err) reject(err);
			else resolve(results);
		}).sql);
	});
}

/**
 * Takes a query and will replace any instances of `::name` with the escaped value of `name` from the parameters object. `name` can be made up of letters, numbers, underscores (_) and dashes (-).
 * Note: Only normal escaping is currently supported (like when using `?` with the mysql library) not identifier escaping (like `??` with the mysql library) - so this cannot be used with table or column names.
 * @param {string} query The query to escape
 * @param {object} queryParams The parameters for the query
 * @return {string}
 */
function asyncQueryNamed(query, queryParams) {
	var newQuery = query.replace(/::([A-Za-z0-9_-]+)/g, function(_, pName) {
		return connection.escape(queryParams[pName]);
	});
	return asyncQuery(newQuery);
}

// Exports
module.exports = {
	asyncQuery,
	asyncQueryNamed
};