const expressSession = require('express-session');
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const users = require('./users');

module.exports = function(app) {
	// Middlewares
	app.use(expressSession({secret: "ormskirknewspaper", resave: true, saveUninitialized: true}));
	app.use(passport.initialize());
	app.use(passport.session());

	// Login strategy
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
	passport.deserializeUser((id, done) => users.getById(id).then(user => done(null, user), err => done(err, null)));

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