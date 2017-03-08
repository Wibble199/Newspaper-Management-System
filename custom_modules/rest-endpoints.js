const users = require('./users');

module.exports = function(app) {
	// ------------------------ //
	// USER PROFILE END POINTS //
	// ---------------------- //
	// Get user information
	app.get("/user", requireAuth((req, res) => {
		res.json({user: req.user});
	}));

	// Update the users password
	app.post("/password", requireAuth((req, res) => {
		users.updatePassword(req.user.id, req.body.password).then(
			() => res.json({success: true}),
			err => res.json({success: false, err})
		);
	}));

	// ----------------------------- //
	// USER SUBSCRIPTION END POINTS //
	// --------------------------- //
	// Fetch all subscriptions
	app.get("/subscriptions", requireAuth((req, res) => {
		users.getSubscriptions(req.user.id).then(
			results => res.json({success: true, results}),
			err => res.json({success: false, err})
		);
	}));

	// Fetch all cancellations
	app.get("/cancellations", requireAuth((req, res) => {
		users.getCancellations(req.user.id).then(
			results => res.json({success: true, results}),
			err => res.json({success: false, err})
		);
	}));
};

/**
 * Function that checks a request to ensure that it is authenticated with passport and if so calls the `next` function with (req, res) objects from the route. If not authenticated then uses the response object and sends back a 401 error.
 * Designed to fit subtley and elegantly into an app.get or app.post etc. call.
 * @param {function} next The function to be called if request is authenticated
 */
function requireAuth(next) {
	return function(req, res) {
		if (req.isAuthenticated())
			next(req, res);
		else
			res.status(401).send("Unauthorized");
	};
}

/**
 * Function that checks a request to ensure that it is authenticated with an admin account and if so calls the `next` function with (req, res) objects from the route. If not authenticated or not admin account then uses the response object and sends back a 401 error.
 * @param {function} next The function to be called if request is authenticated with admin account
 */
function requireAdmin(next) {
	return function(req, res) {
		if (req.isAuthenticated() && req.user.isAdmin)
			next(req, res);
		else
			res.status(401).send("Unauthorized");
	}
}