const appDir = require('path').resolve("./app");

module.exports = function(app) {
	app.get('/', (req, res) => {
		if (req.isAuthenticated())
			res.sendFile(appDir + "/html/app.html"); // This will be changed to res.render eventually
		else
			res.sendFile(appDir + "/html/login.html");
	});

	require('./rest-endpoints.js')(app);
};