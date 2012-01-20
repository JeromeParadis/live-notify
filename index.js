var express= require('express');

var SocketAuth = require('../socket-auth')
   ,Api = require('./lib/api')
   ,RedSocket = require('../red-socket')
   ,models = require("./models/models")
   ,Transport = require("./lib/transport");
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
	this.models = models;
	this.rsr = RedSocket(io);
	this.auth_plugin = (options && options.auth_plugin) || "django-auth";
	this.api_key = (options && options.auth_plugin) || null;
	this.transport = new Transport(this);

	// Patch models with Redis prefix
	// -----------------------
	if (options && options.redis_namespace) {
		models.Event.name = options.redis_namespace + models.Event.name;
	}

	// Define auth acknowledge
	// -----------------------
	var self = this;
	this.socket_auth = new SocketAuth(io, this.auth_plugin, options, function(socketid,sessionid) {
		self.rsr.r_send_user(socketid,"ready","authenticated");
	});

	// API views
	// -----------------------
	//if (app.resource) {
	app.resource('api/message', Api.MessageApi(this), { format: 'json' });
	app.resource('api/events', Api.EventsApi(this), { format: 'json' });

	//}

	return this;
}
