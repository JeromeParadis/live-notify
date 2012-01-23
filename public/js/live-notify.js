  var LiveNotify = function(url,sessionid,options) {
    this.url = url;
    this.sessionid = sessionid;
    this.wrapper_selector = (options && options.wrapper_selector) || '#notify-wrapper';
    this.icon_selector = (options && options.icon_selector) || '#notify-icon';
    this.notifier = null;
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
      self.notifier = new Notifier();
    });

    // Initial notes on page load
    // ----------------------------------
    socket.on('notes-count', function (data) {
      console.log("Count!");
      var nb_notes = data || 0;
      self.notifier.update_count(nb_notes);
    });

    // Initial notes on page load
    // ----------------------------------
    socket.on('notes-init', function (data) {
      console.log("Init!");

      var nb_notes = (data && data.length) || 0;
      self.notifier.update_count(nb_notes);
      self.notifier.show_notes();
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

    // Create views
    // ----------------------------------
    require([this.url + 'models/models.js'],function() {
      //alert(models.Event)
    });

    // Views
    // ----------------------------------

    // Notifier View
    // ----------------------------------
    Notifier = Backbone.View.extend({
      tagName: "div",
      className: "notify-notifier",
      nb_notes: 0,
      wrapper_selector: self.wrapper_selector,
      icon_selector: self.icon_selector,
      events: {
        "click .notify-icon":      "click_expand",
        },
      initialize: function() {
        $(this.el).html("");
        this.render();
        $(self.wrapper_selector).html(this.el);
        $(this.icon_selector).removeAttr("disabled").removeClass("s-disabled"); 
        console.log("View initialized");
      },
      template: $.template("#template-notify-icon"),
      render: function() {
        $(this.el).html(this.template());
        return this;
      },
      update_count: function(nb) {
        this.nb_notes = nb;
        this.render_count();
        return this;
      },
      click_expand: function() {
        console.log("click");
        socket.emit('get_initial_notes');
        return this;
      },
      show_notes: function() {
        alert('We got notes!');

        return this;
      },
      render_count: function() {
        if (this.nb_notes > 0) 
          $(this.icon_selector).addClass("button-red");
        else
          $(this.icon_selector).removeClass("button-red");
        $(this.icon_selector).val(this.nb_notes); 

        return this;
      }
    });

    // Notifier View
    // ----------------------------------
    NotificationSummary = Backbone.View.extend({
      tagName: "div",
      className: "notify-summary",
      nb_notes: 0,
      events: {
        }
    });




    return this;

  };