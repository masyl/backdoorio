var backdoorio = module.exports = {};

var
		connect = require('connect'),
		Session = connect.middleware.session.Session,
		Schema = require('jugglingdb').Schema,
		backdoors = require("./backdoors"),
		parseCookie = connect.utils.parseCookie;
//		middleware = require("./middleware");

backdoorio.schema = new Schema('redis', {port: 6379}); // todo: load schema type from db
backdoorio.backdoors = backdoors(backdoorio);
backdoorio.store = require('./stores/redis');
backdoorio.logger = require('winston');

// Setup configuration manager and get/set helpers
backdoorio.config = require('nconf');
backdoorio.config
		.argv()
		.env()
		.file({ file: 'config.json' });
backdoorio.get = function (key) {
	return this.config.get(key);
};
backdoorio.set = function (key, val) {
	return this.config.set(key, val);
};


// Shorthand for middleware usage
// todo: re-enable templates
//backdoorio.middleware = middleware;

backdoorio.use = function (fn) {
	this.middleware.use(fn);
};

//todo: Find a better way to inject the sessionStore
backdoorio.listen = function (app, sessionStore) {
	console.info("Backdoor.io is now listening!");

	backdoorio.sessionStore = sessionStore;

	// Connect socket.io to the web server
	var io = require('socket.io').listen(app);
	backdoorio.io = io;

	io.set('authorization', onAuthorization);

	io.sockets.on('connection', onConnection);

};

function onConnection(socket) {
	console.info("Connection with sessionID : " +  socket.handshake.sessionID);
}


function onAuthorization (data, accept) {
	// check if there's a cookie header
	if (data.headers.cookie) {
		// if there is, parse the cookie,
		data.cookie = parseCookie(data.headers.cookie);

		// note that you will need to use the same key to grad the
		// session id, as you specified in the Express setup.
		data.sessionID = data.cookie['express.sid'];

		// save the session store to the data object
		// (as required by the Session constructor)
		data.sessionStore = backdoorio.sessionStore;
		backdoorio.sessionStore.get(data.sessionID, function (err, session) {
			if (err || !session) {
				accept('Error', false);
			} else {
				// create a session object, passing data as request and our
				// just acquired session data
				data.session = new Session(data, session);
				accept(null, true);
			}
		});
	} else {
	   return accept('No cookie transmitted.', false);
	}
}




