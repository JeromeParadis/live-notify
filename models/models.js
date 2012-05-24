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


})();
