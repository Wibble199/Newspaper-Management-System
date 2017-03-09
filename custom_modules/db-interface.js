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
			return asyncQuery("SELECT * FROM customers WHERE customers.id = ?", [id]).then(results => {
				if (results.length != 1)
					throw new Error("No user found with id " + id);
				delete results[0].password; // Delete the password property
				return results[0]; // Return the user
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
			return asyncQuery("SELECT * FROM customers WHERE LOWER(customers.email) = ?", [email.toLowerCase()]).then(results => { // Find the user from email
				if (results.length != 1) // No user with email was found
					throw new Error("Invalid login credentials");

				// Else if a user was found with that email
				if (bcrypt.compareSync(pwd, results[0].password)) { // Check password hash
					delete results[0].password; // Delete pw so it doesn't get returned
					return results[0]; // Rsolve with the user's data

				} else // If invalid password
					throw new Error("Invalid login credentials");
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

			password = bcrypt.hashSync(password, 10); // Hash the PW

			return asyncQuery("UPDATE customers SET password = ? WHERE customers.id = ?", [password, id]).done(results => {
				if (results.affectedRows != 1)
					throw new Error("No user found with id " + id);
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
			return asyncQuery("SELECT s.*, p.name FROM subscriptions AS s INNER JOIN publications AS p ON s.publication_id = p.id");
		},

		/**
		 * Fetch a specific subscription
		 * @param {number} id The ID of the subscription to fetch
		 * @returns {Promise}
		 */
		getById: function(id) {
			return asyncQuery("SELECT s.*, p.name FROM subscriptions AS s INNER JOIN publications AS p ON s.publication_id = p.id WHERE s.id = ?", [id]).then(results => {
				if (results.length != 1)
					throw new Error("No subscription found with that ID");
				return results[0];
			});
		},

		/**
		 * Fetch the subscriptions for a particular customer.
		 * @param {number} id The ID of the user to fetch the subscriptions for
		 * @returns {Promise}
		 */
		getByUserId: function(id) {
			return asyncQuery("SELECT s.*, p.name FROM subscriptions AS s INNER JOIN publications AS p ON s.publication_id = p.id WHERE s.customer_id = ?", [id]);
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

			// First check if this customer is already subscribed to this publication during these dates
			return asyncQuery("SELECT id FROM subscriptions WHERE customer_id = ? AND publication_id = ? AND start_date < ? AND end_date > ?", [data.customer_id, data.publication_id, data.end_date, data.start_date]).then(results => {
				if (results.length != 0) 
					throw new ValidationError("Overlapping dates with existing subscription"); // If an overlapping identical publication was found throw an error
				// Else if no overlap was found - go ahead to the next query
				
			}).then(() => 
				// For the parameters to pass into the query, reduce to only contain the ones in the array (if extra stuff it in the object the query would be invalid)
				asyncQuery("INSERT INTO subscriptions SET ?", reducedCopy(data, ["customer_id", "publication_id", "start_date", "end_date", "delivery_days"]))

			).then(results => { // On query successful finish (pass error forwards)
				return results.insertId; // Return the newly created item's id
			});
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

			return asyncQuery("SELECT id FROM subscriptions WHERE id != ? AND customer_id = ? AND publication_id = ? AND start_date < ? AND end_date > ?", [id, data.customer_id, data.publication_id, data.end_date, data.start_date]).then(results => {
				if (results.length != 0)
					throw new ValidationError("Overlapping dates with existing subscription"); // If an overlapping identical publication was found throw an error
			
			}).then(() =>
				// For the array of values for the query, the reducedCopied object will be used for SET and the id will be used for... well... id
				// We get something like: UPDATE subscriptions `SET customer_id = 1, publication_id = 2 ...<ETC>... WHERE id = 5` which is what we need
				asyncQuery("UPDATE subscriptions SET ? WHERE id = ?", [reducedCopy(data, ["customer_id", "publication_id", "start_date", "end_date", "delivery_days"]), id])

			).then(() => {
 				if (results.affectedRows != 1) // If 1 row alone was updated, the operation was successful
					throw new ValidationError("Failed to update row with that ID");
			});
		},

		/**
		 * Attempts to delete an existing subscription in the database
		 * Returns a Promise that will reject on failure or resolve with no value on success.
		 * @param {number} id The ID of the subscription to delete
		 * @returns {Promise}
		 */
		delete: function(id) {
			return asyncQuery("DELETE FROM subscriptions WHERE id = ?", [id]).then(results => {
				if (results.affectedRows != 1) // If any less than 1 row was affected, the operation was unsuccessful
					throw new ValidationError("Failed to delete row with given ID");
			});
		}
	},

	// ------------------- //
	// Suspension related //
	// ----------------- //
	suspensions: {
		/**
		 * Fetch all suspensions. Returns a promise that resolves with results or rejects with error.
		 * @returns {Promise}
		 */
		get: function() {
			return asyncQuery("SELECT * FROM suspensions");
		},

		/**
		 * Fetch the suspensions for a particular user. Returns a promise that resolves with results or rejects with error.
		 * @param {number} id The ID of the suspension to fetch
		 * @returns {Promise}
		 */
		getById: function(id) {
			return asyncQuery("SELECT * FROM suspensions WHERE id = ?", [id]);
		},

		/**
		 * Fetch the suspensions for a particular user. Returns a promise that resolves with results or rejects with error.
		 * @param {number} id The ID of the user to fetch the suspensions for
		 * @returns {Promise}
		 */
		getByUserId: function(id) {
			return asyncQuery("SELECT * FROM suspensions WHERE customer_id = ?", [id]);
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

/**
 * Performs a query on the database and returns a promise which will resolve with the result of the query or, if an error occurs, will reject with that error.
 * @param {string} query The query to perform on the database
 * @param {object | *[]} [queryParams] Any parameters to be passed to the query (see https://www.npmjs.com/package/mysql#performing-queries)
 * @returns {Promise}
 */
function asyncQuery(query, queryParams) {
	return new Promise(function(resolve, reject) {
		db.query(query, queryParams, (err, results) => {
			if (err) reject(err);
			else resolve(results);
		});
	});
}

// ValidationError class
// TODO: BETTER ERROR HANDLING!!!!
function ValidationError(err) {
	this.code = "ERR_VALIDATION";
	this.invalidFields = err;
}