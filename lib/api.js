exports.EventsApi = EventsApi;

function EventsApi(notify) {

	this.rsr = rsr;
	this.notify = notify;

	var self = this;

	// this.index = function(req, res){
	//   res.send('forum index');
	// };

	// this.new = function(req, res){
	//   res.send('new forum');
	// };

	this.create = function(req, res){
		console.log("events received!", req.body.events);
		console.log("Cleaning up!");
		notify.rsr.rc.keys(notify.redis_prefix + "user_notifications*",function(err,keys) {
			if (keys) {
				keys.push("next.notify.event.id");
				notify.rsr.rc.del(err,keys,function(err) {
					if (!err) {

						notify.models.Backbone.search_delete(notify.models.Event,"*",function(results) {
						 	console.log("items: ", req.body.events.length);
						 	var users = [];
							for(var i=0; i< req.body.events.length; i++) {
								var evt = req.body.events[i];
								var r_event = new notify.models.Event(evt);
								r_event.save({},{ success: function(err,obj) {
									console.log("Saved notification:", obj.id)
									if (obj) {
										var key = obj.name + ":" + obj.id;
										var set = notify.redis_prefix + "user_notifications:" + obj.get('user_id');
										notify.rsr.rc.zadd(set,1,key);
										console.log("Indexed", key, "in", set);
									}
								}});
								self.notify.transport.notify_user(r_event.attributes);
							}
							console.log("Init done!");
							res.send({ success: true});
							
						},function(err) {
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

exports.MessageApi = MessageApi;

function MessageApi(notify) {

	this.rsr = rsr;

	var self = this;

	// this.index = function(req, res){
	//   res.send('forum index');
	// };

	// this.new = function(req, res){
	//   res.send('new forum');
	// };

	this.create = function(req, res){
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