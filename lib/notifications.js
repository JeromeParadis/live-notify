// Notifications

exports.UserNotifications = function(userid,notify) {
	this.notify = notify;
	this.user_id = userid;

	var self = this;

	this.get_notifications_count = function(callback) {
		var set_key = self.notify.redis_prefix + "user_notifications:" + self.user_id;
		var set_read_key = self.notify.redis_prefix + "unread_user_notifications:" + self.user_id;

		var multi = self.notify.rsr.rc.multi();

		multi.zcard(set_key);
		multi.zcard(set_read_key);

		multi.exec(function(err,results) {
			if (results && !err)
				callback && callback(null,parseInt(results[0]),parseInt(results[1] || 0));
			else
				callback && callback(null,0,0);
		});
	};

	this.mark_all_read = function(callback) {
		var set_key = self.notify.redis_prefix + "unread_user_notifications:" + self.user_id;

		self.notify.rsr.rc.del(set_key, function(err,results) {
			callback && callback(null,true);
		});
	};


	this.get_notifications = function(page,max_items,callback) {
		var no_page = page || 1;
		var nb_items = max_items || 20;
		var set_key = self.notify.redis_prefix + "user_notifications:" + self.user_id;
		var start = (no_page - 1) * nb_items;
		var end = (no_page) * nb_items - 1;
		self.notify.rsr.rc.zrevrange(set_key,start,end,function(err,results) {
			if (results && !err) {
				self.notify.rsr.rc.mget(results,function(err,items) {
					if (items)
						callback && callback(null,items);
					else
						callback && callback("no notifications",null);
				});
			}
			else
				callback && callback("no notifications",null);
		});
	};
};