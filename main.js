var fs = require("fs")
var os = require("os")
var HOME = os.homedir()
var Room = require("./Room")
var Input7680 = require("./Input7680")
var InputTest = require("./InputTest")
var cmd = require("./command")
var SimUser = require("./SimUser")
var Logger = require("./StateLogger")

if (!String.prototype.times) {
    String.prototype.times = function(n) {
        return Array.prototype.join.call({length:n+1}, this)
    }
}

var sim_mode
if (process.argv[2] == "test") {
    console.log("Test mode")
    sim_mode = true
}
var config_file = HOME+"/.ts-room-server-config"
if (!fs.existsSync(config_file)) {
    console.log("Config file "+config_file+" not found")
    console.log("Please consult the documentation on what this JSON file should contain")
    return
}
var config = JSON.parse(fs.readFileSync(config_file, "utf8"))

var inputs = [], i
for (i=0;i<config.rooms.length;i++) {
    if (sim_mode) {
	inputs.push(new InputTest(config.rooms[i].name))
    } else {
	inputs.push(new Input7680(config.rooms[i].name,
				  config.rooms[i].host,
				  config.rooms[i].threshold))
    }
}

var state = { }
var input = { engr:{}, prod:{} }

function input_change_logger(name,change) {
    var i,ob={}
    for (i in change) {
	ob[name+"."+i] = change[i]
    }
    Logger(ob)
}
function state_change_logger(room,name,new_state,old_state) {
    var ob={}
    ob[name+".state"] = room.StateName(new_state)
    Logger(ob)
}

for (i=0;i<inputs.length;i++) {
    inputs[i].listeners.push(input_change_logger)
}

var rooms = { }
var roomsobj = { }
for (i=0;i<config.rooms.length;i++) {
    var name = config.rooms[i].name
    rooms[name] = new Room.Room(name,inputs[i].get_input)
    rooms[name].listeners.push(state_change_logger)
}

cmd.init(Object.keys(rooms).map(function(room) {return rooms[room]}),Logger)

if (sim_mode) {
    var user1 = new SimUser("Bob",rooms,Logger)
    cmd.start(user1.listen,user1.get_msg,user1.reply)
    var user2 = new SimUser("Joe",rooms,Logger)
    cmd.start(user2.listen,user2.get_msg,user2.reply)
    // User 3 doesn't turn off the light when done
    var user3 = new SimUser("Stinky",rooms,Logger)
    user3.doesnt_turn_off_light_when_done = true
    cmd.start(user3.listen,user3.get_msg,user3.reply)
    // User 4 closes the door without turning the light off    
    var user4 = new SimUser("Igor",rooms,Logger)
    user4.closes_door_without_turning_off_light = true
    cmd.start(user4.listen,user4.get_msg,user4.reply)
    // User 5 closes the door when done, but with the light off
    var user5 = new SimUser("Bashful",rooms,Logger)
    user5.closes_door_when_done = true
    cmd.start(user5.listen,user5.get_msg,user5.reply)
} else {
    cmd.start(cmd.mail_listener,function(m) {
	return [ m.from[0].address, m.text ]
    }, cmd.mail_reply_ob)
}

for (i in rooms) rooms[i].start()

/*

Field Notes:

It is recommended to not run this app on a different device than is running in any
of the restrooms.  The reason is that devices in restrooms are prone to losing 
their connection - for instance, somebody trips the GFCI the device is on, or the 
device gets unplugged while the cleaners vacuum.
Our TS-76xx boards are using WiFi to communicate over the network, adding another 
point of failure should, for example, the WiFi Access Point need to be power 
cycled as some are prone to need.

We are running the app on a machine with a wired ethernet connection in a part of 
the building not frequented by people.  Even if one restroom device goes down for 
a bit, it does not affect the users' ability to interact with the system or get 
notifications for remaining restrooms.  With a bit of extra work, we could even 
add a notification if there was a connectivity problem with one of the restrooms 
so somebody could go check it out.

Note: This code has been updated to use features node available before Node v6.x
and thus will not run on TS boards lacking hardware floating point (such as the 
TS-76xx).
*/
