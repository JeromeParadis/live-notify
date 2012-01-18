var socket_auth = require('../socket-auth'),
  , Resource = require('express-resource');

/**
 * Export the wrapper.
 */

exports = module.exports = Notify;

function Notify(app, io, options) {
	this.auth_plugin = (options && options.auth_plugin) || "django-auth";
	this.api_key: (options && options.auth_plugin) || null;
	auth = socket_auth(io, this.auth_plugin, options);

	//TODO: app.resource('forums', require('./forum'));

	return auth;
}
