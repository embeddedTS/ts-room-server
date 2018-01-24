const csv=require("csvtojson")
var state = { cmd:"" }
var names = [ "Bob", "Joe", "Stinky", "Igor", "Bashful" ]

var i
for (i=0;i<names.length;i++) {
    state[names[i]] = ""
}

csv().fromFile("log.csv").on('json',(chg)=>{
    if (chg.cmd != state.cmd) {
	if (chg.cmd[0] == "[") {
	    chg.cmd = chg.cmd.slice(1,-1)
	}
	state.cmd = chg.cmd
	var name = chg.cmd.split(":")[0] // assume "$name:go"
	console.log(name+" Waiting")
    }
    var i
    for (i=0;i<names.length;i++) {
	if (chg[names[i]] != state[names[i]]) {
	    if (chg[names[i]][0] == "[") {
		chg[names[i]] = chg[names[i]].slice(1,-1)
	    }
	    state[names[i]] = chg[names[i]]
	    var x = chg[names[i]].match(/closing the ([^ ]+) room door/)
	    if (x) {
		var room = x[1]
		console.log(names[i]+" Enters "+room)
		continue
	    }
	    x = chg[names[i]].match(/done, opening the ([^ ]+) room door and exiting/)
	    if (x) {
		var room = x[1]
		console.log(names[i]+" Exits "+room)
		continue
	    }
	}
    }
})
