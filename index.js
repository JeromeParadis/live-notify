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

function Notify(app, io, options) {

	// Configuration
	// -----------------------
	app.configure(function(){
  		app.use(express.bodyParser());
	});

	// models.Backbone.setClient(rc);
	//console.log(models);
	models.Backbone.initServer(app);
	this.redis_prefix = '';
	this.models = models;
	this.rsr = RedSocket(io);
	this.auth_plugin = (options && options.auth_plugin) || "django-auth";
	this.api_key = (options && options.auth_plugin) || null;
	this.transport = new Transport(this);

	// Patch models with Redis prefix
	// -----------------------
	if (options && options.redis_namespace) {
		//models.Event.name = options.redis_namespace + models.Event.name;
		this.redis_prefix = options.redis_namespace;
	}

	// Define auth acknowledge
	// -----------------------
	var self = this;
	this.socket_auth = new SocketAuth(io, this.auth_plugin, options, function(socketid,session) {
		self.rsr.r_send_user(socketid,"ready","authenticated");
		if (session && session.user_id) {
			var notifications = new Notifications.UserNotifications(session.user_id,self);
			notifications.get_notifications(1,20,function(err,notes) {
				self.rsr.r_send_user(socketid,"notes-init",notes);
			});
		}	
	});

	// API views
	// -----------------------
	//if (app.resource) {
	app.resource('api/message', Api.MessageApi(this), { format: 'json' });
	app.resource('api/events', Api.EventsApi(this), { format: 'json' });
	app.get('/js/*', function(req, res){
	    res.sendfile(__dirname + '/public'+req.url);
	});
	app.get('/models/*', function(req, res){
	    console.log("req.url",req.url)
	    res.sendfile(__dirname + req.url);
	});

	//}

	return this;
}
