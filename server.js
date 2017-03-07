const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

// Load settings
const serversettings = require('./serversettings.json');

// Express app/server initialisation
var app = express();
var httpServer = http.createServer(app);

// App setup
app.use(bodyParser.urlencoded({extended: true})); // Parse url-encoded form data
require('./custom_modules/passport-setup.js')(app); // Passport setup and routing
app.use(express.static(__dirname + "/app/public")); // Static file serving
require('./custom_modules/routing')(app); // Routing

// Start servers
httpServer.listen(serversettings.http_port, _ => console.log("HTTP server listening on " + serversettings.http_port));