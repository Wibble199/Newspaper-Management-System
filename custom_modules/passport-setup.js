const expressSession = require('express-session');
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const db = require('./db-interface');

module.exports = function(app) {
	// User cache to prevent repeated SQL calls each time a logged in user makes any request to the server
	var userCache = {};
	var enableUserCache = process.argv.indexOf("--disable-user-cache") < 0;

	// Middlewares
	app.use(expressSession({secret: "ormskirknewspaper", resave: true, saveUninitialized: true}));
	app.use(passport.initialize());
	app.use(passport.session());

	// Login strategy
	passport.use(new Strategy({usernameField: "email", passwordField: "password"}, function(username, password, done) {
		db.users.checkLogin(username, password).then(function(user) { // If login passed
			done(null, user);

		}, function(err) { // If login failed
			// if server error
			// done(err);
			// if password error
			done(null, false);
		});
	}));

	// User serialization
	passport.serializeUser((user, done) => done(null, user.id));
	passport.deserializeUser((id, done) => {
		if (enableUserCache && userCache[id])
			done(null, userCache[id]);
		else
			db.users.getById(id).then(
				user => {
					if (enableUserCache) userCache[id] = user;
					done(null, user);
				},
				err => done(err, null)
			)
	});

	// Login routing
	app.post('/login', (req, res, next) => {
		passport.authenticate('local', (err, user, info) => {
			if (err) next(err);
			if (user)
				req.login(user, err => {
					if (err) next(err);
					res.json({success: true});
				});

			else
				res.json({success: false});

		})(req, res, next);
	});

	app.get('/logout', (req, res) => {
		req.logout();
		res.redirect("/");
	});
}