const http = require('http');
const express = require('express');
const expressSession = require('express-session');
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const db = require('./custom_modules/db');
const users = require('./custom_modules/users');

const serversettings = require('./serversettings.json');

// Express app/server initialisation
var app = express();
var httpServer = http.createServer(app);

// Authentication/passport setup
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSession({secret: "ormskirknewspaper", resave: true, saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new Strategy({usernameField: "email", passwordField: "password"}, function(username, password, done) {
	users.checkLogin(username, password).then(function(user) { // If login passed
		done(null, user);

	}, function(err) { // If login failed
		// if server error
		// done(err);
		// if password error
		done(null, false);
	});
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => users.getUserById(id).then(user => done(null, user), err => done(err, null)));

// Static file serving
app.use(express.static(__dirname + "/app/public"));

// Routing
require('./custom_modules/routing')(app);

// Start servers
httpServer.listen(serversettings.http_port, _ => console.log("HTTP server listening on " + serversettings.http_port));