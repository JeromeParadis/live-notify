


exports.MessagesApi = MessagesApi;

function MessagesApi(io) {

	this.io = io;

	var self = this;

	this.index = function(req, res){
	  res.send('forum index');
	};

	this.new = function(req, res){
	  res.send('new forum');
	};

	this.create = function(req, res){
		io.sockets.emit('message', { from: req.body.from, message: req.body.message });
		res.send({ success: true});
	};

	this.show = function(req, res){
	  res.send('show forum ' + req.params.forum);
	};

	this.edit = function(req, res){
	  res.send('edit forum ' + req.params.forum);
	};

	this.update = function(req, res){
	  res.send('update forum ' + req.params.forum);
	};

	this.destroy = function(req, res){
	  res.send('destroy forum ' + req.params.forum);
	};

	return this;
}