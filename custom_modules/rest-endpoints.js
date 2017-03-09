const db = require('./db-interface');

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
		db.users.updatePassword(req.user.id, req.body.password).then(
			() => res.json({success: true}),
			err => res.json({success: false, err})
		);
	}));

	// ----------------------------- //
	// USER SUBSCRIPTION END POINTS //
	// --------------------------- //
	// Fetch all subscriptions
	app.get("/subscriptions", requireAuth((req, res) => {
		db.subscriptions.getByUserId(req.user.id).then(
			results => res.json({success: true, results}),
			err => res.json({success: false, err})
		);
	}));

	// Add new subscription
	app.post("/subscriptions", requireAuth((req, res) => {
		req.body.customer_id = req.user.id; // Add the user ID to the data for the subscription
		db.subscriptions.insert(req.body).then(
			newId => res.json({success: true, id: newId}),
			err => res.json({success: false, err})
		)
	}));

	// Update existing subscription
	app.put("/subscriptions/:id", requireAuth((req, res) => {
		req.body.customer_id = req.user.id; // Add the user ID to the data for the subscription
		(req.user.is_admin ? Promise.resolve() : db.subscriptions.getById(req.params.id).then(sub => { // Ensure the customer who is attempting to update this row is the customer that created it (or an admin)
			if (sub.customer_id != req.user.id)
				throw "Invalid user ID";
		})).then(
			() => db.subscriptions.update(req.params.id, req.body)
		).then(
			() => res.json({success: true}),
			err => res.json({success: false, err})
		);
	}));

	// Delete existing subscription
	app.delete("/subscriptions/:id", requireAuth((req, res) => {
		(req.user.is_admin ? Promise.resolve() : db.subscriptions.getById(req.params.id).then(sub => { // Ensure the customer who is attempting to delete this row is the customer that created it (or an admin)
			if (sub.customer_id != req.user.id)
				throw "Invalid user ID";
		})).then(
			() => db.subscriptions.delete(req.params.id)
		).then(
			() => res.json({success: true}),
			err => res.json({success: false, err})
		);
	}));

	// --------------------------- //
	// USER SUSPENSION END POINTS //
	// ------------------------- //
	// Fetch all suspensions
	app.get("/suspensions", requireAuth((req, res) => {
		db.suspensions.getByUserId(req.user.id).then(
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
		if (req.isAuthenticated() && req.user.is_admin)
			next(req, res);
		else
			res.status(401).send("Unauthorized");
	}
}