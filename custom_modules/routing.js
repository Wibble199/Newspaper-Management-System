const request = require('request');
const googleApiKey = "***REMOVED***";
const appDir = require('path').resolve("./app");

module.exports = function(app) {
	app.get('/', (req, res) => {
		if (req.isAuthenticated())
			res.sendFile(appDir + "/html/" + (req.user.is_admin ? "dashboard" : "app") + ".html");
		else
			res.sendFile(appDir + "/html/login.html");
	});

	app.get("/googlemapsapi", (req, res) => request.get(`https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&callback=${req.query.cb}`).pipe(res));

	require('./rest-endpoints.js')(app);
};