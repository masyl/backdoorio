var
		backdoorio = require('./lib/backdoorio'),
		logger = backdoorio.logger,
		async = require('async'),
		express = require('express'),
		app = express.createServer(),
		connect = require('connect'),
		MemoryStore = express.session.MemoryStore,
		sessionStore = new MemoryStore(),
		RedisStore = require('connect-redis')(express),
		store;

//
// Setup nconf to use (in-order):
//   1. Command-line arguments
//   2. Environment variables
//   3. A file located at 'path/to/config.json'
//

// Configure the web server to support the backdoor.io server
app.configure(function () {

	store = sessionStore;
	if (backdoorio.get("sessionStore") === "redis") {
		logger.log("info", "Staring backdoor.io with the redis session store.");
		store = new RedisStore({
			host: "127.0.0.1",
			port: "6379",
			db: "backdoorio"
		});
	} else {
		logger.log("info", "WARNING: Staring backdoor.io with the memory store. Backdoor will not remember much!");
	}

	app.set("view engine", "dali");
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	// The session will be shared with backdoor.io
	/*
	app.use(express.session({
		store: store,
		//todo: make the secret configurable
		secret: backdoorio.get("server:secret"),
		key: 'express.sid'
	}));
	*/
	app.use(express.static(__dirname + '/public'));
	app.use(express.errorHandler({
		dumpExceptions: true,
		showStack: true
	}));
});

var backdoors = backdoorio.backdoors;

app.get('/', function(req, res) {
	backdoors.all(function (err, backdoors) {
		res.render("home", {
			backdoors: backdoors.array()
		});
	});
});

// View the list of available backdoors
app.get('/backdoors/', function(req, res) {
	var model = {};
	if (req.query.error) {
		model.error = {
			message: req.query.error
		}
	}
	backdoors.all(function (err, backdoors) {
		model.backdoors = backdoors.array();
		res.render("backdoors", model);
	});
});

// Get the details of a specific backdoor
app.get('/backdoors/:hash/delete/', function(req, res) {
	backdoors.all(function (err, backdoors) {
		var backdoor = backdoors.find({
			hashId: req.params.hash
		}, function (err, backdoor) {
			res.render("backdoorDelete", {
				backdoors: backdoors.array(),
				backdoor: backdoor
			});
		});
	});
});

// Get the details of a specific backdoor
app.post('/backdoors/:hash/delete/', function(req, res) {
	var hash = req.params.hash;
	backdoors.find({ hashId: hash },
		function (err, backdoor) {
			console.log("Deleting!");
			backdoor.delete(function(err) {
				console.log("Redirecting!");
				// todo: handle errors (redirect with error? Re-render?)
				res.redirect("/backdoors/");
			});
		}
	)
});

// Get the details of a specific backdoor
app.get('/backdoors/:hash/details/', function(req, res) {
	backdoors.find({
		hashId: req.params.hash
	}, function (err, backdoor) {
		res.render("backdoorDetails", {
			backdoor: backdoor[0],
			backdoors: backdoors.array()
		});
	});
});


// View the management root of a specific backdoor
app.get('/backdoors/:hash', function(req, res) {
	var backdoor = backdoors.find({
		hashId: req.params.hash
	}, function (err, backdoor) {
		res.render("backdoor", {
			error: err,
			backdoor: backdoor.one(),
			backdoors: backdoors.array()
		});
	});
});

// View the management root of a specific backdoor
app.get('/backdoors/:hash/connect', function(req, res) {
	var backdoor = backdoors.find({
		hashId: req.params.hash
	}, function (err, backdoor) {
		backdoor.connect(function (err, backdoor) {
			// If no error occured, procede to this backdoors landing page
			if (!err) {
				res.redirect("/backdoors/" + backdoor[0].hashId + "/");
			} else {
				// Otherwise return to the list of backdoors with the error message
				res.redirect("/backdoors/?error=" + err.message);
			}

		});
	});
});

app.post('/connect/', function(req, res) {
	var
			createdBackdoor,
			url = req.body.url;
	// Create a backdoor from the submitted url
	if (url) {
		async.waterfall([
			function (callback) {
				// Create a new or find an existing backdoor object with the url
				backdoors.create(url, callback);
			},
			function (backdoor, callback) {
				createdBackdoor = backdoor;
				// Add the created backdoor to the model
				// Connect to the remote backdoor
				backdoor.connect(callback);
			},
			function (backdoor, callback) {
				// Fetch all backdoors
				backdoors.all(callback);
			}
		], function (err, backdoors) {
			// Create the model with the backdoor in it
			if (err) {
				res.redirect("/backdoors/?error=" + err.message);
			} else {
				res.redirect("/backdoors/" + createdBackdoor[0].hashId + "/");
			}
		});
	} else {
		res.redirect("/backdoors/?error=No backdoor url was submitted!");
	}
});

app.get('/backdoor/', function(req, res) {
	var backdoor = {
		"title": "Backdoor.io admin",
		"description": "This backdoor lets you administer the Backdoor server itself. It's a recursive admin panel!",
		"navigation": {
			"label" : "Backdoor.io",
			"path": "/",
			"childs" : [
				{
					"label" : "Backdoors",
					"path": "/backdoors"
				},
				{
					"label" : "About",
					"path": "/about"
				}
			]
		}
	};
	res.send(backdoor);
});

// Fetch the port number of the server
var port = backdoorio.get("server:port");

// Connect the chat server to the web server
backdoorio.listen(app, store);

// Start the web server on a network port
app.listen(port);
logger.log("info", "Backdoor.io server started on port: " + port);

