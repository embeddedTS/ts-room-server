var http = require("http")

function Input7680(name,host,light_threshold) {
    var me=this
    me.listeners = [ ]
    //var me.last_door, me.last_light
    me.get_input = function(cb) {
	http.get({host:host, port:8080, path:"/adc"}, function(response) {
	    var body = ''
	    response.on('data', function(d) {
		body += d
	    })
	    response.on('end', function() {
		var values = body.split("\n")
		var adc0 = parseInt(values[0])
		var adc1 = parseInt(values[1])
		var light = (adc0 > light_threshold) ? "ON" : "OFF"
		var door = (adc1 < 8000) ? "CLOSED" : "OPEN"
		//console.log(host+":"+door+","+light)
		var change = { }
		if (me.last_door) {
		    if (me.last_door != door) change.door = door
		    if (me.last_light != light) change.light = light
		    if (Object.keys(change).length) {
			var i
			for (i=0;i<me.listeners.length;i++) {
			    me.listeners[i](name,change)
			}
		    }
		    me.last_door = door
		    me.last_light = light
		} else {
		    me.last_door = door
		    me.last_light = light
		    var i
		    for (i=0;i<me.listeners.length;i++) {
			me.listeners[i](name,{door:door,light:light})
		    }
		}
		cb({door:door,light:light})
	    })
	}).on("error",function(err) {
	    console.log(new Date()+"send error:",err.message)
	    cb({door:me.last_door,light:me.last_light})
	})
    }
}

module.exports = Input7680
