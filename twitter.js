var twitter = require('ntwitter');
var redis = require('redis');
var credentials = require('./credentials.js'); //read credentials from file
//create redis client
var client = redis.createClient(); //using local redis server, no arguments required
var trackedWords = ['awesome', 'cool', 'rad', 'gnarly', 'groovy'];
var trackedWordsRegExp = new Array(trackedWords.length);

for (var i = 0 ; i < trackedWords.length ; i++) {
	trackedWordsRegExp[i] = new RegExp(trackedWords[i]);
}

var twitter = new twitter({
//use credentials from credentials.js
consumer_key: credentials.consumer_key,
    consumer_secret: credentials.consumer_secret,
    access_token_key: credentials.access_token_key,
    access_token_secret: credentials.access_token_secret

});

twitter.stream(
	'statuses/filter', //return statuses that match tracked keywords
	{track: trackedWords}, //track tweets that contain keywords
	function(stream){
		stream.on('data', function(tweet){
			//first extract the url from the tweet
			var url = "";
			try {
				//test for expanded URLs
				if (tweet.entities.urls[0].expanded_url != null) {
				url = tweet.entities.urls[0].expanded_url;
				}	//test for shortened URLs
				else if (tweet.entities.urls[0].url != null) {
					url = tweet.entities.urls[0].url; 
				}
			} catch (error) {console. log ("error: " + error);}
			
			if (url != "") { //if url successfully extracted
				//loop through array or RegExp to see which word(s) match tweet text
				for (var i = 0 ; i < trackedWordsRegExp.length ; i++) {
					if (tweet.text.match(trackedWordsRegExp[i])) {
						//increment count if match found
						//also automagically starts new count if needed
						client.zincrby(trackedWords[i], 1, url);
					}
				}
			}
			
			
		});
	}
);