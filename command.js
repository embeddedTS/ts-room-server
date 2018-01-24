var mail = require("./mail")
var Logger

function Log(key,msg) {
    var ob = { }
    ob[key] = msg
    Logger(ob)
}

function LogQ(roomlist) {
    var ob={}
    for (j=0;j<roomlist.length;j++) {
	for (i=0;i<roomlist[j].queue.length;i++) {
	    ob["Q."+roomlist[j].name+"."+i] = roomlist[j].queue[i]
	}
	ob["Q."+roomlist[j].name+"."+i] = ""  // in case queue length decreased
    }
    Logger(ob)
}

function QueuePosition(roomlist,adrs) {
    var i,j,pos=Infinity
    for (j=0;j<roomlist.length;j++) {
	for (i=0;i<roomlist[j].queue.length;i++) {
	    if (roomlist[j].queue[i] == adrs && i < pos) {
		pos=i
		break
	    }
	}
    }
    if (pos == Infinity) return -1
    return pos
}

function QueuePush(roomlist,adrs) {
    var j,i
    Log("Queue","+"+adrs)
    for (j=0;j<roomlist.length;j++) {
	roomlist[j].queue.push(adrs)
    }
    LogQ(roomlist)
}

function QueueRemove(roomlist,adrs) {
    var removed = 0
    Log("Queue","-"+adrs)
    for (j=0;j<roomlist.length;j++) {
	for (i=0;i<roomlist[j].queue.length;i++) {
	    if (roomlist[j].queue[i] == adrs) {
		roomlist[j].queue.splice(i,1)
		removed++
		break
	    }
	}
    }
    LogQ(roomlist)
    return removed > 0
}

// we could refactor this to make except_room be the last parameter of QueueRemove
// then QueueRemove could continue to work the same if this parameter was not there
function QueueRemoveOther(roomlist,except_room,adrs) {
    var removed = 0
    Log("Queue","-"+adrs)
    for (j=0;j<roomlist.length;j++) {
	if (roomlist[j].name == except_room) continue
	for (i=0;i<roomlist[j].queue.length;i++) {
	    if (roomlist[j].queue[i] == adrs) {
		roomlist[j].queue.splice(i,1)
		removed++
		break
	    }
	}
    }
    LogQ(roomlist)
    return removed > 0
}

function QueueLength(roomlist) {
    var seen = { }, count=0
    for (j=0;j<roomlist.length;j++) {
	for (i=0;i<roomlist[j].queue.length;i++) {
	    if (roomlist[j][i] in seen) continue
	    roomlist[j][i] = true
	    count++
	}
    }
    return count
}

// key = from, value = room reserved for
var reservations = { }
var from_reply_ob = { }

function state_changed(room,name,new_state,old_state) {
    if (new_state == room.STATE.RESERVED && old_state != room.STATE.RESERVED) {
	//  second clause is wrong. we need to get here if old and new state are
	// both reserved, if the room queue changed.
	// can our run loop in Room.js pretend the old state was not reserved in this case?
	if (room.queue.length == 0) return // INCONCEIVABLE!
	var i
	// check everybody in queue if there are more than two restrooms
	if (room.queue[0] in reservations) {
	    Log("Q."+name,"-"+room.queue[0]+"(1)")
	    room.queue.shift()
	    LogQ([room])	    
	    return
	}
	reservations[room.queue[0]] = name
	QueueRemoveOther(roomlist,name,room.queue[0])
	Log("1. reservation."+room.queue[0]+" -- "+name)
	var reply_ob = from_reply_ob[room.queue[0]]
	reply_ob.send(room.queue[0],{ready:name,timeout:room.reservation_timeout})
    } else if (old_state == room.STATE.RESERVED && new_state != room.STATE.RESERVED) {
	if (room.queue[0] in reservations) {
	    delete reservations[room.queue[0]]
	    Log("2. reservation."+room.queue[0],"")
	    Log("Q."+name,"-"+room.queue[0]+"(2)")
	    room.queue.shift()
	    LogQ([room])
	}
    }
}
/*
Part II - simulated commands

This is a way to bypass mailing or texting commands and replies.  This requires
that we be able to connect our command processor to command sources which provide
a callback to send a reply.

This is implemented in command.js by allowing us to connect arbitrary message
sources to the command processor.
*/
/*
the command processor sends replies in a form that is easy to process by
other javascript code.  the mail reply object must turn this into a format
that is easy to read by users

the command processor format consists of objects with key/value pairs:

position:#  tells the user that they are at the specified position in the queue
    this is a positive integer if they are in the queue
    it is zero, if they are not in the queue
change:boolean  tells the user if this information is different from before
qlen: (combined) queue length
state: { roomname: statestring }
msg: human readable information message
ready: name tells the user their reservation is ready in the specified room
*/
var mail_reply_ob = {
    send: function(from,reply) {
	var str = [ ]
	if ("position" in reply) {
	    if (reply.position > 0) {
		if (reply.change) {
		    mail.send(from,"","You are #"+reply.position+" in the queue")
		} else {
		    mail.send(from,"","You are already #"+reply.position+" in the queue")
		}
	    } else {
		if (reply.change) {
		    mail.send(from,"","You have been removed from the queue")
		} else {
		    mail.send(from,"","You are not in the queue")
		}
	    }
	} else if ("qlen" in reply) {
	    var i, msg = [ reply.qlen+" in queue" ]
	    for (i in reply.state) {
		msg.push(i+":"+reply.state[i])
	    }
	    mail.send(from,"",msg.join("\n"))
	    
	} else if ("ready" in reply) {
	    var msg = "The "+reply.ready+" restroom is now available and reserved for you.  This reservation will expire in "+Math.round(reply.timeout/6000)/10+" minutes."
	    mail.send(from,"",msg)
	}
	//mail.send(from,subj,text)
    }
}

