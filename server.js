const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');

// Load settings
const serversettings = require('./serversettings.json');
var sslCredentials = {
	key: fs.readFileSync("./sslcert/key.pem"),
	cert: fs.readFileSync("./sslcert/cert.pem")
};

// Express app/server initialisation
var app = express();
var httpsServer = https.createServer(sslCredentials, app);

// HTTP redirection server
var httpServer = http.createServer((req, res) => {
	res.writeHead(302, {"Location": "https://" + req.headers.host.split(":")[0] + ":" + serversettings.https_port + req.url});
	res.end();
});

// App setup
app.use(bodyParser.urlencoded({extended: true})); // Parse url-encoded form data
require('./custom_modules/passport-setup.js')(app); // Passport setup and routing
app.use(express.static(__dirname + "/app/public")); // Static file serving
require('./custom_modules/routing')(app); // Routing

// Start servers
httpServer.listen(serversettings.http_port, _ => console.log("HTTP server listening on " + serversettings.http_port));
httpsServer.listen(serversettings.https_port, _ => console.log("HTTPS server listening on " + serversettings.https_port));