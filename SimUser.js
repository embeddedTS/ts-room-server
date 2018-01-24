var util=require("util")
/*
Part of the simulation suite.

Part I - simulated users

We simulate a user base.  Each user needs to use a room at a random interval.
As soon as the need to go, they will send a request and wait for a reply
telling them they can go.  When they receive this reply, they will take a
certain amount of time to get there, at which case they will interact with the
lights and door to use the room.

Procedurally, what this means is that the user does this:
1. wait a random amount of time within a certain range
2. send a request to use a room
3. wait for a message to be received that the room is available
4. wait a random time with a certain range to simulate walking to the room
5. if the door is open, try to open the door
6. if the door is still closed, go back to 2
7. set the presence flag in the room
8. wait a short random amount of time
9. try to turn the light on
10. wait a short random amount of time
11. close the door
12. wait a random amount of time within a certain range to simulate using the room
13. open the door
14. if the "doesn't turn off light when done" flag is set, go to 1
15. wait a short random amount of time
16. if the "closes door without turning off light" flag is set, go to 20
17. turn off light
18. wait a short random amount of time
19. if the "closes door when done" flag is not set, go to 1
20. close door and go to 1

All simulated users need to be able to send a message to the command processor.
We could have them all go through a single channel, or we could have a separate
command router for each user, which is probably the simpler way, at least until
we figure out what we are doing and can tell if there is a better way.

var user1 = new SimUser(name,inputs)
cmd.start(user1.listen,user1.get_msg,user1.reply)

The inputs parameter contains an object where the key is the name of the
room and the value is the InputTest object for the room upon which we
can call open_door, close_door, turn_on_light, and turn_off_light.

We haven't yet figured out how we are going to get replies from the command
processor telling us the room is ready.  The reason is that this is detached
from any specific request.  In our request we need to store how to reply and
get at that in the separate reply.  I think to do this we may need to keep an
object which maps from names to reply objects, which means that each user needs
a from name.
*/
var SECOND = 1000
var MINUTE = 60*SECOND
var HOUR = 60*MINUTE

function random_delay(min,max) {
    return min + Math.random()*(max-min)
}

function SimUser(name,inputs,Logger) {
    var me=this
    me.step = 1
    me.min_time_until_go = 1*SECOND // 4*HOUR
    me.max_time_until_go = 2*SECOND // 10*MINUTE
    me.min_walk_time = 1*SECOND
    me.max_walk_time = 2*SECOND
    me.min_enter_time = 1*SECOND
    me.max_enter_time = 2*SECOND
    me.min_close_time = 1*SECOND
    me.max_close_time = 2*SECOND
    me.min_use_time = 5*SECOND
    me.max_use_time = 10*SECOND
    me.min_exit_time = 1*SECOND
    me.max_exit_time = 2*SECOND
    me.min_close_time = 1*SECOND
    me.max_close_time = 2*SECOND
    me.doesnt_turn_off_light_when_done = false
    me.closes_door_without_turning_off_light = false
    me.closes_door_when_done = false
    var cb
    var Log = function(msg) {
	var ob = { }
	ob[name] = msg
	Logger(ob)
    }
    var step1 = function() { // wait a random amount of time within a certain range
	var delay = random_delay(me.min_time_until_go,me.max_time_until_go)
	Log("need to go in "+Math.round(delay)+"ms")
	setTimeout(step2,delay)
    }
    var step2 = function() { // send a request to use a roo
	Log("need to go")
	cb("go")
    }
    var step3 = function(m) { // wait for a message to be received that the room is available
	if (m.ready) {
	    Log("walking to the "+m.ready+" room")
	    // wait a random time with a certain range to simulate walking to the room
	    setTimeout(function() {
		step4(m.ready)
	    },me.min_walk_time,me.max_walk_time)
	}
    }
    var step4 = function(nam) {
	// if the door is open, try to open the door
	if (inputs[nam].door == "CLOSED") {
	    Log("found the "+nam+" room door closed, turning handle")
	    if (!inputs[nam].open_door()) {
		// if the door is still closed, go back to 2
		Log("found the "+nam+" room door locked")
		return step2()
	    }
	}
	// set the presence flag in the room
	Log("entering the "+nam+" room")
	inputs[nam].enter()
	// wait a short random amount of time
	setTimeout(function() {
	    step5(nam)
	},random_delay(me.min_enter_time,me.max_enter_time))
    }
    var step5 = function(nam) {
	// try to turn the light on
	Log("trying to turn the "+nam+" room light on")
	inputs[nam].turn_on_light()
	// wait a short random amount of time
	setTimeout(function() {
	    step6(nam)
	},random_delay(me.min_close_time,me.max_close_time))
    }
    var step6 = function(nam) {
	// close the door
	Log("closing the "+nam+" room door")
	inputs[nam].close_door()
	// wait a random amount of time within a certain range to simulate using the room
	setTimeout(function() {
	    step7(nam)
	},random_delay(me.min_use_time,me.max_use_time))
    }
    var step7 = function(nam) {
	// open the door and exit
	Log("done, opening the "+nam+" room door and exiting")
	inputs[nam].exit()
	inputs[nam].open_door()
	// if the "doesn't turn off light when done" flag is set, go to 1
	if (me.doesnt_turn_off_light_when_done) return step1()
	// wait a short random amount of time
	setTimeout(function() {
	    step8(nam)
	},random_delay(me.min_exit_time,me.max_exit_time))
    }
    var step8 = function(nam) {
	// if the "closes door without turning off light" flag is set, go to 9
	if (me.closes_door_without_turning_off_light) return step9(name)
	// turn off light
	Log("turning off the "+nam+" room light")
	inputs[nam].turn_off_light()
	// wait a short random amount of time
	setTimeout(function() {
	    step9(nam)
	},random_delay(me.min_close_time,me.max_close_time))
    }
    var step9 = function(nam) {
	// if the "closes door when done" flag is set, close the door
	if (me.closes_door_when_done) {
	    Log("closing the "+nam+" room door")
	    inputs[nam].close_door()
	}
	step1()
    }
    me.listen = function(cb0) {
	cb = cb0
	// this gets called to start listening for requests from the
	// simulated user.  We periodically call the callback function
	// with our requests.
	step1()
    }
    me.get_msg = function(m) {
	// process our own parameters to return [from, txt]
	// from doesn't matter since we have a 1:1 with a command processor
	// txt is our text command to the processor
	return [ name, m ]
    }
    me.reply = { send:function(from,reply) {
	Log("to "+from+":"+util.inspect(reply))
	step3(reply)
	// process replies coming back from the command processor
    } }
}

module.exports = SimUser
/*
4. when both restrooms are free, they are both reserved for the first user who asks
   until they actually pick one.  (What if they pick the wrong one?)  this MAY
   actually be okay.
5. We seem to go from Reserved to Available when somebody enter the restroom,
   instead of going to Occupied!
   I think our previous fix may have caused this, it appears that we move the user
   from the queue too soon, almost immediately, probably because the head of queue
   changed when we ADDED the second(?) user.  at this point i wouldn't be surprised if
   this erroneous removal caused the next one to be removed due to the queue changing again.
*/
