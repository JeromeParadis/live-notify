/**
 * Export the wrapper.
 */

var connect = require('connect')
   ,redis = require('redis');

exports = module.exports = DjangoAuthentication;

function DjangoAuthentication(io) {
	this.rc = redis.createClient();
	var self = this;
	io.configure(function (){
	  io.set('authorization', function (handshakeData, callback) {
	    var cookie = handshakeData.headers.cookie;
	    var sessionid = null;
	    if (cookie) {
	       var parsed_cookies = connect.utils.parseCookie(cookie);
	       sessionid = parsed_cookies['sessionid'] || null;
	       console.log('Session = ' + sessionid)
	     }
	    handshakeData.django_sessionid = sessionid;
	    if (sessionid) {
	      var key = 'shwowp.sessions:' + sessionid;
	      self.rc.get(key,function(err,obj) {
	        console.log(err,obj)
	        if (obj) {
	          console.log("User connected",obj);
	          // rc.expire(key,20*60);  // Reset expiration when user reconnects
	          callback(null, true);
	        }
	        else
	          callback("Session is not longer active.", false);
	      });
	    }
	    else if (!sessionid)
	      callback("Not a valid session.", false);
	  });
	});
/*
THERE is not catch all event... :-(
TODO: send refresh while browser is open to refresh expiring keys

	io.sockets.on('dispatch', function (socket) {
		console.log('dispatch');
		var sessionid = socket.handshake.django_sessionid || null;
		if (sessionid) {
			var key = 'shwowp.sessions:' + sessionid;
			self.rc.expire(key,20 * 60);
		}
	});
*/

}