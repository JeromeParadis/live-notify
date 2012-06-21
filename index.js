var express= require('express');

var SocketAuth = require('socket-auth')
   ,Api = require('./lib/api')
   ,RedSocket = require('red-socket')
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
	
	var self = this;
	
	// Configuration
	// -----------------------
	app.configure(function(){
		app.use(express.bodyParser());
	});

	if (!options) options = {};
	this.redis_prefix = options.redis_namespace || '';
	this.models = models;
	this.debug_mode = options.debug || false;
	this.log_errors = options.log_errors || true;
	this.rsr = RedSocket(io, {debug: this.debug_mode, redis_prefix: this.redis_prefix});
	var auth_plugin = options.auth_plugin || null;
	this.callback_api = options.callback_api || null;
	this.transport = new Transport(this);
	this.api_key = options.api_key || "my super duper key is private";

	var auth_options = {
		rc: rsr.rc,
		plugin: auth_plugin
	};
	
	models.Backbone.setClient(this.rsr.rc);
	models.Backbone.initServer(app);
	models.debug = this.debug_mode;
	
	if (this.debug_mode) {
		console.log('notify object:', this);

	}
	
	
	/**
	 * Connect the dots.  This is called at the bottom of this function.
	 */
	var init = function() {
		io.sockets.on('connection', function(socket) {
			if (this.debug_mode)
				console.log('Connected!', socket.handshake.session);
			NotificationSocket(socket, self);
		});
	
		/**
		 * Wrap sessions around the socket connection.
		 */
		// A SocketAuth instance not connected to a socket for the API 
		// to use.  This could be cleaner, but works.  :(
		this.socket_auth = new SocketAuth(null, auth_options);
		//~ this.socket_auth = new SocketAuth(io, auth_options, onSessionLoaded);
		io.set('authorization', socket_auth.onAuthorization);
	}
	
	
	
	/**
	 * A pseudo-class to handle notifications for each socket.
	 *  @param socket:Socket - the socket to provide notifications to.
	 *  @param notify:Notify - a reference to the main Notify instance.
	 */
	var NotificationSocket = function(socket, notify) {
		
		var notifications = null;
		
		var init = function() {
			SocketAuth(socket, auth_options, onSessionLoaded);
			if (socket.handshake.session) onSessionLoaded(null, socket.handshake.session)	;
		}
		
		
		var onSessionLoaded = function(err, session) {
			if (this.debug_mode)
				console.log('onSessionLoaded()', session);
			
			// Bail out if the session is not set or the connection is not
			// initialized yet.
			if (!session || !socket) return;
			
			socket.on("get_initial_notes", function(options) {
				if (this.debug_mode)
					console.log("get_initial_notes()");
				mark_all_read();
				send_all_notes(true, options);
			});

			socket.on("get_notes", function(options) {
				if (this.debug_mode)
					console.log('get_notes()', options);
				send_all_notes(false, options);
			});

			socket.on("mark_notes_read", function() {
				if (this.debug_mode)
					console.log("mark notes read()");
				mark_all_read(send_notification_count);
			});
			
			//~ notify.rsr.r_send_user(socket.id, "ready", "authenticated");
			notifications = new Notifications.UserNotifications(session.user_id, notify);
			send_notification_count();
		};
		
		
		var send_notification_count = function() {
			notifications.get_notifications_count(function(err, nb_notes, nb_unread) {
				if (this.debug_mode)
					console.log("Notes total, unread:", nb_notes, nb_unread);
				notify.rsr.r_send_user(socket.id, "notes-count", {
					nb_notes: nb_notes,
					nb_unread: nb_unread
					});
			});
		};
		
		
		var mark_all_read = function(callback) {
			if (this.debug_mode)
				console.log("mark_all_read()");
			notifications.mark_all_read(callback);
		};
		
		
		var send_all_notes = function(init, options) {
			var initial = init || false;
			var page = (options && options.page) || 1;
			var items_per_page = (options && options.items_per_page) || 10;
			notifications.get_notifications(page, items_per_page, function(err, data) {
				if (this.debug_mode)
					console.log("Received notes!",data)
				notify.rsr.r_send_user(socket.id, (initial) ? "notes-init" : "notes-received", {
					notes: data.threads,
					nb_total: data.nb_total,
					nb_read: data.nb_read,
					nb_notes: data.threads.length,
					page: page,
					items_per_page: items_per_page,
					ref: (options && options.ref) || null,
				});
			});
		};
		
		
		init();
		
	};

	// API views
	// -----------------------
	//if (app.resource) {
	app.resource('api/message', Api.MessageApi(this), { format: 'json' });
	app.resource('api/events', Api.EventsApi(this), { format: 'json' });
	app.resource('api/event', Api.EventApi(this), { format: 'json' });
	//app.resource('api/event', event_api, { format: 'json', load: event_api.load });
	app.resource('api/session', Api.SessionApi(this), {format: 'json'});
	
	

	app.get('/js/live-notify.js', function(req, res){
		res.sendfile(__dirname + '/public/js/live-notify.js');
	});

	app.get('/css/live-notify.css', function(req, res){
		res.sendfile(__dirname + '/public/css/live-notify.css');
	});

	app.get('/models/models.js', function(req, res){
		res.sendfile(__dirname + '/models/models.js');
	});

	//}
	
	init();

	return this;
}
