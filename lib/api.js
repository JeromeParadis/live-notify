
var  sha1 = require('./sha1')
	,Notifications = require("./notifications");


exports.EventsApi = EventsApi;


function getRedisConnection(notify) {
	return notify.rsr.rc;
}

function insertNotification(notify,evt) {
	saveNotification(notify, evt, true);
}

function saveNotification(notify,evt,insert) {
	
	var notifications = new Notifications.UserNotifications(evt.user_id, notify);
	notifications.save(evt, function(err, event, results) {
		if (!err) {
			if (notify.debug_mode)
				console.log('Notification insert mode',insert);
			notify.transport.send_user_message((insert) ? 'added_note' : 'updated_note',evt.user_id, event.attributes);
		}
	});
	
}

function deleteNotification(notify,evt,id) {
	
	var redis = getRedisConnection(notify);
	
	var notifications = new Notifications.UserNotifications(evt.user_id, notify);
	notifications.load(id,function(err, event) {
		if (event && event.id == id) {
			notifications.delete(evt,function(err,event) {
				if (notify.debug_mode) {
					console.log('***********EVENT************' + JSON.stringify(event));
					console.log('notifications.delete() callback():', err, event);
				}
				if (event)
					notify.transport.send_user_message('deleted_note',evt.user_id, event.attributes);
				else {
					if (notify.log_errors)
						console.log('Could not delete event id ' + id);
				}
			});
		}
		else {
			if (notify.log_errors)
				console.log('Event cannot be found. Therefore, it cannot be deleted. :-/');
		}
	});
	
}


exports.SessionApi = SessionApi

var doAuth = function(req, res, notify) {
	if (notify.debug_mode)
		console.log('SessionApi.doAuth()');
	// redis.set('somekey', 'somevalue')
	
	requestKey = req.header('X-Live-Notify-Signature');
	requestDate = req.header('X-Live-Notify-Date');
	sha = sha1.hex_sha1(notify.api_key + requestDate);
	
	if (sha == requestKey) return true;
	
	obj = {
		success:false,
		sha:sha,
		date: requestDate,
		sig: requestKey
	}
	
	res.send(obj, 403);
	return false;
};


function SessionApi(notify) {
	
	var version = '0.01';
	var redis = getRedisConnection(notify);
	
	var index = function(req, res) {
		//console.log('SessionApi.index()');
		if (!doAuth(req, res, notify)) return;
		res.send({version: version});
	};
	
	
	var create = function(req, res) {
		if (notify.debug_mode)
			console.log('SessionApi.create()', req.param('session_id'));
		if (!doAuth(req, res, notify)) return;
		
		var sessID = req.param('session_id');
		var sessionData = {
			id: sessID,
			user_id: req.param('user_id'),
			logged_in: req.param('logged_in')
		};
		
		if (sessID) {
			// Adds the session to Redis.
			notify.socket_auth.addSession(sessionData.user_id, sessID, sessionData);
		}
		
		res.send({success:true, session:sessionData, sessionid:sessID});
	};
	
	
	
	
	return {
		index:index,
		create:create
	};
	
}


function EventsApi(notify) {

	var redis = getRedisConnection(notify);
	var notify = notify;

	var self = this;

	// this.index = function(req, res){
	//   res.send('forum index');
	// };

	// this.new = function(req, res){
	//   res.send('new forum');
	// };

	this.create = function(req, res){
		if (!doAuth(req, res, notify)) return;
		if (notify.debug_mode) {
			console.log("events received!", req.body.events);
			console.log("Cleaning up!");			
		}
		
		// redis.keys("user_notifications*", function(err, keys) {
		// 	if (keys) {
		// 		keys.push("next.notify.event.id");
		// 		redis.del(err,keys,function(err) {
		// 			if (!err) {

		// 				notify.models.Backbone.search_delete(notify.models.Event, "*", function(results) {
							if (notify.debug_mode)
						 		console.log("items: ", req.body.events.length);
						 	var users = [];
							for(var i=0; i< req.body.events.length; i++) {
								var evt = req.body.events[i];
								insertNotification(notify,evt);
							}
							if (notify.debug_mode)
								console.log("Init done!");
							res.send({ success: true});
							
		// 				},
		// 				function(err) {
		// 					console.log("ERROR","Error cleaning up events");
		// 					res.send({ success: false});
		// 				});
		// 			}
		// 		});
		// 	}
		// });
	};

	// this.show = function(req, res){
	//   res.send('show forum ' + req.params.forum);
	// };

	// this.edit = function(req, res){
	//   res.send('edit forum ' + req.params.forum);
	// };

	// this.update = function(req, res){
	//   res.send('update forum ' + req.params.forum);
	// };

	this.destroy = function(req, res){
		var rc = getRedisConnection(notify);
		rc.keys('*', function(err, keys) {
			keys.forEach(function(key) {
				rc.del(key);
			});
		});
		res.send({ success: true});
	};

	return this;
}

exports.EventApi = EventApi;

// API for single notification events
// ------------------------------
function EventApi(notify) {

	this.notify = notify;

	var self = this;

	// this.index = function(req, res){
	//   res.send('forum index');
	// };

	// this.new = function(req, res){
	//   res.send('new forum');
	// };

	this.create = function(req, res) {
		if (!doAuth(req, res, notify)) return;
		var evt = req.body.event;
		if (notify.debug_mode)
			console.log('EventApi.create()', evt);
		insertNotification(notify, evt);
		res.send({success: true});
	};

	// this.show = function(req, res){
	//   res.send('show forum ' + req.params.forum);
	// };

	// this.edit = function(req, res){
	//   res.send('edit forum ' + req.params.forum);
	// };

	// this.update = function(req, res){
	//   res.send('update forum ' + req.params.forum);
	// };

	// this.destroy = function(req, res){
	//   res.send('destroy forum ' + req.params.forum);
	// };

	this.update = function(req, res){
		if (!doAuth(req, res, notify)) return;
		var evt = req.body.event;
		if (notify.debug_mode)
			console.log('EventApi.update()', evt);
		saveNotification(notify, evt, false);
		res.send({success: true});
	};

	this.destroy = function(req, res){
		if (!doAuth(req, res, notify)) return;
		var evt = req.body.event;

		if (notify.debug_mode)
			console.log('EventApi.delete()');
		deleteNotification(notify, evt, evt.id);
		res.send({success: true});
	};

	// // Define auto-loader
	// // -------------------------------
	// this.load = function(req, id, fn) {
	// 	fn(null, users[id]);
	// };

	return this;
}

exports.MessageApi = MessageApi;

function MessageApi(notify) {

	var self = this;

	// this.index = function(req, res){
	//   res.send('forum index');
	// };

	// this.new = function(req, res){
	//   res.send('new forum');
	// };

	this.create = function(req, res){
		if (!doAuth(req, res, notify)) return;
		notify.rsr.r_emit('message', { from: req.body.from, message: req.body.message });
		res.send({ success: true});
	};

	// this.show = function(req, res){
	//   res.send('show forum ' + req.params.forum);
	// };

	// this.edit = function(req, res){
	//   res.send('edit forum ' + req.params.forum);
	// };



	return this;
}
