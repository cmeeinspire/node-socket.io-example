// Author: 		Sardor Isakov 
// Description: Nodejs and socket.io implementation. This app feed live twitter stream 
 
var app = require('express')()
	, fs = require('fs')
	, server = require('http').createServer(app)
    , io = require('socket.io').listen(server,{ log: false })
	, sys = require(process.binding('natives').util ? 'util' : 'sys');

var config = JSON.parse(fs.readFileSync("config.json"));
var host = config.host;
var port = config.port;
var twitter_track = "bieber";

server.listen(port);
console.log("Server running at http://" + host + ":" + port +"\n");

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');	
});

app.get('/feed', function (req, res) {
	var content = fs.readFileSync("template.html");
	var ul = '';

	ul+="<li><strong>" + "tweet.user.screen_name" + ": </strong>" + "tweet.text" + "</li>";
	content = content.toString("utf8").replace("{{INTIAL_TWEETS}}", ul);

	res.setHeader("Content-Type", "text/html");
	res.send(content);
});


//================================OAuth and socket.io =======================

var clients = [];
io.sockets.on('connection', function (socket) {
	clients.push(socket); 
	console.log("Socket connection established, available clients ", clients.length)
	
	socket.on('disconnect', function () {
		clients.splice(clients.indexOf(socket), 1);
		console.log("Client disconnected, remianing ", clients.length);
  	});
});

var OAuth= require('oauth').OAuth;
oa = new OAuth("https://twitter.com/oauth/request_token",
                 "https://twitter.com/oauth/access_token", 
				 'Your Consumer Key',
				 'Your Consumer Secret',
                 "1.0A", "http://localhost:3000/oauth/callback", "HMAC-SHA1");

var request = oa.get(
                "https://stream.twitter.com/1.1/statuses/filter.json?track=" + twitter_track, 
				'Your Access token',
				'Your Access token secrect' );


request.addListener('response', function (response) {
    response.setEncoding('utf8');

    response.addListener('data', function (chunk) {
        var tweet;

        try {
            tweet = JSON.parse(chunk);
        } catch(e) {
            //console.log("We got one error", e);
        }

        if(typeof tweet !== "undefined") {
			if(clients.length != 0) {
				io.sockets.emit('tweet', tweet);
				//console.log("data sent..");
			}
        }
    });

    response.addListener('end', function () {
        console.log('--- END ---');
    });
});

request.end();