var
		redis = require("redis"),
		client = redis.createClient(); // todo: load values from config

client.select("backdoorio"); // todo: load the dataset name from the config

function set(key, value, callback) {
	client.set(key, value, callback);
}

function get(key, callback) {
	client.get(key, function (err, value) {
		console.log("get: " + key + ": " + value);
		callback(err, value);
	});
}

module.exports = {
	set: set,
	get: get
};
