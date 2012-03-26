/**
 * The "backdoors" module provides a functionnal api for handling backdoor objects
 */
var
		_ = require('underscore'),
		rest = require('restler'),
		utils = require("./utils");

/**
 * The backdoors module constructor
 * @param app The backdoor application to which it binds for configuration and orm
 * @param selection The currently selected items
 */
function Backdoors(app, selection) {
	// todo.... each request should yeld a new selection set, just like jQuery
	var self = selection || []; // Currently selected modules


	self.Model = app.schema.define('backdoor', {
		hashId: { type: String },
		url: { type: String },
		apiVersion: { type: String },
		serviceName: { type: String },
		status: { type: String },
		lastConnection: { type: Date }
	});

	/**
	 * Return the current selection in a clean array (without helper functions)
	 */
	self.array = function() {
		var arr = [];
		for (var i = 0; i < self.length; i = i + 1) {
			arr.push(self[i]);
		}
		return arr;
	};

	self.one = function() {
		if (self.length > 0) {
			return self[0];
		}
	};

	/**
	 * Find backdoors by criterias and place them in the selection
	 */
	self.find = function (criterias, callback) {
		self.Model.all({where: criterias}, function(err, res) {
			var backdoors = new Backdoors(app, res);
			callback(err, backdoors);
		});
		return self;
	};

	/**
	 * Delete selected backdoors
	 */
	self.delete = function (callback) {
		var model;
		for (var i = 0; i < self.length; i = i + 1) {
			model = self[i];
			model.destroy();
			// todo: call callback only once all models have been destroyed
		}
		callback();
		return self;
	};

	/**
	 * Find all backdoors
	 */
	self.all = function (callback) {
		self.Model.all(function(err, res) {
			var backdoors = new Backdoors(app, res);
			callback(err, backdoors);
		});
		return self;
	};

	/**
	 * Get or create a backdoor model from a url and put it in the selection
	 */
	self.create = function (url, callback) {
		// Fetch the backdoor if it already exist
		if (typeof url !== "undefined") {
			self.find({url: url}, function (err, res) {
				if (res.length === 0) {
					var model = {
						url: url,
						hashId: utils.getHash(url)
					};
					self.Model.create(model, function (err, res) {
						var backdoors = new Backdoors(app, [res]);
						callback(err, backdoors);
					});
				} else {
					var backdoors = new Backdoors(app, res);
					callback(err, backdoors);
				}
			});
		}
		return self;
	};

	self.loadNavigation = function (callback) {
		var err;
		/*
		if (backdoor.navigationCache && !clearCache) {
			if (callback) callback(err, backdoor.navigation);
		} else {
			rest.get(backdoor.model.url + "navigation/").on('complete', function(result) {
				//console.log("on complete", result);
				if (result instanceof Error) {
					err = {message: "An communication error occured while loading the navigation."};
				} else {
					backdoor.navigation = result || {};
				}
				if (callback) callback(err, backdoor.navigation);
			});
		}
		*/
		return self;
	};

	/**
	 * Connect to a url to fetch a backdoor meta information
	 * @param callback
	 */
	self.connect = function (callback) {
		var err;
		// todo: support connection of multiple item selection
		// todo: Fidn a way to raise errors even when multiple items are affected
		var model = self[0];
		console.log("connecting to : " + model.url );
		rest.get(model.url).on('complete', function(result) {
			//console.log("on complete", result);
			if (result instanceof Error) {
				err = { message: "An communication error occured while connecting to this address." };
			} else {
				if (result.api === "backdoor") {
					model.serviceName = result.serviceName;
					model.apiVersion = result.version;
					model.status = "ok";
					model.lastConnection = new Date();
					model.save(function(err, res) {
						callback(err, self);
					});
				} else {
					err = { message: "This url does not point to a valid backdoor." };
					callback(err, self);
				}
			}
			// Load naviation async for later
			self.loadNavigation();
		});
		return self;
	};

	return self;
}

module.exports = Backdoors;
