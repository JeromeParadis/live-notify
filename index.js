
var SocketAuth = require('socket-auth')
   ,Api = require('./lib/api')
   //,RedSocket = require('red-socket')
   ,models = require("./models/models")
   ,Transport = require("./lib/transport")
   ,Notifications = require("./lib/notifications")
   ,redis = require('redis');

/**
 * Export the wrapper.
 */

exports = module.exports = Notify;

/**
 * @param app:ExpressAPI
 * @param io:SocketIO
 * @param options:Object
 */
function Notify(express, app, io, options) {
	
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
	//this.rsr = RedSocket(io, {debug: this.debug_mode, redis_prefix: this.redis_prefix});
	//this.rc = options.redis_client || redis.createClient();
	var auth_plugin = options.auth_plugin || null;
	this.callback_api = options.callback_api || null;
	this.transport = new Transport(this);
	this.api_key = options.api_key || "my super duper key is private";
	this.io = io;

	var pub = createClient(null, null, {prefix: this.redis_prefix, debug: this.debug_mode});
	var sub = createClient(null, null, {prefix: this.redis_prefix, debug: this.debug_mode});
	var store = createClient(null, null, {prefix: this.redis_prefix, debug: this.debug_mode});
	this.rc = store;

	io.configure( function(){
	  io.set('log level', 1);
	  io.set('log',self.debug_mode)
	  if (!self.debug_mode) {
	    io.enable('browser client minification'); // send minified client
	    io.enable('browser client etag'); // apply etag caching logic based on version number
	    io.enable('browser client gzip'); // gzip the file    
	  }
	  io.set('transports', [ // enable all transports (optional if you want flashsocket)
	      ,'websocket'
	      , 'flashsocket'
	      , 'htmlfile'
	      , 'xhr-polling'
	      , 'jsonp-polling'
	    ]);
	  var RedisStore = require('socket.io/lib/stores/redis');
	  io.set('store', new RedisStore({redisPub:pub, redisSub:sub, redisClient:store}));
	});


	var auth_options = {
		rc: self.rc,
		plugin: auth_plugin
	};
	
	models.Backbone.setClient(self.rc);
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
			if (self.debug_mode)
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
				socket.emit("notes-count", {
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
				socket.emit((initial) ? "notes-init" : "notes-received", {
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



/**
 * 
 * Class to aid with the prefixing of keys.
 * 
 */
function NamespaceRedisClient(net_client, options) {
	redis.RedisClient.call(this, net_client, options);
	this.prefix = options && options.prefix ? options.prefix : '';
	this.debug = options && options.debug || false;
	if (this.debug)
		console.log('NamespaceRedisClient()', 'options:', options);
}


/**
 * Funky way to implement inheritence.
 */
NamespaceRedisClient.prototype = (function() {
	var chain = function(){}
	chain.prototype = redis.RedisClient.prototype;
	return new chain();
})();


NamespaceRedisClient.prototype.constructor = NamespaceRedisClient;


/**
 * Overrides the send_command function to pre-fix key names if necessary.
 * Arguments are passed in the for of either:
 * 		send_command(command, [arg1, arg2], cb);
 * OR:
 * 		send_command(command, [arg1, arg2, cb]);
 */
NamespaceRedisClient.prototype.send_command = function (command, args, callback) {
	if (this.prefix) {
		if (!callback && typeof(args[args.length-1]) == 'function') {
			callback = args.pop();
		}
		var i = args.length, cmdType = NamespaceRedisClient.getCommandArgSubType(command);
		switch (cmdType) {
			case 'first':
				args[0] = this.addPrefix(args[0]);
				break;
			case 'all':
				while (i--) args[i] = this.addPrefix(args[i]);
				break;
			case 'odd':
				if (i%2) i--;
				while (i -= 2 >= 0) args[i] = this.addPrefix(args[i]);
				break;
			case 'allButFirst':
				while (--i) args[i] = this.addPrefix(args[i]);
				break;
			case 'allButSecond':
				while (i--) {
					if (i != 1) args[i] = this.addPrefix(args[i]);
				}
				break;
			case 'allButLast':
				i--;
				while (i--) args[i] = this.addPrefix(args[i]);
				break;
		}
	}
	if (this.debug)
		console.log('NamespaceRedisClient.send_command()', 'type:', cmdType, 'command:', command, args);
	//~ if (args[0] == 'shwowp-notify.shwowp-notify.processes.counter') throw new Error('debug');
	return redis.RedisClient.prototype.send_command.call(this, command, args, callback);
}


/**
 * Adds the prefix.
 */
NamespaceRedisClient.prototype.addPrefix = function(key) {
	if( typeof key === 'string' ) {
		if (key.charAt(0) == ':') {
			key = key.substr(1);
		}
		else if (key.substr(0, this.prefix.length) != this.prefix) {
			key = this.prefix + key;
		}
		return key;
	} else if (key) { // list
		ln = key.length;
		for (var i=0;i<ln;i++)
			key[i] = this.addPrefix(key[i]);
		return key;
	}
	return null;
}


NamespaceRedisClient.getCommandArgSubType = function(command) {
	command = command.toLowerCase();
	if (NamespaceRedisClient.FIRST_ARG_CMDS.indexOf(command) > -1) return 'first';
	if (NamespaceRedisClient.ALL_ARG_CMDS.indexOf(command) > -1) return 'all';
	if (NamespaceRedisClient.ALL_ODD_ARG_CMDS.indexOf(command) > -1) return 'odd';
	if (NamespaceRedisClient.ALL_BUT_FIRST_ARG_CMDS.indexOf(command) > -1) return 'allButFirst';
	if (NamespaceRedisClient.ALL_BUT_SECOND_ARG_CMDS.indexOf(command) > -1) return 'allButSecond';
	if (NamespaceRedisClient.ALL_BUT_LAST_ARG_CMDS.indexOf(command) > -1) return 'allButLast';
	return null;
}

NamespaceRedisClient.FIRST_ARG_CMDS = ['dmp', 'exists', 'expire', 'expireat', 'keys', 'move', 'persist', 'pexpire', 'pexpireat', 'pttl', 'restore', 'sort', 'ttl', 'type', 'append', 'decr', 'decrby', 'get', 'getbit', 'getrange', 'getset', 'incr', 'incrby', 'incrbyfloat', 'psetx', 'set', 'setbit', 'setex', 'setnx', 'setrange', 'strlen', 'hdel', 'hexists', 'hget', 'hgetall', 'hincrby', 'hincrbyfloat', 'hkeys', 'hlen', 'hmget', 'hmset', 'hset', 'hsetnx', 'hvals', 'lindex', 'linsert', 'llen', 'lpop', 'lpush', 'lpushx', 'lrange', 'lrem', 'lset', 'ltrim', 'rpop', 'rpush', 'rpushx', 'sadd', 'scard', 'sismember', 'smembers', 'spop', 'srandmember', 'srem', 'zadd', 'zcard', 'zcount', 'zincrby', 'zrange', 'zrangebyscore', 'zrank', 'zrem', 'zremrangebyrank', 'zremrangebyscore', 'zrevrange', 'zrevrangebyscore', 'zrevrank', 'zscore'];
NamespaceRedisClient.ALL_ARG_CMDS = ['del', 'rename', 'renamenx', 'mget', 'rpoplpush', 'sdiff', 'sdiffstore', 'sinter', 'sinterstore', 'sunion', 'sunionstore', 'watch'];
NamespaceRedisClient.ALL_ODD_ARG_CMDS = ['mset', 'msetnx'];
NamespaceRedisClient.ALL_BUT_FIRST_ARG_CMDS = ['object'];
NamespaceRedisClient.ALL_BUT_SECOND_ARG_CMDS = ['zinterstore', 'zunionstore'];
NamespaceRedisClient.ALL_BUT_LAST_ARG_CMDS = ['blpop', 'brpop', 'brpoplpush', 'smove'];
//~ NamespaceRedisClient.UNSUPPORTED_CMDS = ['migrate', 'script'];


/**
 * A complete cut-and-paste job of the createClient function in redis
 * except it returns a NamespaceRedisClient instead.
 */
var net = require("net"),
    default_port = 6379,
    default_host = "127.0.0.1";

var createClient = function (port_arg, host_arg, options) {
    var port = port_arg || default_port,
        host = host_arg || default_host,
        redis_client, net_client;

    net_client = net.createConnection(port, host);

    redis_client = new NamespaceRedisClient(net_client, options);

    redis_client.port = port;
    redis_client.host = host;

    return redis_client;
};