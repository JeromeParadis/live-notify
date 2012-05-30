var express= require('express');

var SocketAuth = require('../socket-auth')
   ,Api = require('./lib/api')
   ,RedSocket = require('../red-socket')
   ,models = require("./models/models")
   ,Transport = require("./lib/transport")
   ,Notifications = require("./lib/notifications");

/**
 * Export the wrapper.
 */

exports = module.exports = Notify;

/**
 * @param app:ExpressAPI
 * @param io:SocketIO
 * @param options:Object
 */
function Notify(app, io, options) {

	// Configuration
	// -----------------------
	app.configure(function(){
		app.use(express.bodyParser());
	});

	if (!options) options = {};
	this.redis_prefix = options.redis_namespace || '';
	this.models = models;
	this.rsr = RedSocket(io, {debug: true, redis_prefix: redis_prefix});
	var auth_plugin = options.auth_plugin || null;
	this.callback_api = options.callback_api || null;
	this.transport = new Transport(this);

	var auth_options = {
		rc: rsr.rc,
		plugin: auth_plugin
	};

	// ONLY FOR DEV! Purges our keys. Leave this commented out unless you mean it!
	//~ rc.keys('*', function(err, keys) {
		//~ keys.forEach(function(key) {
			//~ rc.del(key);
		//~ });
	//~ });
	
	
	this.socket_auth = new SocketAuth(io, auth_options);
	
	models.Backbone.setClient(this.rsr.rc);
	models.Backbone.initServer(app);

	// Define auth acknowledge
	// -----------------------
	var self = this;


	io.sockets.on('connection', function(socket) {
		console.log('Connected!', socket.handshake.sessionID);
		
		var session = socket.handshake.session;
		// Bail out if the session is not set for some reason.
		if (!session || !session.user_id) return;
		
		self.rsr.r_send_user(socket.id, "ready", "authenticated");
		
		var notifications = new Notifications.UserNotifications(session.user_id, self);
		
		var send_notification_count = function() {
			notifications.get_notifications_count(function(err, nb_notes, nb_unread) {
				console.log("Notes total, unread:", nb_notes, nb_unread);
				self.rsr.r_send_user(socket.id, "notes-count", {nb_notes: nb_notes, nb_unread: nb_unread});
			});
		};
		
		send_notification_count();
		
		var mark_all_read = function(callback) {
			console.log("mark_all_read()");
			notifications.mark_all_read(callback);
		};
		
		var send_all_notes = function() {
			notifications.get_notifications(1, 20, function(err, notes) {
				console.log("Received notes!", notes)
				self.rsr.r_send_user(socket.id, "notes-init", notes);
			});
		};
		
		socket.on("get_initial_notes", function() {
			console.log("get_initial_notes()")
			mark_all_read();
			send_all_notes();
		});
		
		socket.on("mark_notes_read", function() {
			console.log("mark notes read()");
			mark_all_read(send_notification_count);
		});
		
	});
	
	/**
	 * ONLY FOR DEV! Purges our keys. Don't call this unless you mean it!
	 * And comment it out for production.
	 */
	app.get('/purge', function(req, res) {
		rc.keys('*', function(err, keys) {
			keys.forEach(function(key) {
				rc.del(key);
			});
		});
		res.send('purged, hope you meant it.');
	});


	// API views
	// -----------------------
	//if (app.resource) {
	app.resource('api/message', Api.MessageApi(this), { format: 'json' });
	app.resource('api/events', Api.EventsApi(this), { format: 'json' });
	app.resource('api/event', Api.EventApi(this), { format: 'json' });
	app.resource('api/session', Api.SessionApi(this), {format: 'json'});
	
	

	app.get('/js/live-notify.js', function(req, res){
		res.sendfile(__dirname + '/public/js/live-notify.js');
	});

	app.get('/models/models.js', function(req, res){
		console.log("req.url",req.url)
		res.sendfile(__dirname + '/models/models.js');
	});

	//}

	return this;
}
