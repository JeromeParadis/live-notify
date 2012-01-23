  var LiveNotify = function(url,sessionid,options) {
    this.url = url;
    this.sessionid = sessionid;
    this.wrapper_selector = (options && options.wrapper_selector) || '#notify-wrapper';
    this.icon_selector = (options && options.icon_selector) || '#notify-icon';
    this.notifier = null;
    this.notes_summary = null;
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
    socket.on('notes-count', function (count) {
      console.log("Count!");
      self.notifier.update_count(count);
    });

    // Initial notes on page load
    // ----------------------------------
    socket.on('notes-init', function (notes) {
      console.log("Init!");

      var nb_notes = (notes && notes.length) || 0;
      self.notifier.update_count(nb_notes);
      self.notes_summary = new NotificationSummary(notes);
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
      template: $.template("#template-notify-icon"),
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
        if (self.notes_summary) {
          $(self.notes_summary.el).toggle();
        } else {
          socket.emit('get_initial_notes');
        }
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
      template: $.template("#template-notify-summary"),
      notifications: [],
      events: {
        },
      initialize: function(notes) {
        for (var i=0;i<notes.length;i++) {
          var note = new models.Event();
          note.mport(notes[i]);
          this.notifications.push(note);
        }
        this.notifications = new models.Events(this.notifications);
        $(this.el).html("");
        this.render();
        $(self.wrapper_selector).append(this.el);
        $(this.icon_selector).removeAttr("disabled").removeClass("s-disabled"); 
        console.log("View initialized");
      },
      render: function() {
        $(this.el).html(this.template({notifications: this.notifications.models}));
        return this;
      },
      destroy: function() {
        this.notifications.reset();
        this.notifications = null;
        this.remove();
      }
      
    });




    return this;

  };