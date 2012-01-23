// Notifications

exports.UserNotifications = function(userid,notify) {
	this.notify = notify;
	this.user_id = userid;

	var self = this;

	this.get_notifications_count = function(callback) {
		var set_key = self.notify.redis_prefix + "user_notifications:" + self.user_id;
		self.notify.rsr.rc.zcard(set_key,function(err,count) {
			if (count && !err)
				callback && callback(null,parseInt(count));
			else
				callback && callback(null,0);
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