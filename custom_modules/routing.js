const passport = require('passport');

const appDir = require('path').resolve("./app");

module.exports = function(app) {
	app.get('/', (req, res) => {
		if (req.isAuthenticated())
			res.sendFile(appDir + "/html/app.html"); // This will be changed to res.render eventually
		else
			res.sendFile(appDir + "/html/login.html");
	});

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
};