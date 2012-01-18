var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , connect = require('connect')
  , redis = require('redis')
  , Notify = require('../../index');

var rc = redis.createClient();

app.listen(3000);

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

Notify(io, {redis_namespace: "shwowp."
           ,auth_plugin: "django-auth"});

