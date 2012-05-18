
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
	
		console.log("Transport.notify_user() Get sessions for user ", instance.user_id);
		
		//~ self.notify.socket_auth.get_user_session_keys(instance.user_id,function(err,sessions) {
			//~ if (!err)
				//~ console.log("Sessions for user ", sessions);
			//~ else
				//~ console.log("Cannot fetch sessions for user ",instance.user_id);
			//~ if (sessions) {
				//~ for (var i = 0; i < sessions.length; i++) {
					//~ var session = sessions[i];
					//~ self.notify.socket_auth.getSessionSockets(session,function(e,socketids) {
						//~ if (!e && socketids) {
							//~ console.log('socketids',socketids)
							//~ for (var j=0;j<socketids.length;j++) {
								//~ socketid = socketids[j];
								//~ if (socketid)
									//~ self.notify.rsr.r_send_user(socketid,"notify",instance);
							//~ }
						//~ }
					//~ });
				//~ };
			//~ }
		//~ });
		
		self.notify.socket_auth.userSockets(instance.user_id, function(err, sockets) {
			if (err) {
				console.log('Error finding sockets for user!', err, instance);
			}
			else if (!sockets) {
				console.log('No sockets for user!', instance);
			}
			else {
				console.log('socketids', sockets);
				var i = sockets.length;
				while (i--) {
					socketid = sockets[i];
					if (socketid) self.notify.rsr.r_send_user(socketid, "notify", instance);
				}
			}
		});
	};

	return this;
};
