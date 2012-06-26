
exports = module.exports = Transport;

function Transport(notify) {
	
	this.notify = notify;
	var self = this;
	
	/**
	 * Sends notifications to the relevant sockets for a given user.
	 * 
	 *  @param instance:Object - the 'attributes' attribute of an
	 * 			model.Event object.
	 */
	this.notify_user = function(instance) {
	
		self.send_user_message('notify', instance.user_id, instance);
	};

	this.send_user_message = function(message, user_id, instance) {
	
		if (notify.debug_mode)
			console.log("Transport.send_user_message(). Get sessions for user ", user_id);
		
		self.notify.socket_auth.userSockets(instance.user_id, function(err, sockets) {
			if (err) {
				if (notify.log_errors)
					console.log('Error finding sockets for user!', err, user_id);
			}
			else if (!sockets) {
				if (notify.log_errors)
					console.log('No sockets for user!', user_id);
			}
			else {
				if (notify.debug_mode)
					console.log('socketids', sockets);
				var i = sockets.length;
				while (i--) {
					socketid = sockets[i];
					//if (socketid) self.notify.rsr.r_send_user(socketid, message, instance);
					var sock = notify.io.sockets.socket(socketid);
					if (notify.debug_mode) {
						console.log('-------> Found socket!', sock)
					}
					if (sock && sock.id) {
						if (notify.debug_mode)
							console.log("sending direct update to ",sock.id)
						sock.emit(message,instance);
					}
				}
			}
		});
	};

	return this;
};
