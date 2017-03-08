const bcrypt = require('bcryptjs');
const db = require('./db');

module.exports = {
	// ----------------------- //
	// Authentication related //
	// --------------------- //
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
	},

	// --------------------- //
	// Subscription related //
	// ------------------- //
	
	/**
	 * Fetch the subscriptions for a particular user.
	 * @param {number} id The ID of the user to fetch the subscriptions for
	 * @returns {Promise}
	 */
	getSubscriptions: function(id) {
		return new Promise(function(resolve, reject) {
			db.query("SELECT subscriptions.*, publications.name FROM subscriptions INNER JOIN publications ON subscriptions.publication_id = publications.id WHERE customer_id = ?;", [id], (err, results) => {
				if (err) reject(err);
				else resolve(results);
			});
		});
	},

	/**
	 * Fetch the cancellations for a particular user.
	 * @param {number} id The ID of the user to fetch the subscriptions for
	 * @returns {Promise}
	 */
	getCancellations: function(id) {
		return new Promise(function(resolve, reject) {
			db.query("SELECT * FROM temporary_cancellations WHERE customer_id = ?", [id], (err, results) => {
				if (err) reject(err);
				else resolve(results);
			});
		});
	}
};