// Author: 		Sardor Isakov 
// Description: Nodejs and socket.io implementation. This app feed live twitter stream 
 
var app = require('express')()
	, fs = require('fs')
	, server = require('http').createServer(app)
    , io = require('socket.io').listen(server,{ log: false });

var config = JSON.parse(fs.readFileSync("config.json"));
var host = config.host;
var port = config.port;
var twitter_track = "bieber";

server.listen(port);

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');	
});

app.get('/feed', function (req, res) {
	var content = fs.readFileSync("template.html");
	getTweets(function(tweets) {
		var ul = '';
		tweets.forEach(function(tweet) {
			ul+="<li><strong>" + tweet.user.screen_name + ": </strong>" + tweet.text + "</li>";
		});

		content = content.toString("utf8").replace("{{INTIAL_TWEETS}}", ul);
		res.setHeader("Content-Type", "text/html");
		res.send(content);
	});
});

var clients = [];
io.sockets.on('connection', function (socket) {
	clients.push(socket); 
	console.log("Socket connection established, available clients ", clients.length)
	
	socket.on('disconnect', function () {
		clients.splice(clients.indexOf(socket), 1);
		console.log("Client disconnected, remianing ", clients.length);
  	});
});


//================================MongoDb find()=======================
var mongo = require("mongodb");
var dbHost = '127.0.0.1';
var dbPort = mongo.Connection.DEFAULT_PORT;
var db = new mongo.Db("tweets", new mongo.Server(dbHost, dbPort, {}),{safe:false});

var tweetCollection;
db.open(function(error){
    console.log("We are connected! " + dbHost + ":" + dbPort);

        db.collection("tweet", function(error, collection){
            tweetCollection = collection;
        });
});

function getTweets(callback) {
	tweetCollection.find({}, {"limit": 10, "sort":{"_id":-1}}, function(error,cursor){
		cursor.toArray(function(error, tweets) {
			
			callback(tweets);
			//console.log(tweets);
		});
	});
}

//================================MongoDb insert() and io.emit() =======================

var sys = require('sys');
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


var tweetCollection;
var db = new mongo.Db("tweets", new mongo.Server(dbHost, dbPort, {}),{safe:false});
db.open(function(error){
    console.log("We are connected! " + dbHost + ":" + dbPort);

        db.collection("tweet", function(error, collection){
            tweetCollection = collection;
        });
});


request.addListener('response', function (response) {
    response.setEncoding('utf8');

    response.addListener('data', function (chunk) {
        var tweet;

        try {
            tweet = JSON.parse(chunk);
        } catch(e) {
            //console.log("We got one");
        }

        if(typeof tweet !== "undefined") {
			if(clients.length != 0) {
				io.sockets.emit('tweet', tweet);
				//console.log("data sent..");
			}
			
            //====================
			/*tweetCollection.insert(tweet, function(error) {
                if (error) {
                    console.log("Error", error.message);
                } else {
                    console.log("Success! ");
                };
            });
			*/
			
        }
    });

    response.addListener('end', function () {
        console.log('--- END ---');
    });
});

request.end();