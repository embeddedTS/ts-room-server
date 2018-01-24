/*
Part of the simulation suite.

*/
/*
Part III - simulated rooms (inputs)

Each simulated room exposes methods to allow the light to be turned on and off,
and the door to be open and closed.  This is used by the simulated users.
*/
function InputTest(name,light,door) {
    var me=this
    me.light= (light === undefined) ? "OFF" : light
    me.door= (door === undefined) ? "OPEN" : door
    me.presence = false
    me.listeners = [ ]
    me.get_input = function(cb) {
	cb({door:me.door,light:me.light})
    }
    me.enter = function() {
	if (me.presence) return false
	me.presence = true
	return true
    }
    me.exit = function() {
	me.presence = false
    }
    me.open_door = function() {
	if (me.door == "OPEN") return true
	if (me.presence) return false 
	me.door = "OPEN"
	for (i=0;i<me.listeners.length;i++) {
	    me.listeners[i](name,{door:me.door})
	}
	return true
    }
    me.close_door = function() {
	if (me.door == "CLOSED") return true
	me.door = "CLOSED"
	for (i=0;i<me.listeners.length;i++) {
	    me.listeners[i](name,{door:me.door})
	}
	return true
    }
    me.turn_on_light = function() {
	if (me.light == "ON") return true
	me.light = "ON"
	for (i=0;i<me.listeners.length;i++) {
	    me.listeners[i](name,{light:me.light})
	}
	return true
    }
    me.turn_off_light = function() {
	if (me.light == "OFF") return true
	if (me.presence) return false
	me.light = "OFF"
	for (i=0;i<me.listeners.length;i++) {
	    me.listeners[i](name,{light:me.light})
	}
	return true
    }
    
}

module.exports = InputTest
