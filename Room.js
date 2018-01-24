var STATE = {
    AVAILABLE:1,
    RESERVED:2,
    OCCUPIED:3,
    EXITING:4,
    UNKNOWN:5,
    RESERVED_OTHER:6,
}

/*
  get_inputs is a function that get the current state of all I/Os in an object
  and returns it via the passed callback function
  {
      door:["OPEN"|"CLOSED"],
      light:["ON"|"OFF"],
  }
 */

// RoomNextState
// given the specified state and inputs, return what the next state should be
function RoomNextState(state,inputs,queue_empty) {
    var door_open = (inputs.door == "OPEN")
    var light_on = (inputs.light == "ON")
    switch (state) {
    case STATE.AVAILABLE:
	if (light_on && !door_open) {
	    return STATE.OCCUPIED
	}
	if (!queue_empty) {
	    return STATE.RESERVED
	}
	return state
    case STATE.RESERVED:
	if (light_on && !door_open) {
	    return STATE.OCCUPIED
	}
	if (queue_empty) {
	    return STATE.AVAILABLE
	}
	return state
    case STATE.OCCUPIED:
	if (!light_on && door_open) {
	    if (queue_empty) {
		return STATE.AVAILABLE
	    } else {
		return STATE.RESERVED
	    }
	}
	if (light_on && door_open) {
	    return STATE.EXITING
	}
	return state
    case STATE.EXITING:
	if (light_on && !door_open) {
	    return STATE.UNKNOWN
	}
	if (!light_on) {
	    if (queue_empty) {
		return STATE.AVAILABLE
	    } else {
		return STATE.RESERVED
	    }
	}
	return state
    case STATE.UNKNOWN:
	if (light_on && door_open) {
	    return STATE.EXITING
	}
	if (!light_on) {
	    if (queue_empty) {
		return STATE.AVAILABLE
	    } else {
		return STATE.RESERVED
	    }
	}
	return state
    }
}

function Room(name,get_inputs) {
    var me = this
    me.listeners = [ ]
    me.queue = [ ]
    me.state = ""
    me.poll_delay_ms = 1000
    me.exit_timeout = 15000
    me.reservation_timeout = 180000
    me.name = name
    me.lastTOS = ""
    //var last_input
    //var exit_timer, reservation_timer
    
    var exitTimeout = function() {
	var new_state
	me.exit_timer = false
	if (me.queue.length == 0) {
	    new_state = STATE.AVAILABLE
	} else {
	    new_state = STATE.RESERVED
	}
	if (new_state != me.state) {
	    var i
	    var old_state = me.state
	    me.state = new_state
	    for (i=0;i<me.listeners.length;i++) {
		me.listeners[i](me,name,new_state,old_state)
	    }
	} else {
	    console.log("This is weird. exit timeout should change state, but didn't!")
	}
    }
    var reservationTimeout = function() {
	me.reservation_timer = false
    }
    
    // control loop
    var run = function() {
	var t0 = new Date()
	get_inputs(function(inputs) {
	    var qe = me.queue.length == 0
	    var new_state = RoomNextState(me.state,inputs,qe)
	    //console.log("Room "+me.name,inputs,"q=",me.queue,",",StateNames[me.state],"->",StateNames[new_state])
	    me.last_input = inputs
	    var ex1=new_state == STATE.RESERVED && ((qe?"":me.queue[0]) != me.lastTOS)
	    if (new_state != me.state || ex1) {
		if (ex1) console.log(name+" remaining in state Reserved with Q change")
		var i, old_state = ex1 ? STATE.RESERVED_OTHER : me.state
		me.state = new_state
		if (new_state == STATE.EXITING) {
		    // start exit timer
		    me.exit_timer = setTimeout(exitTimeout,me.exit_timeout)
		} else if (new_state == STATE.RESERVED) {
		    // start reservation timer
		    me.reservation_timer = setTimeout(reservationTimeout,me.reservation_timeout)
		}
		if (old_state == STATE.EXITING) {
		    // cancel exit timer
		    clearTimeout(me.exit_timer)
		} else if (old_state == STATE.RESERVED) {
		    // cancel reservation timer
		    clearTimeout(me.reservation_timer)
		}
		
		for (i=0;i<me.listeners.length;i++) {
		    me.listeners[i](me,name,new_state,old_state)
		}
	    }
	    me.lastTOS = me.queue.length ? me.queue[0] : ""
	    var t1 = new Date()
	    var sleep_ms = me.poll_delay_ms - (t1-t0)
	    if (sleep_ms < 10) sleep_ms = 10
	    setTimeout(run,sleep_ms)
	})
    }

    // start control loop
    me.start = function() {
	get_inputs(function(inputs) {
	    var door_open = (inputs.door == "OPEN")
	    var light_on = (inputs.light == "ON")
	    if (!door_open && !light_on) {
		me.state = STATE.AVAILABLE
	    } else if (!door_open && light_on) {
		me.state = STATE.UNKNOWN
	    } else if (door_open && !light_on) {
		me.state = STATE.AVAILABLE
	    } else { // if (door_open && light_on)
		me.state = STATE.AVAILABLE
	    }
	    for (i=0;i<me.listeners.length;i++) {
		me.listeners[i](me,name,me.state,"")
	    }
	    run()
	})
    }
    me.StateName = function() {
	return StateNames[me.state]
    }
    me.STATE = STATE
}

var StateNames = {
    1:"Available",
    2:"Reserved",
    3:"Occupied",
    4:"Exiting",
    5:"Unknown",
    6:"Reserved(Other)"
}

module.exports = {
    Room:Room,
    State: StateNames,
    STATE: STATE
}
