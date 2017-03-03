const crypto = require('crypto');
const db = require('./db');

// Returns a single user based on their ID (primary key)
function getUserById(id) {
	return new Promise(function(resolve, reject) {
		db.query("SELECT * FROM customers WHERE customers.id = ?", [id], (err, results) => {
			if (err) reject(err);
			else if (results.length == 1) resolve(results[0]);
			else reject(Error("No user found with id " + id));
		});
	});
}

// Attempts to log a user in with the given email and password
// Password should already be encrypted in the form sha256(email + ":" + password)
function checkLogin(email, pwd, done) {
	return new Promise(function(resolve, reject) {
		db.query("SELECT * FROM customers WHERE customers.email = ? AND customers.password = ?", [email, pwd], (err, results) => {
			if (err) reject(err);
			else if (results.length == 1) resolve(results[0]);
			else reject(Error("Invalid login credentials"));
		});
	});
}

// Export
module.exports = {
	getUserById,
	checkLogin
};