const mysql = require('mysql');
const serversettings = require('./../serversettings.json');

// Setup connection
var connection = mysql.createConnection(serversettings.db_connection);
connection.connect();

// Exports
module.exports = connection;