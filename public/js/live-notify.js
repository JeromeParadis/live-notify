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
    //~ socket.on('authorize', function (data) {
      //~ console.log(data);
      //~ socket.emit('auth', { sessionid: self.sessionid });
      //~ console.log("Connected to notify!");
      //~ // Set ping to keep session alive
      //~ // ----------------------------------
      //~ var ping = function() {
        //~ socket.emit('auth_ping', { sessionid: self.sessionid });
      //~ }
      //~ setInterval(ping,1000 * 30);
    //~ });

    // Ready to receive and transmit
    // ----------------------------------
    socket.on('connect', function (data) {
        console.log("Ready!");
        // Send the session info.
        //socket.emit('auth', { sessionid: self.sessionid });
        self.notifier = new Notifier();
    });
    
    

    // Initial notes on page load
    // ----------------------------------
    socket.on('notes-count', function (results) {
        console.log("Count,unread", results);//results.nb_notes,results.nb_unread);
        self.notifier.update_count(results.nb_notes,results.nb_unread);
    });

    // Initial notes on page load
    // ----------------------------------
    socket.on('notes-init', function (notes) {
        console.log("Init!");

        var nb_notes = (notes && notes.length) || 0;
        self.notes_summary = new NotificationSummary(notes);
        self.notifier.update_count(self.notifier.nb_notes,0);
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

        self.notifier.increase_count();
        if (self.notes_summary) {
            self.notes_summary.add_note();
        }
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
      nb_unread_notes: 0,
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
      update_count: function(nb,unread) {
        this.nb_notes = nb;
        this.nb_unread_notes = unread;
        this.render_count();
        return this;
      },
      increase_count: function() {
        this.nb_notes = this.nb_notes+1;
        this.nb_unread_notes = this.nb_unread_notes+1;
        this.render_count();
        return this;        
      },
      click_expand: function() {
        console.log("click");
        if (self.notes_summary) {
          $(self.notes_summary.el).toggle();
          if (!($(self.notes_summary.el).is(':visible')) && this.nb_unread_notes > 0) {
            // Mark as read
            socket.emit('mark_notes_read');
            this.update_count(self.notifier.nb_notes,0);
          }
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
        if (this.nb_unread_notes > 0)  {
          $(this.icon_selector).val(this.nb_unread_notes); 
          $(this.icon_selector).addClass("button-red");
       }
        else {
          $(this.icon_selector).removeClass("button-red");
          $(this.icon_selector).val('!'); 
        }

        return this;
      }
    });

    // Notifier View
    // ----------------------------------
    NotificationSummary = Backbone.View.extend({
      tagName: "div",
      className: "notify-summary",
      MAX_NOTES: 20,
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
        $(self.icon_selector).removeAttr("disabled").removeClass("s-disabled"); 
        $(self.icon_selector).removeClass("button-red");
        console.log("View initialized");
      },
      add_note: function(notification) {
          var note = new models.Event(notification);
          // note.mport(notification);
          this.notifications.add(note,{at: 0});
          this.render();

          return this;        
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
