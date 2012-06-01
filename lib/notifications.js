// Notifications

var sha1 = require('./sha1');

exports.UserNotifications = function(user_id, notify) {
	
	
	var redis = notify.rsr.rc;
	var userThreadsKey = 'thread.user:' + user_id;
	var userUnreadKey = 'thread.user.unread:' + user_id;
	var self = this;
	
	
	/**
	 * Produces the key where notifications are stored.  Right now this
	 * is only used in save() so it could just go inline.  It mainly
	 * serves to make the key creation very explicit and remind me to 
	 * call the function if I need it anywhere else.
	 * 
	 * Also note that this creates coupling with the event model since 
	 * it's actually storing the event.  Ideally we would get the key
	 * name from the model itself.
	 * 
	 *  @param event:models.Event - an Event object.
	 */
	var buildNotificationKey = function(event) {
		return event.name + ":" + event.get('id');
	};
	
	
	/**
	 * Builds the thread key.
	 *  @param event:Event
	 */
	var buildThreadKey = function(event) {
		return 'thread:' + user_id + ':' + event.get('group_by');
	};
	
	
	/**
	 * Builds the foreign key.
	 *  @param evt:Event
	 */
	var buildForeignKey = function(event) {
		return 'event.foreign:' + event.get('foreign_id');
	};
	
	
	/**
	 * Stores a new notification.  The results argument passed to the 
	 * callback is an array with the number of items added to each 
	 * queue, generally [1, 1].
	 * 
	 *  @param evt:Object - an Object to convert to a Event object.
	 *  @param callback:Function(err, event:models.Event [, results:Array])
	 */
	this.save = function(evt, callback) {
		// Get a proper Backbone model and save it.  server-backbone-redis
		// takes care of the events specifically.  We ensure that they're
		// added to the relevant lists in storeEvent().
		if (!evt.group_by) {
			evt.group_by = '_auto_' + sha1.hex_sha1(JSON.stringify(evt));
		}
		
		//~ if (!evt.foreign_id) {
			//~ evt.foreign_id = createForeignKey(evt);
		//~ }
		
		
		//normalizeEvent(evt, function(err, evt) {
			// Just ignoring errors right now.  :(
			var event = new notify.models.Event(evt);
			event.save({}, {
				success: function(obj) {
					console.log('UserNotifications.save() success', obj);
					if (!obj) {
						callback && callback('Error saving event', obj);
					}
					// If we didn't have an id on the original evt... ie
					// it was an insert, we store the foreign key reference.
					//~ else if (!evt.id) {
						//~ redis.set(buildForeignKey(evt), obj.get('id'), function(err, result) {
							//~ storeEvent(obj, callback);
						//~ });
					//~ }
					// Everything's cool.  Store it.
					else {
						storeEvent(obj, callback);
					}
				}
			});
		//});
	};
	
	
	/**
	 * Normalizing based on the foreign id was many kinds of wrong.  If
	 * we want to do something like this, we need a seperate lookup that
	 * deals specifically with this.  For now I'm just eating the extra
	 * storage required to by the non-normalized approach.
	 * 
	 * Normalizes the event so we don't get duplicate events in threads.
	 *  @param evt:Object - normal event object.
	 *  @param callback:Function(err:String, event:Event)
	 */
	//~ var normalizeEvent = function(evt, callback) {
		//~ // See if we already have this event.
		//~ var foreignKey = buildForeignKey(evt);
		//~ redis.get(foreignKey, function(err, eventID) {
			//~ if (eventID) {
				//~ evt.id = eventID;
				//~ // TODO... check the message, update and adjust threads 
				//~ // if necessary.
			//~ }
			//~ callback(err, evt)
		//~ });
	//~ };
	
	
	/**
	 * Inserts all the necessary keys for selecting by threads and user.
	 *  @param event:Event
	 *  @param callback:Function(err:String, event:Event, results:Array)
	 */
	var storeEvent = function(event, callback) {
		// else...
		var notificationKey = buildNotificationKey(event);
		var threadKey = buildThreadKey(event);
		var score = new Date(event.get('created')).getTime();
		
		// Add to the thread.
		var multi = redis.multi().zadd(threadKey, score, notificationKey);
		
		// Add to the user threads
		multi.zadd(userThreadsKey, score, threadKey);
		
		// Add to the unread user threads if necessary.
		if (!event.get('was_read')) multi.zadd(userUnreadKey, score, threadKey);
		
		// If a foreign id is supplied, store the reverse lookup.
		if (event.get('foreign_id')) multi.set(buildForeignKey(event), event.get('id'));
		
		multi.exec(function(err, results) {
			console.log("UserNotifications.save() callback", err, threadKey, results);
			callback && callback(err, event, results);
		});
	};
	
	
	/**
	 * Creates a foreign key for events that do not already specify one.
	 *  @param evt:Object - a plain object (not a backbone Event object)
	 */
	//~ var createForeignKey = function(evt) {
		//~ var i, str = '';
		//~ for (i in evt) {
			//~ // user_id will be unique everytime so we don't hash it.
			//~ if (i != 'user_id') str += evt[i];
		//~ }
		//~ return '_auto_' + sha1.hex_sha1(JSON.stringify(str));
	//~ };
	
	
	/**
	 * Returns total and unread notes to a callback:
	 * 
	 *  @param callback:Function(err, total, total_unread)
	 */
	this.get_notifications_count = function(callback) {
		if (!callback) return; // No reason to do anything without a callback.
		
		var multi = redis.multi([
			['zcard', userThreadsKey],
			['zcard', userUnreadKey]
		]).exec(function(err, results) {
			console.log('UserNotifications.get_notifications_count()', results);
			if (results) callback(err, parseInt(results[0]), parseInt(results[1] || 0));
			else callback(err, 0, 0);
		});
	};
	
	
	/**
	 * Deletes the 'unread_user_notifications' key.  Returns the 
	 * redis.delete result in a callback.
	 * 
	 *  @param callback:Function(err, results:Boolean)
	 */
	this.mark_all_read = function(callback) {
		redis.del(userUnreadKey, function(err,results) {
			callback && callback(err,results);
		});
	};
	
	
	/**
	 * Returns all the notifications for a user in an array argument to
	 * the callback. 
	 * 
	 *  @param page
	 *  @param max_items
	 *  @param callback:function(err, [results:Array])
	 */
	this.get_notifications = function(page, max_items, callback) {
		if (!callback) return;
		
		var no_page = page || 1;
		var nb_items = max_items || 20;
		var start = (no_page - 1) * nb_items;
		var end = (no_page) * nb_items - 1;
		
		redis.zrevrange(userThreadsKey, start, end, function(err, threadKeys) {
			if (err) callback(err, [])
			else if (threadKeys) {
				fetchThreads(threadKeys, function(err, threads) {
					if (threads) {
						self.get_notifications_count(function(err, nb_total, nb_unread) {
							callback && callback(null,{
								threads: threads,
								nb_total: nb_total,
								nb_unread: nb_unread
							});

						});
					}
					else
						callback && callback(err,null);
				});
			}
			else {
				callback("no notifications", []);
			}
		});
	};
	
	
	/**
	 * Returns an array of objects [{total:Int, notifications:Array}, ...] to
	 * the callback.
	 *  @param threadKeys:Array
	 *  @param callback:Function(err:String, threads:Array)
	 */
	var fetchThreads = function(threadKeys, callback) {
		var multi = redis.multi();
		threadKeys.forEach(function(key) {
			multi.zrevrange(key, 0, 10);
			multi.zcard(key);
		});
		multi.exec(function(err, results) {
			console.log('**Fetch thread results:',results)
			if (err) {
				callback(err, null);
			}
			else {
				var threads = [], ln = results.length;
				for(var i=0; i<ln; i+=2) {
					var t = {};
					//t.id = (/\d+\:[^:]+$/.exec(threadKeys[i/2]) || [])[0];
					t.id = threadKeys[i/2].substring(threadKeys[i/2].lastIndexOf(":")+1);
					t.notifications = results[i];
					t.total = results[i+1];
					threads.push(t);
				}
				console.log('***Populated threads', threads)
				populateThreads(threads, callback);
			}
		});
	};
	
	
	/**
	 * 
	 */
	var populateThreads = function(threads, callback) {
		var multi = redis.multi();
		console.log('threads', threads)
		threads.forEach(function(thread) {
			multi.mget(thread.notifications);
		});
		multi.exec(function(err, results) {
			console.log ('results', results)
			if (err) {
				callback(err, null);
			}
			else {
				try {
					var i = results.length;
					while (i--) {
						threads[i].notifications = results[i].map(function(not) {
							return (not) ? JSON.parse(not).attrs : null;
						});
					}
					callback(err, threads);
				}
				catch (e) {
					callback(e.toString(), null);
				}
			}
		});
	};
	
	
};
