
exports = module.exports = Transport;

function Transport(notify) {
	this.notify = notify;
	var self = this;
	this.notify_user = function(instance) {
		console.log("Get sessions for user ", instance.user_id);
		self.notify.socket_auth.get_user_session_keys(instance.user_id,function(err,sessions) {
			if (!err)
				console.log("Sessions for user ", sessions);
			else
				console.log("Cannot fetch sessions for user ",instance.user_id);
			if (sessions) {
				for (var i = 0; i < sessions.length; i++) {
					var session = sessions[i];
					self.notify.socket_auth.getSessionSocket(session,function(e,socketid) {
						if (socketid)
							self.notify.rsr.r_send_user(socketid,"notify",instance);
					});
				};
			}
		});
	};

	return this;
};