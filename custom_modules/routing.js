const appDir = require('path').resolve("./app");

module.exports = function(app) {
	app.get('/', (req, res) => {
		if (req.isAuthenticated())
			res.sendFile(appDir + "/html/" + (req.user.is_admin ? "dashboard" : "app") + ".html");
		else
			res.sendFile(appDir + "/html/login.html");
	});

	require('./rest-endpoints.js')(app);
};