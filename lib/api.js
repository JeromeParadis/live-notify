
var  sha1 = require('./sha1')
	,Notifications = require("./notifications");


exports.EventsApi = EventsApi;


function getRedisConnection(notify) {
	return notify.rsr.rc;
}

function insertNotification(notify,evt) {
	
	var redis = getRedisConnection(notify);
	//var r_event = new notify.models.Event(evt);
	
	var notifications = new Notifications.UserNotifications(evt.user_id, notify);
	notifications.save(evt, function(err, event, results) {
		if (!err) {
			notify.transport.notify_user(event.attributes);
		}
	});
	
	//~ r_event.save({},{
		//~ success: function(err,obj) {
			//~ console.log("Saved notification:", obj.id)
			//~ if (obj) {
				//~ var notifications = new Notifications.UserNotifications(obj.user_id, notify);
				//~ 
				//~ var notificationKey = obj.name + ":" + obj.id;
				//~ //var set = notify.redis_prefix + "user_notifications:" + obj.get('user_id');
				//~ var userSetKey = "user_notifications:" + obj.get('user_id');
				//~ var created = new Date(obj.get('created'));
				//~ var score = created.getTime();
				//~ 
				//~ console.log("event date: ", created, "score: ", score);
				//~ redis.zadd(userSetKey, score, notificationKey);
				//~ console.log("Indexed", notificationKey, "in", userSetKey);
				//~ 
				//~ if (!obj.was_read) {
					//~ //var set2 = notify.redis_prefix + "unread_user_notifications:" + obj.get('user_id');
					//~ var userUnreadKey = "unread_user_notifications:" + obj.get('user_id');
					//~ redis.zadd(userUnreadKey, score, notificationKey);
					//~ console.log("Indexed", notificationKey, "in", userUnreadKey);
				//~ }
			//~ }
		//~ }
	//~ });
	//~ 
	//~ notify.transport.notify_user(r_event.attributes);
	
}


exports.SessionApi = SessionApi

var doAuth = function(req, res) {
	console.log('SessionApi.doAuth()');
	// redis.set('somekey', 'somevalue')
	
	requestKey = req.header('X-Buyosphere-Signature');
	requestDate = req.header('X-Buyosphere-Date');
	sha = sha1.hex_sha1("my super duper key is private" + requestDate)
	
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
		if (!doAuth(req, res)) return;
		res.send({version: version});
	};
	
	
	var create = function(req, res) {
		console.log('SessionApi.create()', req.param('session_id'));
		if (!doAuth(req, res)) return;
		
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
		if (!doAuth(req, res)) return;
		console.log("events received!", req.body.events);
		console.log("Cleaning up!");
		
		//~ redis.keys(notify.redis_prefix + "user_notifications*",function(err,keys) {
		redis.keys("user_notifications*", function(err, keys) {
			if (keys) {
				keys.push("next.notify.event.id");
				redis.del(err,keys,function(err) {
					if (!err) {

						notify.models.Backbone.search_delete(notify.models.Event, "*", function(results) {
						 	console.log("items: ", req.body.events.length);
						 	var users = [];
							for(var i=0; i< req.body.events.length; i++) {
								var evt = req.body.events[i];
								insertNotification(notify,evt);
							}
							console.log("Init done!");
							res.send({ success: true});
							
						},
						function(err) {
							console.log("ERROR","Error cleaning up events");
							res.send({ success: false});
						});
					}
				});
			}
		});
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
		if (!doAuth(req, res)) return;
		var evt = req.body.event;
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
		if (!doAuth(req, res)) return;
		notify.rsr.r_emit('message', { from: req.body.from, message: req.body.message });
		res.send({ success: true});
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

	return this;
}
