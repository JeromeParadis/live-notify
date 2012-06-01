var LiveNotify = function(url,sessionid,options) {
    this.url = url;
    this.sessionid = sessionid;
    this.wrapper_selector = (options && options.wrapper_selector) || '#notify-wrapper';
    this.icon_selector = (options && options.icon_selector) || '#notify-icon';
    this.notifier = null;
    this.notes_summary = null;
    this.notes_collection = null;
    this.notes_all = null;
    this.notes_browser = null;
    this.browser_instance = 0;
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
        if ($('.notify-item-list').length > 0) {
          socket.emit('get_notes');
        }
    });
    

    socket.on('request_session_id', function(data) {
        socket.emit('session', {sessionid: self.sessionid});
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
        self.notes_collection = self.notes_to_event_threads(notes);
        self.notes_summary = new NotificationSummary({collection: self.notes_collection});
        self.notifier.update_count(self.notifier.nb_notes,0);
    });

    // Initial notes on page load
    // ----------------------------------
    socket.on('notes-received', function (notes) {
        console.log("Received!");

        var nb_notes = (notes && notes.length) || 0;
        self.notes_all = self.notes_to_event_threads(notes);
        self.notes_browser = new NotificationBrowser({collection: self.notes_all});
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
            self.notes_summary.add_note(data);
        }
    });

    // Create views
    // ----------------------------------
    require([this.url + 'models/models.js'],function() {
        //alert(models.Event)
    });

    this.notes_to_event_threads = function(notes) {
        var threads = [];
        for (var i=0;i<notes.length;i++) {
          var note = new models.EventThread({ id: notes[i].id,
                                              total: notes[i].total,
                                              notifications: new models.Events(notes[i].notifications)
                                            });
          //note.mport(notes[i]);
          threads.push(note);
        }
        return new models.EventThreads(threads,{comparator: function(thread) {
                return - new Date(thread.get('notifications').at(0).get('created')).getTime();
                }});
    };

    // Views
    // ----------------------------------
    NotificationItem = Backbone.View.extend({
      tagName: "li",
      className: "notify-note-item",
      template: $.template("#template-notify-note-item"),
      events: {
        },
      initialize: function(notes) {
        $(this.el).html("");
        this.render();
        console.log("NotificationItem View initialized");
      },
      render: function() {
        console.log(this.model);
        // $(this.el).html(this.template({
        //   message: this.model.get_notification(),
        // }));
        $(this.el).html(this.model.get_notification());
        return this;
      },
      destroy: function() {
        // this.notifications.reset();
        // this.notifications = null;
        // this.remove();
      }

    });



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

    // Browser View
    // ----------------------------------
    NotificationBrowser = Backbone.View.extend({
      tagName: "ul",
      parentSelector: ".notify-browser",
      className: "notify-item-list",
      NOTES_PER_PAGE: 20,
      page: 1,
      events: {
        },
      initialize: function(notes) {
        self.browser_instance += 1;
        this.browser_instance= self.browser_instance;
        $(this.el).html("");
        this.render();
        $(this.parentSelector).html(this.el);
        console.log("Browser View initialized");
      },
      get_thread_view_id: function(thread) {
        return 'notify-item-' + this.browser_instance + '-' + thread.id
      },
      render: function() {
        var threads = this.collection.models;
        if (threads) {
          for (var i=0;i<threads.length;i++) {
            var item = new NotificationItem({
              model: threads[i],
              id: this.get_thread_view_id(threads[i])
              });
            $(this.el).prepend($(item.el));
          }
        }
        return this;
      },
      destroy: function() {
        this.notifications.reset();
        this.notifications = null;
        this.remove();
      }
      
    });


    // Notifier View
    // ----------------------------------
    NotificationSummary = Backbone.View.extend({
      tagName: "div",
      className: "notify-summary",
      MAX_NOTES: 20,
      template: $.template("#template-notify-summary"),
      threads: [],
      events: {
        },
      initialize: function(notes) {
        // for (var i=0;i<notes.length;i++) {
        //   var note = new models.EventThread({total: notes[i].total, notifications: new models.Events(notes[i].notifications)});
        //   //note.mport(notes[i]);
        //   this.threads.push(note);
        // }
        // this.collection = new models.EventThreads(this.notifications);
        var message = this.collection.at(0).get_notification();
        $(this.el).html("");
        this.render();
        $(self.wrapper_selector).append(this.el);
        //$(self.icon_selector).removeAttr("disabled").removeClass("s-disabled"); 
        // $(self.icon_selector).removeClass("button-red");
        console.log("View initialized");
      },
      add_note: function(notification) {
          var note = new models.Event(notification);
          if (notification.group_by in this.collection._byId) {
              var thread = this.collection._byId[notification.group_by];
              thread.set({
                total: thread.get('total') + 1,
              });
              thread.get('notifications').add(note,{at: 0});
              this.collection.sort();
          }
          else {
            var thread = new models.EventThread({ id: note.id,
                                              total: 1,
                                              notifications: new models.Events([note]),
                                            });
            this.collection.add(thread,{at: 0});
          }
          
          this.render();

          return this;        
      },
      render: function() {
        var messages = [];
        var threads = this.collection.models;
        if (threads) {
          for (var i=0;i<threads.length;i++) {
            messages.push(threads[i].get_notification());
          }
        }
        $(this.el).html(this.template({messages: messages}));
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
