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
		notify.models.Backbone.search_delete(notify.models.Event,"*",function(results) {
			console.log("items: ", req.body.events.length)
			for(var i=0; i< req.body.events.length; i++) {
				var evt = req.body.events[i];
				console.log("First event: ", evt);
				var r_event = new notify.models.Event(evt);
				r_event.save();
				self.notify.transport.notify_user(r_event.attributes);
				break;
			}
			console.log("Init done!");
			res.send({ success: true});
			
		},function(err) {
			console.log("ERROR","Error cleaning up events");
			res.send({ success: false});
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