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

	// ------------------------------- //
	// CUSTOMER MANAGEMENT END POINTS //
	// ----------------------------- //
	app.get("/customers", requireAdmin((req, res) => {
		db.customers.get().then(
			results => res.json({success: true, results}),
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

	// Fetch single subscription
	app.get("/subscriptions/:id", requireAuth((req, res) => {
		db.subscriptions.getById(req.params.id).then(
			result => {
				if (req.user.is_admin || result.customer_id == req.user.id) res.json({success: true, result});
				else throw "You do not have permission to view that subscription";
			}
		).catch(
			err => res.json({success: false, err})
		);
	}));

	// Add new subscription
	app.post("/subscriptions", requireAuth((req, res) => {
		req.body.customer_id = req.user.id; // Add the user ID to the data for the subscription (will also ensure that customers cannot subscribe other customers)
		db.subscriptions.insert(req.body).then(
			id => res.json({success: true, id}),
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

	// Fetch single suspension
	app.get("/suspensions/:id", requireAuth((req, res) => {
		db.suspensions.getById(req.params.id).then(
			result => {
				if (req.user.is_admin || result.customer_id == req.user.id) res.json({success: true, result});
				else throw "You do not have permission to view that suspension";
			}
		).catch(
			err => res.json({success: false, err})
		);
	}));

	// Add new suspension
	app.post("/suspensions", requireAuth((req, res) => {
		req.body.customer_id = req.user.id;
		console.log(req.body);
		db.suspensions.insert(req.body).then(
			id => res.json({success: true, id}),
			err => res.json({success: false, err})
		);
	}));

	// Update existing suspension
	app.put("/suspensions/:id", requireAuth((req, res) => {
		req.body.customer_id = req.user.id; // Add the user ID to the data for the suspension
		(req.user.is_admin ? Promise.resolve() : db.suspensions.getById(req.params.id).then(susp => { // Ensure the customer who is attempting to update this row is the customer that created it (or an admin)
			if (susp.customer_id != req.user.id)
				throw "Invalid user ID";
		})).then(
			() => db.suspensions.update(req.params.id, req.body)
		).then(
			() => res.json({success: true}),
			err => res.json({success: false, err})
		);
	}));

	// Delete existing suspension
	app.delete("/suspensions/:id", requireAuth((req, res) => {
		(req.user.is_admin ? Promise.resolve() : db.suspensions.getById(req.params.id).then(susp => { // Ensure the customer who is attempting to delete this row is the customer that created it (or an admin)
			if (susp.customer_id != req.user.id)
				throw "Invalid user ID";
		})).then(
			() => db.suspensions.delete(req.params.id)
		).then(
			() => res.json({success: true}),
			err => res.json({success: false, err})
		);
	}));

	// ----------------------- //
	// PUBLICATION END POINTS //
	// --------------------- //
	app.get("/publications", (req, res) => {
		db.publications.get().then(
			results => res.json({success: true, results}),
			err => res.json({success: false, err})
		);
	});

	// --------------------------- //
	// GENERATING-ONLY END POINTS //
	// ------------------------- //
	// Fetch the details from the calendar for a given month
	app.get('/calendar/:year/:month', requireAuth((req, res) => {
		Promise.all([
			db.generate.calendarEvents(req.user.id, req.params.year, req.params.month),
			db.suspensions.getByUserId(req.user.id)

		]).then(results => {
			var events = [];

			// results[0] = results from calendarEvents promise
			results[0].forEach(el => events.push({
				name: el.name,
				startdate: el.date,
				color: "#FFB128" // ToDo: Currently uses a fixed color
			}));

			// Currently it will return all suspensions for a user, not just the ones in the given month, but there
			// are likely to be relatively few suspensions so this should not be a big issue.
			// results[1] => results from suspensions.getByUserId promise
			results[1].forEach(el => events.push({
				name: "Suspension",
				startdate: new Date(el.start_date).toDateYYYYMMDD(),
				enddate: new Date(el.end_date).toDateYYYYMMDD(),
				color: "#FF2828"
			}));

			res.json({success: true, events});

		}).catch(
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

/**
 * Function returns a date string in the format 'YYYY-MM-DD' for the given date.
 * @returns {string}
 */
Date.prototype.toDateYYYYMMDD = function() {
	var mon = this.getMonth() + 1, day = this.getDate();
	return this.getFullYear() + "-" + (mon < 10 ? "0" : "") + mon + "-" + (day < 10 ? "0" : "") + day;
}