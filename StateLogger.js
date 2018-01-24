var fs = require("fs")
var states = { } // current state of each key
var statelist = { } // array of [ time, value] pairs keyed by key name
var changelist = [ ] // array of { t:time, <other key:value pairs } in chronological order
function StateChange(ob) {
    var now = new Date()
    for (key in ob) {
	if (states[key] == ob[key]) continue
	states[key] = ob[key]
	if (!(key in statelist)) statelist[key]=[]
	statelist[key].push([now,ob[key]])
	ob.t = now.toISOString()
	changelist.push(ob)
	console.log(now+":"+key+"="+states[key])
    }
    //console.log(Object.keys(states).join(","))
}

if (process.platform === "win32") {
    var rl = require("readline").createInterface({
	input: process.stdin,
	output: process.stdout
    })

    rl.on("SIGINT", function () {
	process.emit("SIGINT")
    })
}

var logfile="log.csv"

process.on("SIGINT", function () {
    var i,j
    states["changed"]=""
    var keys = Object.keys(states), str = [ ]
    keys.unshift("t")
    for (i in states) {
	states[i] = ""
    }
    for (j=0;j<keys.length;j++) {
	str.push(JSON.stringify(keys[j]))
    }
    fs.writeFileSync(logfile,str.join(",")+"\n")
    var list = [ ]
    for (i=0;i<changelist.length;i++) {
	str = [ ]
	var chglist=[]
	for (j in changelist[i]) {
	    states[j] = changelist[i][j]
	    if (j != "t") chglist.push(j+"="+changelist[i][j])
	}
	chglist = chglist.join(", ")
	states["changed"]=chglist
	for (j=0;j<keys.length;j++) {
	    var strx = "", a="",b=""
	    if (states[keys[j]] &&
		(states[keys[j]][0] == "+" || states[keys[j]][0] == "-")) {
		strx = "="
	    }
	    if (keys[j] in changelist[i]) {
		a="["
		b="]"
	    }
	    str.push(strx+JSON.stringify(a+states[keys[j]]+b))
	}
	fs.appendFileSync(logfile,str.join(",")+"\n")
    }
    process.exit()
})

module.exports = StateChange
