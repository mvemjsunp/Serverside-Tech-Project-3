var http = require('http');
var redis = require('redis');
var client = redis.createClient();
//trackedWords should be the same as words being tracked in twitter.js
var trackedWords = ['awesome', 'cool', 'rad', 'gnarly', 'groovy']; 
var response = "";

http.createServer(function (request, response) {
	response.writeHead(200, {'Content-Type': 'text/html'});
	
	var confirmations1 = new Array(trackedWords.length); //array of booleans to track when each call is done
	var confirmations2;
	var L2Calls = 0;
	
	for (var i = 0 ; i < trackedWords.length ; i++) {
		var word = trackedWords[i];
		(function (word, i) {
			client.zcount(word, '-inf', '+inf', function(error, count){
				if (error) {console.log(error);}
				L2Calls += count;
				confirmations1[i] = true;
			});
		})(word, i);
	}
	
	//loop runs constantly, checking if all callbacks have completed
	while(true) {  //could or should tihs  be done with setInterval() instead?
		var count = 0;
		for (var i = 0; i < confirmations1.length; i++) {
			if (confirmations1[i]===true) {count++;}		
		}
		if (count === confirmations1.length) { //if all have conpleted, write the response 
			confirmations2 = new Array(L2Calls);
			executeCalls();
			break;
		}
	}
	
	function executeCalls () {
		for (var i = 0 ; i < trackedWords.length ; i++) {
			var word = trackedWords[i];
			(function (word, i) {
				response += "<br /><br />" + word + ":<br />";
				client.zrevrangebyscore(word, '+inf', '-inf', function(error, urls){
					if (error) {console.log(error);}
					if (urls[0]) { //make sure there are results in at least urls[0]
						for (var j = 0 ; j < urls.length ; j++) {
							var url = urls[i];
							(function(word, url, i, j) {
								client.zscore(word, url, function(error, score) {
									response += url +" :: "+ score;
									confirmations2[i*j] = true;
								});
							})(word, url, i, j);
						}
					}
				});
			})(word, i);
		}
		
		while(true) {  //could or should tihs  be done with setInterval() instead?
			var count = 0;
			for (var i = 0; i < confirmations2.length; i++) {
				if (confirmations2[i]===true) {count++;}		
			}
			if (count === confirmations2.length) { //if all have conpleted, write the response 
				res.end(response);
				break;
			}
		}
		
	}


}).listen(3000);

console.log('Server running on port 3000');