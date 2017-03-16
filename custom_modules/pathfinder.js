const request = require('request');
const googleAPIKey = require('../serversettings.json').googleapikey;

var pathfinder = module.exports = {

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
	 * Given location, start point and a number of drivers, will attempt to return a route for each driver.
	 * Will return a Promise that on success resolve to an array containing navigation waypoints for each driver. (Driver 1's navigation is in results[0])
	 * @param {Object} start Lat/lng object representing start location
	 * @param {Object[]} locations An array of locations (which will be geocoded)
	 * @param {number} numDrivers The amount of drivers on the delivery
	 * @return {Promise}
	 */
	calculateRoute: function(start, locations, numDrivers) {
		return Promise.all(locations.filter(el => el.id != 12 /*Filter out admin*/).map(pathfinder.geocode)).then(
			geolocs => pathfinder.calculateRouteDrivers(geolocs, start, 2)
		);
	},

	/**
	 * Takes an array of locations (lat/lng objects) and a number of drivers and splits those locations up based on their angle from the start location.
	 * Returns an array containing an array of locations for each driver.
	 * @param {Object[]} locations An array of lat/lng objects representing destinations
	 * @param {Object} startLocation A lat/lng object representing the start point of the route
	 * @param {number} numDrivers The number of drivers that will be helping with this delivery
	 * @return {Object[][]}
	 */
	calculateRouteDrivers: function(locations, startLocation, numDrivers) {
		locations = locations.map((latlng, i) => {
			return {
				index: i, // Original index in the array
				lat: latlng.lat,
				lng: latlng.lng,
				ang: Math.atan2(latlng.lat - startLocation.lat, latlng.lng - startLocation.lng)
			};
		}).sort((a, b) => a.ang - b.ang);

		var driverArr = [];
		var perDriver = Math.floor(locations.length / numDrivers),extraLocs = locations.length % numDrivers;
		for (var i = 0; i < numDrivers; i++)
			driverArr.push(locations.splice(0, (i < extraLocs ? 1 : 0) + perDriver));
		
		return driverArr;
	}
};