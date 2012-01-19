var socket_auth = require('../socket-auth');

/**
 * Export the wrapper.
 */

exports = module.exports = Notify;

function Notify(app, io, options) {
	this.auth_plugin = (options && options.auth_plugin) || "django-auth";
	this.api_key = (options && options.auth_plugin) || null;
	auth = socket_auth(io, this.auth_plugin, options);

	var messages_api = function() {
		this.index = function(req, res){
  			res.send('OK');
		};
		this.create = function(req, res){
  			res.send('OK');
		};

		return this;
	}();


	//if (app.resource) {
	app.resource('messages', messages_api);

	//}

	return auth;
}
