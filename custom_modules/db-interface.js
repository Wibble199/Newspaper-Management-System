const bcrypt = require('bcryptjs');
const fs = require('fs');
const db = require('./db-connection');
const validator = require('./validator');

// Function that will dynamically load all SQL queries in the `./app/sql` folder and put them in `loadedQueries` object
var loadedQueries = {};
fs.readdirSync("./app/sql").forEach(fname => {
	var normalisedName = fname.substring(0, fname.lastIndexOf(".")).replace(/-([a-z])/g, (_, l) => l.toUpperCase()); // Converts dashed name to camel case. E.g. test-file-string => testFileString
	loadedQueries[normalisedName] = fs.readFileSync("./app/sql/" + fname, 'utf8');
});

var dbInterface = module.exports = {
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
			return db.asyncQuery("SELECT * FROM customers WHERE customers.id = ?", [id]).then(results => {
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
			return db.asyncQuery("SELECT * FROM customers WHERE LOWER(customers.email) = ?", [email.toLowerCase()]).then(results => { // Find the user from email
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

			return db.asyncQuery("UPDATE customers SET password = ? WHERE customers.id = ?", [password, id]).then(results => {
				if (results.affectedRows != 1)
					throw new Error("No user found with id " + id);
			});
		}
	},

	// ----------------- //
	// Customer related //
	// --------------- //
	customers: {
		/**
		 * Fetch all customers.
		 * @returns {Promise}
		 */
		get: function() {
			return db.asyncQuery("SELECT * FROM customers").then(results => {
				results.forEach(customer => delete customer.password); // Remove the passwords
				return results;
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
			return db.asyncQuery("SELECT s.*, p.name, p.color FROM subscriptions AS s INNER JOIN publications AS p ON s.publication_id = p.id");
		},

		/**
		 * Fetch a specific subscription
		 * @param {number} id The ID of the subscription to fetch
		 * @returns {Promise}
		 */
		getById: function(id) {
			return db.asyncQuery("SELECT s.*, p.name, p.color FROM subscriptions AS s INNER JOIN publications AS p ON s.publication_id = p.id WHERE s.id = ?", [id]).then(results => {
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
			return db.asyncQuery("SELECT s.*, p.name, p.color FROM subscriptions AS s INNER JOIN publications AS p ON s.publication_id = p.id WHERE s.customer_id = ?", [id]);
		},

		/**
		 * Fetch the subscriptions for a particular customer, but will only return unique publications. 
		 * @param {number} id The ID of the user to fetch the subscriptions for
		 * @returns {Promise}
		 */
		getByUserIdUnique: function(id) {
			return db.asyncQuery("SELECT p.id as id, p.name FROM subscriptions AS s INNER JOIN publications AS p ON s.publication_id = p.id WHERE s.customer_id = ?", [id]);
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
			return db.asyncQuery("SELECT id FROM subscriptions WHERE customer_id = ? AND publication_id = ? AND start_date < ? AND end_date > ?", [data.customer_id, data.publication_id, data.end_date, data.start_date]).then(results => {
				if (results.length != 0) 
					throw new ValidationError("Overlapping dates with existing subscription"); // If an overlapping identical publication was found throw an error
				// Else if no overlap was found - go ahead to the next query
				
			}).then(() => 
				// For the parameters to pass into the query, reduce to only contain the ones in the array (if extra stuff it in the object the query would be invalid)
				db.asyncQuery("INSERT INTO subscriptions SET ?", reducedCopy(data, ["customer_id", "publication_id", "start_date", "end_date", "delivery_days"]))

			).then(results => results.insertId); // On query successful finish return the newly created item's id (will pass error forwards)
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

			return db.asyncQuery("SELECT id FROM subscriptions WHERE id != ? AND customer_id = ? AND publication_id = ? AND start_date < ? AND end_date > ?", [id, data.customer_id, data.publication_id, data.end_date, data.start_date]).then(results => {
				if (results.length != 0)
					throw new ValidationError("Overlapping dates with existing subscription"); // If an overlapping identical publication was found throw an error
			
			}).then(() =>
				// For the array of values for the query, the reducedCopied object will be used for SET and the id will be used for... well... id
				// We get something like: UPDATE subscriptions `SET customer_id = 1, publication_id = 2 ...<ETC>... WHERE id = 5` which is what we need
				db.asyncQuery("UPDATE subscriptions SET ? WHERE id = ?", [reducedCopy(data, ["customer_id", "publication_id", "start_date", "end_date", "delivery_days"]), id])

			).then(results => {
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
			return db.asyncQuery("DELETE FROM subscriptions WHERE id = ?", [id]).then(results => {
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
			return db.asyncQuery("SELECT * FROM suspensions");
		},

		/**
		 * Fetch the suspensions by suspension ID. Returns a promise that resolves with results or rejects with error.
		 * @param {number} id The ID of the suspension to fetch
		 * @returns {Promise}
		 */
		getById: function(id) {
			return db.asyncQuery("SELECT * FROM suspensions WHERE id = ?", [id]).then(results => {
				if (results.length != 1)
					throw new Error("No suspension found with that ID");
				return results[0];
			});
		},

		/**
		 * Fetch the suspensions for a particular user. Returns a promise that resolves with results or rejects with error.
		 * @param {number} id The ID of the user to fetch the suspensions for
		 * @returns {Promise}
		 */
		getByUserId: function(id) {
			return db.asyncQuery("SELECT * FROM suspensions WHERE customer_id = ?", [id]);
		},

		/**
		 * Attempts to add a new suspension into the system. It must not overlap any suspensions that the customer already has.
		 * Returns a Promise that will be resolved with the newly inserted ID on success or reject with an error.
		 * @param {object} data The map containing the properties for the suspension (customer_id, start_date, end_date)
		 * @returns {Promise}
		 */
		insert: function(data) {
			var err = validator.validateMap({
				customer_id: validator.NUMBERS_ONLY,
				start_date: validator.DATE_YYYY_MM_DD,
				end_date: validator.DATE_YYYY_MM_DD
			}, data);

			if (err) return Promise.reject(new ValidationError(err));

			return db.asyncQuery("SELECT id FROM suspensions WHERE customer_id = ? AND start_date < ? AND end_date > ?", [data.customer_id, data.end_date, data.start_date]).then(results => {
				if (results.length > 0)
					throw new ValidationError("A suspension overlapping these dates for this customer already exists");
			}).then(() =>
				db.asyncQuery("INSERT INTO suspensions SET ?", reducedCopy(data, ["customer_id", "start_date", "end_date"]))
			).then(
				results => results.insertId
			);
		},

		/**
		 * Attempts to update an existing suspension.
		 * Returns a Promise that will resolve with no value on success or reject on error.
		 * @param {number} id The ID of the suspension to update
		 * @param {object} data The data to update the suspension with
		 */
		update: function(id, data) {
			var err = validator.validateMap({
				customer_id: validator.NUMBERS_ONLY,
				start_date: validator.DATE_YYYY_MM_DD,
				end_date: validator.DATE_YYYY_MM_DD
			}, data);

			if (err) return Promise.reject(new ValidationError(err));

			return db.asyncQuery("SELECT id FROM suspensions WHERE id != ? AND customer_id = ? AND start_date < ? AND end_date > ?", [id, data.customer_id, data.end_date, data.start_date]).then(results => {
				if (results.length > 0)
					throw new ValidationError("A suspension overlapping these dates for this customer already exists");
			}).then(() =>
				db.asyncQuery("UPDATE suspensions SET ? WHERE id = ?", [reducedCopy(data, ["customer_id", "start_date", "end_date"]), id])
			).then(results => {
				if (results.affectedRows != 1)
					throw new ValidationError("Failed to update row with that ID");
			});
		},

		/**
		 * Attempt to delete a suspension with a particular ID.
		 * Returns a Promise that will resolve with no value on success or reject on error.
		 * @param {number} id The ID of the suspension to attempt to delete
		 */
		delete: function(id) {
			return db.asyncQuery("DELETE FROM suspensions WHERE id = ?", [id]).then(results => {
				if (results.affectedRows != 1) // If any less than 1 row was affected, the operation was unsuccessful
					throw new ValidationError("Failed to delete row with given ID");
			});
		}
	},

	// -------------------- //
	// Publication related //
	// ------------------ //
	publications: {
		/**
		 * Fetch all publications. Returns a promise that resolves with results or rejects with error.
		 * @returns {Promise}
		 */
		get: function() {
			return db.asyncQuery("SELECT * FROM publications");
		}
	},

	// ---------------- //
	// Payment related //
	// -------------- //
	payments: {
		/**
		 * Fetch all payments. Returns a promise that resolves with results or rejects with error.
		 * @returns {Promise}
		 */
		get: function() { return db.asyncQuery("SELECT * FROM payments"); },

		/**
		 * Return the amount a customer owes in unpaid subscriptions, grouped by week.
		 * Returns a promise that resolves the week and amount (or null if up to date with payments) or rejects with error.
		 * @param {number} customer The customer ID
		 * @returns {Promise}
		 */
		getUnpaidFees: function(customer) {
			return db.asyncQueryNamed(loadedQueries.calculateUnpaidPayments, {customer});
		},

		/**
		 * Updates a customer's latest payment date with the one provided (YYYY-WW)
		 * @param {number} customer The customer's ID
		 * @param {string} newVal The new week (YYYY-WW)
		 * @returns {Promise}
		 */
		update: function(customer, newVal) {
			if (!/^\d{4}-\d{2}$/.test(newVal)) return Promise.reject(new ValidationError("Invalid week format"));
			return db.asyncQuery("UPDATE customers SET latest_payment = ? WHERE id = ?", [newVal, customer]).then(results => {
				if (results.affectedRows != 1)
					throw new ValidationError("Failed to update customer's payment date");
			});
		}
	},

	// -------------------------- //
	// Generation-only functions //
	// ------------------------ //
	generate: {
		/**
		 * Generates a list of subscriptions for a customer for a particular month.
		 * Returns the date, publication name and publication color for all days in that month.
		 * @param {number} customerId The ID of the customer whose calendar dates to fetch
		 * @param {number|string} year The year of the month to fetch results for
		 * @param {number|string} month The month to fetch results for (1 - 12 not 0 - 11)
		 * @returns {Promise}
		 */
		calendarEvents: function(customerId, year, month) {
			return db.asyncQueryNamed(loadedQueries.generateCalendarEvents, {customerId, year, month});
		},

		/**
		 * Generates a result set that contains the deliveries for a particular day.
		 * Returns customer id, name and address and publication id and name.
		 * @param {string} day The day to generate the results for (format: `YYYY-MM-DD`)
		 * @returns {Promise}
		 */
		deliveryList: function(day) {
			return db.asyncQueryNamed(loadedQueries.generateDeliveryList, {day});
		},

		/**
		 * Like `deliveryList` this function generates a result set that contains the deliveries for a particular day.
		 * Instead of resolving with two array items for a customer with 2 subscriptions this will instead resolve with arrays for `publication_id` and `publication_name`
		 * @param {string} day The day to generate the results for (format: `YYYY-MM-DD`)
		 * @returns {Promise}
		 */
		deliveryListGrouped: function(day) {
			return dbInterface.generate.deliveryList(day).then(results => {
				// This function takes the results of multiple SQL rows and flattens them by customer.
				// This relies on the array being sorted by customer ID so that all entries for a customer are adjacent to one another.
				var mappedResults = [], el, j;
				for (var i = 0; el = results[i]; i++) // Set el to be the current element
					if (i == 0 || results[i].customer_id != results[i - 1].customer_id) { // If we are on the first entry or the customer we are on is different to the last customer
						// Create a new entry in the mapping array with this (next) customer
						j = mappedResults.push(results[i]) - 1; // Set j to be the array index of the last inserted customer mapping
						mappedResults[j].publication_id = [mappedResults[j].publication_id];     // Replace `publication_id` number and `publication_name` string with
						mappedResults[j].publication_name = [mappedResults[j].publication_name]; // An array which for now just contains the same value (e.g. "Foo" => ["Foo"])

					} else { // Otherwise if this customer is the same as the last one
						mappedResults[j].publication_id.push(results[i].publication_id); // Simply add this `publication_id` and `publication_name` the arrays
						mappedResults[j].publication_name.push(results[i].publication_name); // in the corresponding mapped results array object (j still refers to the latest item in mappedResults)
					}
				return mappedResults;
			});
		}
	},

	// -------------------------- //
	// Metrics related functions //
	// ------------------------ //
	metrics: {
		weeklySubsByDay: function(day) {
			return db.asyncQueryNamed(loadedQueries.weeklySubsByDay, {day}).then(
				results => {
					var newData = {};
					results.forEach(el => {
						if (!newData[el.publication_id])
							newData[el.publication_id] = [0, 0, 0, 0, 0, 0, 0, 0];
						newData[el.publication_id][el.day] = el.count;
						newData[el.publication_id][7] += el.count; // Last is total
					});
					return newData;
				}
			);
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

// ValidationError class
// TODO: BETTER ERROR HANDLING!!!!
function ValidationError(err) {
	this.code = "ERR_VALIDATION";
	this.invalidFields = err;
}