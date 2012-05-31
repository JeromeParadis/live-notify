(function (notify) {
    
    var server = false, models;
    
    if (typeof exports !== 'undefined') {
        Backbone = require('server-backbone-redis');
        
        Backbone.debug = true;
        models = exports;
        server = true;
        
    } else {
        if (!models) models = {};
        this.models = models;
    }

    //
    //models
    //
    models.Backbone = Backbone;

    models.Event = Backbone.Model.extend({
        defaults: {
            "id": null,
            "user": {},
            "foreign_id":  null,
            "type": "notification",
            "created": null,
            "was_read": false,
            "group_by": null
        },
        name: "event",
        error: function(model, error) {
            //
        },
        debug: function() {
            console.log("User: " + this.get("id"));
        }
        //~ safeClone: function() {
            //~ var clone = this.clone();
            //~ clone.unset('name');
            //~ clone.unset('email');
            //~ clone.unset('location');
            //~ clone.unset('gender');
            //~ return clone;
        //~ }
    });

    models.Events = Backbone.Collection.extend({
        model: models.Event
    });

    models.EventThread = Backbone.Model.extend({
        defaults: {
            "total": null,
            "notifications": null,
        },
        name: "event",
        error: function(model, error) {
            //
        },
        debug: function() {
            console.log("User: " + this.get("id"));
        },
        get_notification: function() {
            var notifications = this.get('notifications');
            if (notifications) {
                var events = notifications.models;
                var message = null;
                var actors = [];
                var objects = null;
                var anonymous_count = 0;
                for (var i=0; i< events.length; i++) {
                    var evt = events[i];
                    if (i==0) {
                        message = evt.get('message');
                        objects = evt.get('objects');
                    }
                    var actor = evt.get('actor');
                    if (actor)
                        actors.push(actor);
                    else
                        anonymous_count += 1;
                }
                if (objects && message) {
                    for(obj_name in objects) {
                        message = message.replace('{{' + obj_name + '}}', '<a href="' + objects[obj_name].url + '">' + objects[obj_name].name + '</a>')
                    }
                }
                if (actors.length > 0)  {
                    var actor_no = 1;
                    var actor_text = ''
                    while(actor_no <= actors.length) {
                        var actor = actors[actor_no-1];
                        if (actor) {
                            if (actor_no <= 2)
                                actor_text += '<a href="' + actor.profile + '">' + actor.first_name + '</a> ';
                            else {
                                var nb_others = actors.length - 2;
                                actor_text += 'and <a href="#">' + nb_others + 'other' + (nb_others > 1 ? 's' : '') +  '</a>';
                                break;
                            }
                        }
                        if (actor_no < 2 && actors.length > 1) {
                            actor_text += (actors.length == 2) ? ' and ' : ', ';
                        }
                        actor_no++;
                    }
                    message = message.replace('{{actor}}',actor_text);
                }
                else
                    message = message.replace('{{actor}}','Someone');
                if (anonymous_count > 0)
                    message = message.replace('{{anonymous}}',(anonymous_count == 1) ? 'Someone' : anonymous_count + ' persons');

                return message;
            }
            return null;
        },
        //~ safeClone: function() {
            //~ var clone = this.clone();
            //~ clone.unset('name');
            //~ clone.unset('email');
            //~ clone.unset('location');
            //~ clone.unset('gender');
            //~ return clone;
        //~ }
    });

    models.EventThreads = Backbone.Collection.extend({
        model: models.EventThread
    });


})();