function process_command(txt,from,reply_ob) {
    Log("cmd",from+":"+txt)
    if (txt.match("go")) {
	var i = QueuePosition(roomlist,from)
	if (i >= 0) {
	    reply_ob.send(from,{position:(i+1),change:false})
	} else {
	    QueuePush(roomlist,from)
	    i = QueuePosition(roomlist,from)
	    reply_ob.send(from,{position:(i+1),change:true})
	}
    } else if (txt.match("cancel")) {
	if (QueueRemove(roomlist,from)) {
	    reply_ob.send(from,{position:0,change:true})
	} else {
	    reply_ob.send(from,{position:0,change:false})
	}	      
    } else if (txt.match("q")) {
	var total = QueueLength(roomlist)
	var i, state = { }
	for (i=0;i<roomlist.length;i++) {
	    state[roomlist[i].name] = roomlist[i].StateName()
	}
	reply_ob.send(from,{qlen:total,state:state})
    } else if (txt.match("help")) {
	reply_ob.send(from,{msg:"Commands: 'go' to reserve a restroom, 'cancel' to unreserved, 'q' to see restroom status."})
    }
}

/*
we need to be able to connect our command processor to command sources which provide
a callback to send a reply.
the generic registration would be:
listen_function(callback)
where the callback function would take a parameter tell it who the command was
from and what the command was.
*/
function start(listen_function,get_info_function,reply_ob) {
    listen_function(function(info) {
	var [from, txt] = get_info_function(info)
	from_reply_ob[from] = reply_ob
	process_command(txt,from,reply_ob)
    })
}
// start(mail.listen,function(m) { return [m.from[0].address,m.text]},mail_reply_ob)
function start_mail_listener(roomlist) {
    mail.listen(function(m){
	var from = m.from[0].address
	var txt = m.text
	process_command(txt,from,mail_reply_ob)
/*
	console.log("received message from "+from+":",txt)
	if (txt.match("go")) {
	    var i = QueuePosition(roomlist,from)
	    if (i >= 0) {
		mail.send(from,"","You are already #"+(i+1)+" in the queue")
	    } else {
		QueuePush(roomlist,from)
		i = QueuePosition(roomlist,from)
		mail.send(from,"","You are #"+(i+1)+" in the queue")
	    }
	} else if (txt.match("cancel")) {
	    if (QueueRemove(roomlist,from)) {
		mail.send(from,"","You have been removed from the queue")
	    } else {
		mail.send(from,"","You are not in the queue")
	    }	      
	} else if (txt.match("q")) {
	    var total = QueueLength(roomlist)
	    var i, msg = [ total+" in queue" ]
	    for (i=0;i<roomlist.length;i++) {
		msg.push(roomlist[i].name+":"+roomlist[i].StateName())
	    }
	    mail.send(from,"",msg.join("\n"))
	} else if (txt.match("help")) {
	    mail.send(from,"","Commands: 'go' to reserve a restroom, 'cancel' to unreserved, 'q' to see restroom status.")
	}
*/
    })
}

var roomlist
function init(roomlist0,Loggr) {
    var i
    Logger=Loggr
    roomlist=roomlist0
    for (i=0;i<roomlist.length;i++) {
	roomlist[i].listeners.push(state_changed)
    }
}

module.exports = {
    init:init,
    start:start,
    mail_reply_ob:mail_reply_ob,
    mail_listener:mail.listen,
    // debugging
    reservations:reservations,
    from_reply_ob:from_reply_ob
}
    
/*
Which restroom is available?  We don't actually have to check if a restroom is
free, just push the user in the queue and this will trigger any available
restroom to become reserved.  
		      
Since we only have a single queue, if both restrooms are available, they both
will go into the RESERVED state.  We must register to get notifications somewhee
in this module.  When we are notified that a restroom has transitioned into the
RESERVED state, that means we can now assign that restroom to a user, so pull
the first user from the queue.  If nobody is in the queue, then we have nothing
to do, as that restroom will see the queue is empty on the next poll cycle and
will transition back to being available.
		
It's not quite this simple, because we must not pull the user from the queue
until the restroom transitions to occupied or the reservation timer expires.
Otherwise, as soon as we pull the last user from the queue and it is empty,
the room we have reserved for them would think it could go back to being
available.  But at the same time, we want any other restrooms that are
reserved but have nobody left waiting for them to go back to the available
state as soon as possible.  Since there is no way to do this with a single
queue, it actually makes sense to have a separate queue for each restroom.
We would then add the user to all queues when they request to be added, and
would only remove them from the restroom they were not assigned to.  Alternatively,
we could also simply hold all restrooms reserved until they just pick one, in
case they pick the wrong one.  In this case, we could still notify two people
if two restrooms are available.  It seems like we would need a way to keep track
of which restroom we have already designated in this case.
		
If we have multiple queues, one for each rest room, then it seems like the
queues must be part of the room's state.  If that is the case, then instead
of the queue length being an input the room can check it directly.

Multiple queues still isn't quite solving the problem.  
Now the user is in two queues.  Both rooms are available.  Now they both see
their queue is non-empty and go to the reserved state.  Each room then notifies
this module about this.  The first one that does so must result in this module
allow the user to remain in the queue, but the second one must result in the
user being removed from the queue, resulting in it becoming available again.
How does this happen?  We need some way to keep track of who has been given
a reservation, and then just don't give them another one.
*/
