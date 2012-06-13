var LiveNotify = function(url,sessionid,options) {
    this.url = url;
    this.sessionid = sessionid || null;
    this.wrapper_selector = (options && options.wrapper_selector) || '#notify-wrapper';
    this.icon_selector = (options && options.icon_selector) || '#notify-icon';
    this.include_css = (options && options.include_css) || true;
    this.notifier = null;
    this.notes_summary = null;
    this.notes_collection = null;
    this.notes_all = null;
    this.notes_browser = null;
    this.browser_instance = 0;
    this.notes_per_page = (options && options.notes_per_page) || 20;
    this.notes_per_summary_page = (options && options.notes_per_summary_page) || 10;
    var self = this;

    var createEl = function(tag, attrs) {
      var el, key, value;
      el = document.createElement(tag);
      for (key in attrs) {
        value = attrs[key];
        el[key] = value;
      }
      return el;
    };

    // Add Default CSS
    if (self.include_css) {
      // var protocol = (('https:' == document.location.protocol) ? 'https://' : 'http://');
      var d = document.documentElement;
      var css = createEl('link', {
        rel: 'stylesheet',
        href: self.url + 'css/live-notify.css',
        type: 'text/css',
        media: 'all'
      })
      css.onload = function() { return true; };
      d.appendChild(css);
    }

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
    

    socket.on('request_session_id', function(data) {
        socket.emit('session', {sessionid: self.sessionid});
    });

    socket.on('session_auth', function(data) {
        if ($('.notify-item-list').length > 0) {
          socket.emit('get_notes',{page: 1, items_per_page: self.notes_per_page });
        }
    });
    
    // Initial notes on page load
    // ----------------------------------
    socket.on('notes-count', function (results) {
        console.log("Count,unread", results);//results.nb_notes,results.nb_unread);
        self.notifier.update_count(results.nb_notes,results.nb_unread);
    });

    // Initial notes on page load
    // ----------------------------------
    socket.on('notes-init', function (data) {
        console.log("Init!");

        var nb_notes = (data && data.notes && data.notes.length) || 0;
        self.add_notes(data.notes);
        self.notes_summary = new NotificationSummary({collection: self.notes_all});
        self.notifier.update_count(self.notifier.nb_notes,0);
    });

    // Initial notes on page load
    // ----------------------------------
    socket.on('notes-received', function (data) {
        console.log("Received!");

        var nb_notes = data.nb_notes;
        self.add_notes(data.notes);
        if (!data.ref) {
          self.notes_browser = new NotificationBrowser({collection: self.notes_all, nb_total: data.nb_total});
          }
        else {
          self.notes_browser.show_next_notes(data);
        }
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

    this.add_notes = function(notes) {
        if (self.notes_all) {
          for (var i=0;i<notes.length;i++) {
            if (!(notes[i].id in this.notes_all._byId)) {
              var note = self.note_to_event_thread(notes[i]);
              self.notes_all.add(note)
              }
          }
        }
        else
          self.notes_all = self.notes_to_event_threads(notes); 
    };


    this.notes_to_event_threads = function(notes) {
        var threads = [];
        for (var i=0;i<notes.length;i++) {

          var note = self.note_to_event_thread(notes[i]);
          threads.push(note);
        }
        return new models.EventThreads(threads,{comparator: function(thread) {
                return - new Date(thread.get('notifications').at(0).get('created')).getTime();
                }});
    };

    this.note_to_event_thread = function(note) {
          return new models.EventThread({
            id: note.id,
            total: note.total,
            notifications: new models.Events(note.notifications)
          });
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
        $(this.el).html(this.template({
          message: this.model.get_notification(),
          date: new Date(this.model.get('notifications').at(0).get('created')),
        }));
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
          if (self.notes_all){
            self.notes_summary = new NotificationSummary({collection: self.notes_all});
            socket.emit('mark_notes_read');
            this.update_count(this.nb_notes,0);
            }
          else
            socket.emit('get_initial_notes',{page: 1, items_per_page: self.notes_per_summary_page });
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
      page: 1,
      nb_displayed: 0,
      events: {
        "click .notify-note-item.show-more":      "show_more",
        },
      initialize: function(options) {
        self.browser_instance += 1;
        this.browser_instance= self.browser_instance;
        this.nb_total = (options && options.nb_total) || 0;
        $(this.el).html("");
        this.render();
        $(this.parentSelector).html(this.el);
        console.log("Browser View initialized");
      },
      get_thread_view_id: function(thread_id) {
        return 'notify-item-' + this.browser_instance + '-' + thread_id
      },
      render: function() {
        this.show_threads(this.collection.models)
        return this;
      },
      show_threads: function(threads) {
        if (threads) {
          $('.notify-note-item.show-more').remove();
          for (var i=0;i<threads.length;i++) {
            this.show_thread(threads[i]);
          }
          this.insert_show_more();
        }
        return this;
      },
      insert_show_more: function() {
        if (this.collection.models.length < this.nb_total) {
          $(this.el).append('<li class="notify-note-item show-more"><a>Show more notifications</a></li>')
        }        
      },
      show_thread: function (thread) {
        var item = new NotificationItem({
          model: thread,
          id: this.get_thread_view_id(thread.id)
          });
        $(this.el).append($(item.el));
        this.nb_displayed += 1;

        return this;
      },
      show_more: function() {
        this.page += 1;
        socket.emit('get_notes',{
          page: this.page,
          items_per_page: self.notes_per_page,
          ref: this.browser_instance,
        });
        return this;
      },
      show_next_notes: function(data) {
        console.log(data);
        if (data.notes) {
          this.nb_total = data.nb_total;
          $('.notify-note-item.show-more').remove();
          var start_at = this.nb_displayed + 1;
          for(var i=start_at; i< (this.page * self.notes_per_page) && i < this.collection.models.length; i++) {
            this.show_thread(this.collection.models[i]);
          }
          this.insert_show_more();
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
      MAX_NOTES: 10,
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
          for (var i=0;i<threads.length && i< this.MAX_NOTES;i++) {
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
