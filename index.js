var express= require('express');

var socket_auth = require('../socket-auth')
   ,Api = require('./lib/api');

/**
 * Export the wrapper.
 */

exports = module.exports = Notify;

function Notify(app, io, options) {
	app.configure(function(){
  		app.use(express.bodyParser());
	});
	this.auth_plugin = (options && options.auth_plugin) || "django-auth";
	this.api_key = (options && options.auth_plugin) || null;
	auth = socket_auth(io, this.auth_plugin, options);

	var messages_api = Api.MessagesApi(io);

	//if (app.resource) {
	app.resource('api/messages', messages_api, { format: 'json' });

	//}

	return auth;
}
