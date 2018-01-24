var notifier = require("mail-notifier");
var nodemailer = require("nodemailer");
var os = require("os")
var HOME = os.homedir()
var fs = require("fs");
var config = JSON.parse(fs.readFileSync(HOME+"/.ts-room-server-config", "utf8"))

function send(to,subject,text) {
    var transporter = nodemailer.createTransport(config.transport)
    
    var mailOptions = {
	from: user,
	to: to,
	subject: subject,
	text: text
    }
    
    transporter.sendMail(mailOptions, function(error, info){
	if(error){
            console.log(error)
	} else {
            console.log("Message sent: " + info.response)
	}
    })
}

function listen(f) {
    var n = notifier(config.imap);
    n.on("end", function () { // session closed
	n.start()
    }).on("mail",f).start()
}

module.exports = {
    send:send,
    listen:listen
}
