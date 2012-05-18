// Notifications



exports.UserNotifications = function(user_id, notify) {
	
	
	var redis = notify.rsr.rc;
	var userNotificationsKey = 'user_notifications:' + user_id;
	var userUnreadKey = 'unread_user_notifications:' + user_id;
	var self = this;
	
	
	/**
	 * Produces the key where notifications are stored.  Right now this
	 * is only used in insert() so it could just go inline.  It mainly
	 * serves to make the key creation very explicit and remind me to 
	 * call the function if I need it anywhere else.
	 * 
	 *  @param evt:models.Event - an Event object.
	 */
	var getNotificationKey = function(obj) {
		return obj.name + ":" + obj.id;
	};
	
	
	/**
	 * Stores a new notification.  The results argument passed to the 
	 * callback is an array with the number of items added to each 
	 * queue, generally [1, 1].
	 * 
	 *  @param evt:Object - an Object to convert to a Event object.
	 *  @param callback:Function(err, event:models.Event [, results:Array])
	 */
	this.insert = function(evt, callback) {
		// Get a proper Backbone model and save it.
		var event = new notify.models.Event(evt);
		event.save({}, {
			success: function(obj) {
				console.log('UserNotifications.insert() success', obj);
				if (!obj) {
					callback && callback('Error inserting event', event);
				}
				else {
					var notificationKey = getNotificationKey(obj);
					var score = new Date(obj.get('created')).getTime();
					
					var multi = redis.multi().zadd(userNotificationsKey, score, notificationKey);
					if (!obj.was_read) multi.zadd(userUnreadKey, score, notificationKey);
					
					multi.exec(function(err, results) {
						console.log("UserNotifications.insert() callback", err, obj, results);
						callback && callback(err, obj, results);
					});
				}
			}
		});
	};
	
	
	/**
	 * Returns total and unread notes to a callback:
	 * 
	 *  @param callback:Function(err, total, total_unread)
	 */
	this.get_notifications_count = function(callback) {
		if (!callback) return; // No reason to do anything without a callback.
		
		var multi = redis.multi([
			['zcard', userNotificationsKey],
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
		
		redis.zrevrange(userNotificationsKey, start, end, function(err, keys) {
			if (err) callback(err, [])
			else if (keys) {
				redis.mget(keys, callback);
				//~ function(err, items) {
					//~ callback(err, items);
				//~ });
			}
			else {
				callback("no notifications",null);
			}
		});
	};
	
	
};
