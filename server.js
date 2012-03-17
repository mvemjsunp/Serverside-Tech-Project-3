var http = require('http');
var redis = require('redis');
var client = redis.createClient();
var trackedWords = ['awesome', 'cool', 'rad', 'gnarly', 'groovy']; 
//trackedWords should be the same as words being tracked in twitter.js

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
	
	client.mget(trackedWords, function (error, results) { //query redis for tracked words
		if (error) {
			res.end("Error: " + error);
		}
		else {
			var resultStr = "";
			for (var i = 0 ; i < trackedWords.length ; i++) { //assemble results in to string with labels
				resultStr += trackedWords[i] + ": " + results[i]  + "<br />";
			}
			res.end(resultStr); //write results to the dom
		}
	});
}).listen(3000); //server runs on port 3000

console.log('Server running on port 3000');