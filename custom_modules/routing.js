const appDir = require('path').resolve("./app");

module.exports = function(app) {
	app.get('/', (req, res) => {
		if (req.isAuthenticated())
			res.sendFile(appDir + "/html/app.html"); // This will be changed to res.render eventually
		else
			res.sendFile(appDir + "/html/login.html");
	});

	/*app.get('/', requireAuth((req, res) => {
		// Require auth use example
	}));*/
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