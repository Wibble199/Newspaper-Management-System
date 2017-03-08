const bcrypt = require('bcryptjs');
const db = require('./db-connection');
const validator = require('./validator');

module.exports = {
	// ----------------------- //
	// Authentication related //
	// --------------------- //
	users: {
		/**
		 * Get a single user based on their ID (primary key).
		 * Returns a Promise object that rejects on server error or if no user was found and resolves with the user object (minus password hash) on success.
		 * @param {number} id ID of the user to find
		 * @returns {Promise}
		 */
		getById: function(id) {
			return new Promise((resolve, reject) => {
				db.query("SELECT * FROM customers WHERE customers.id = ?", [id], (err, results) => {
					if (err) reject(err);
					else if (results.length == 1) {
						delete results[0].password; // Delete the password property
						resolve(results[0]); // Return the user
					} else reject(Error("No user found with id " + id));
				});
			});
		},

		/**
		 * Checks if the given email and password combination match for a user.
		 * Returns a Promise that will reject with an error on server error or login error, and resolves to have the user object (minus password hash) if the email-password combination was correct.
		 * @param {string} email The email address of the user trying to log in
		 * @param {string} pwd The password the user entered (NOT ENCRYPTED)
		 * @returns {Promise}
		 */
		checkLogin: function(email, pwd) {
			return new Promise((resolve, reject) => {
				db.query("SELECT * FROM customers WHERE LOWER(customers.email) = ?", [email.toLowerCase()], (err, results) => { // Find the user from email
					if (err) // Server error
						reject(err);
					else if (results.length != 1) // No user with email was found
						reject(Error("Invalid login credentials"));

					else { // If a user was found with that email
						if (bcrypt.compareSync(pwd, results[0].password)) { // Check password hash
							delete results[0].password; // Delete pw so it doesn't get returned
							resolve(results[0]); // Rsolve with the user's data

						} else // If invalid password
							reject(Error("Invalid login credentials"));
					}
				});
			});
		},

		/**
		 * Encrypts and updates the password for a specific user in the database.
		 * Returns a Promise object that rejects on error or resolve (with no value) on success.
		 * @param {number} id The ID of the user whose password to update
		 * @param {string} password UNENCRYPTED password to be used
		 * @returns {Promise}
		 */
		updatePassword: function(id, password) {
			if (!password) return Promise.reject("Invalid password");

			return new Promise((resolve, reject) => {
				password = bcrypt.hashSync(password, 10);

				db.query("UPDATE customers SET password = ? WHERE customers.id = ?", [password, id], (err, results) => {
					if (err) reject(err);
					else if (results.affectedRows == 1) resolve();
					else reject(Error("No user found with id " + id));
				});
			});
		}
	},

	// --------------------- //
	// Subscription related //
	// ------------------- //
	subscriptions: {
		/**
		 * Fetch the subscriptions for a all customers.
		 * @returns {Promise}
		 */
		get: function() {
			return new Promise(function(resolve, reject) {
				db.query("SELECT s.*, p.name FROM subscriptions AS s INNER JOIN publications AS p ON s.publication_id = p.id", (err, results) => {
					if (err) reject(err);
					else resolve(results);
				});
			});
		},

		/**
		 * Fetch a specific subscription
		 * @param {number} id The ID of the subscription to fetch
		 * @returns {Promise}
		 */
		getById: function(id) {
			return new Promise(function(resolve, reject) {
				db.query("SELECT s.*, p.name FROM subscriptions AS s INNER JOIN publications AS p ON s.publication_id = p.id WHERE s.id = ?", [id], (err, results) => {
					if (err) reject(err);
					else if (results.length == 1) resolve(results[0]);
					else reject(Error("No subscription found with that ID"));
				});
			});
		},

		/**
		 * Fetch the subscriptions for a particular customer.
		 * @param {number} id The ID of the user to fetch the subscriptions for
		 * @returns {Promise}
		 */
		getByUserId: function(id) {
			return new Promise(function(resolve, reject) {
				db.query("SELECT s.*, p.name FROM subscriptions AS s INNER JOIN publications AS p ON s.publication_id = p.id WHERE s.customer_id = ?", [id], (err, results) => {
					if (err) reject(err);
					else resolve(results);
				});
			});
		},

		/**
		 * Attempts to add a subscription to the system.
		 * Returns Promise that will reject on failure (ValidationError [If data wrong] or Error [If SQL failed]) or resolve with the newly inserted ID on success.
		 * @param {object} data The additional data for the subscription (customer_id, publication_id, start_date, end_date, delivery_days)
		 * @returns {Promise}
		 */
		insert: function(data) {
			// Validate all the new fields
			var err = validator.validateMap({
				customer_id: validator.NUMBERS_ONLY,
				publication_id: validator.NUMBERS_ONLY,
				start_date: validator.DATE_YYYY_MM_DD,
				end_date: [validator.OPTIONAL, validator.DATE_YYYY_MM_DD],
				delivery_days: validator.NUMBERS_ONLY
			}, data);

			if (err) return Promise.reject(new ValidationError(err));

			return new Promise(function(resolve, reject) { // First check if this customer is already subscribed to this publication during these dates
				db.query("SELECT id FROM subscriptions WHERE customer_id = ? AND publication_id = ? AND start_date < ? AND end_date > ?", [data.customer_id, data.publication_id, data.end_date, data.start_date], (err, results) => {
					if (err) reject(err);
					else if (results.length == 0) resolve(); // If no overlap was found - go ahead to the next query
					else reject(new ValidationError("Overlapping dates with existing subscription")); // If an overlapping identical publication was found reject
				});

			}).then(new Promise(function(resolve, reject) {
				// Create an object with the data to go into the query
				var queryParams = reducedCopy(data, ["customer_id", "publication_id", "start_date", "end_date", "delivery_days"]); // Will ignore any other fields

				db.query("INSERT INTO subscriptions SET ?", queryParams, (err, results) => {
					if (err) reject(err);
					else resolve(results.insertId);
				});
			}));
		},

		/**
		 * Attempts to update an existing subscription in the database.
		 * Returns Promise that will reject on failure (ValidationError [If data wrong] or Error [If SQL failed]) or resolve with no parameter on success.
		 * @param {number} id The ID of the subscription to update
		 * @param {object} data The extra data for the subscription (customer_id, publication_id, start_date, end_date, delivery_days)
		 * @returns {Promise}
		 */
		update: function(id, data) {
			// Validate all the new fields
			var err = validator.validateMap({
				customer_id: validator.NUMBERS_ONLY,
				publication_id: validator.NUMBERS_ONLY,
				start_date: validator.DATE_YYYY_MM_DD,
				end_date: [validator.OPTIONAL, validator.DATE_YYYY_MM_DD],
				delivery_days: validator.NUMBERS_ONLY
			}, data);

			if (err) return Promise.reject(new ValidationError(err));

			return new Promise(function(resolve, reject) { // First check if this customer is already subscribed to this publication during these dates (and that the overlapping one is not the one being edited)
				db.query("SELECT id FROM subscriptions WHERE id != ? AND customer_id = ? AND publication_id = ? AND start_date < ? AND end_date > ?", [id, data.customer_id, data.publication_id, data.end_date, data.start_date], (err, results) => {
					if (err) reject(err);
					else if (results.length == 0) resolve(); // If no overlap was found - go ahead to the next query
					else reject(new ValidationError("Overlapping dates with existing subscription")); // If an overlapping identical publication was found reject
				});

			}).then(new Promise(function(resolve, reject) {
				// Create an object with the data to go into the query
				var queryParams = reducedCopy(data, ["customer_id", "publication_id", "start_date", "end_date", "delivery_days"]); // Will ignore any other fields

				db.query("UPDATE subscriptions SET ? WHERE id = ?", [queryParams, id], (err, results) => {
					if (err) reject(err);
					else if (results.affectedRows == 1) resolve();
					else reject(new ValidationError("Failed to update row with that ID"));
				});
			}));
		},

		/**
		 * Attempts to delete an existing subscription in the database
		 * Returns a Promise that will reject on failure or resolve with no value on success.
		 * @param {number} id The ID of the subscription to delete
		 * @returns {Promise}
		 */
		delete: function(id) {
			return new Promise(function(resolve, reject) {
				db.query("DELETE FROM subscriptions WHERE id = ?", [id], (err, results) => {
					if (err) reject(err);
					else if (results.affectedRows == 1) resolve();
					else reject(new ValidationError("Failed to delete row with given ID"))
				});
			});
		}
	},

	// ------------------- //
	// Suspension related //
	// ----------------- //
	suspensions: {
		/**
		 * Fetch the suspensions for a particular user.
		 * @param {number} id The ID of the user to fetch the subscriptions for
		 * @returns {Promise}
		 */
		get: function(id) {
			return new Promise(function(resolve, reject) {
				db.query("SELECT * FROM suspensions WHERE customer_id = ?", [id], (err, results) => {
					if (err) reject(err);
					else resolve(results);
				});
			});
		}
	}
};

/**
 * Creates a new object with the specified key-value pairs in the props array (shallow copy).
 * @example
 * createReducedObject({a: 1, b: 2, c: 3}, ["a", "b"]); // Returns {a: 1, b: 2}
 * @param {object} obj The object whose values to copy from
 * @param {string[]} props The list of properties to copy
 * @returns {object}
 */
function reducedCopy(obj, props) {
	var newObj = {};
	props.forEach(el => newObj[el] = obj[el]);
	return newObj;
}

function ValidationError(err) {
	this.code = "ERR_VALIDATION";
	this.invalidFields = err;
}