  var LiveNotify = function(url,sessionid,options) {
    this.url = url;
    this.sessionid = sessionid;
    this.icon_selector = (options && options.icon_selector) || '#notify-icon';
    var self = this;

    if (!sessionid) {
      return this;
    }
    console.log("opening socket for cookie: " + this.sessionid);
    var socket = io.connect(this.url);

    // Socket.io callbacks
    // ----------------------------------


    // Session authorized
    // ----------------------------------
    socket.on('authorize', function (data) {
      console.log(data);
      socket.emit('auth', { sessionid: self.sessionid });
      console.log("Connected to notify!");
      // Set ping to keep session alive
      // ----------------------------------
      var ping = function() {
        socket.emit('auth_ping', { sessionid: self.sessionid });
      }
      setInterval(ping,1000 * 30);
    });

    // Ready to receive and transmit
    // ----------------------------------
    socket.on('ready', function (data) {
      console.log("Ready!");
      $(self.icon_selector).removeAttr("disabled").removeClass("s-disabled"); 
    });

    // Initial notes on page load
    // ----------------------------------
    socket.on('notes-init', function (data) {
      console.log("Init!");
      var nb_notes = (data && data.length) || 0;
      $(self.icon_selector).addClass("button-red").val(nb_notes);
    });

    // Direct message
    // ----------------------------------
    socket.on('message', function (data) {
      alert(data.from + " says: " + data.message);
    });

    // New notification received
    // ----------------------------------
    socket.on('notify', function (data) {
      console.log(data);

      var nb = parseFloat($(self.icon_selector).val()) + 1;
      $(self.icon_selector).addClass("button-red").val(nb); 
    });

    return this;

  };