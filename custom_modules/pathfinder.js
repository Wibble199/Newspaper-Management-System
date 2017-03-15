const request = require('request');
const googleAPIKey = require('../serversettings.json').googleapikey;

module.exports = {

	/**
	 * Attempts to lookup an address and convert it to latitude, longitude using the Google Geocoding API.
	 * Returns a Promise that will resolve with an object with `lat` and `lng` properties or reject with an error.
	 * @param {Object} opt Options to use when geocoding. Will use address1 - address4 (if present) and postcode
	 * @returns {Promise}
	 */
	geocode: function(opt) {
		return new Promise(function(resolve, reject) {
			if (!opt.postcode) return Promise.reject("No postcode");

			// Compile the address
			var search = [];
			for (var i = 1; i <= 4; i++)
				if (opt["address" + i])
					search.push(opt["address" + i]);
			search.push(opt.postcode);

			// Make the request
			request.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(search.join(","))}&key=${googleAPIKey}`, (err, res, body) => {
				if (!err && res.statusCode == 200) {
					var jsonBody = JSON.parse(body);
					if (jsonBody.results.length >= 1)
						resolve(jsonBody.results[0].geometry.location);
					else
						reject("No results");
				} else
					reject(err);
			});
		});
	},

	/**
	 * Attempts to create a journey between two points, optionally stopping at waypoints on the way.
	 * Returns a Promise that will resolve with Google Maps response (https://developers.google.com/maps/documentation/directions/intro#DirectionsResponses) or reject with an error.
	 * @param {string} start The starting point for the navigation
	 * @param {string} end The ending point for the navigation
	 * @param {string[]} waypoints The waypoints to stop at on the journey between start and end
	 * @returns {Promise}
	 */
	navigate: function(start, end, waypoints) {
		return new Promise(function(resolve, reject) {
			// Generate `|` delimited waypoint string
			var wp = (waypoints && waypoints.length > 0) ? ("&waypoints=" + waypoints.map(encodeURIComponent).join("|")) : "";

			// Make request
			request.get(`https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(start)}&destination=${encodeURIComponent(end)}${wp}&key=`, (err, res, body) => {
				if (!err && res.statusCode == 200)
					resolve(JSON.parse(body));
				else
					reject(err);
			});
		});
	}
};