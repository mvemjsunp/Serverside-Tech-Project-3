var twitter = require('ntwitter');
var redis = require('redis');
var credentials = require('./credentials.js');
var client = redis.createClient();
var trackedWords = ['awesome', 'cool', 'rad', 'gnarly', 'groovy'];

var t = new twitter({
    consumer_key: credentials.consumer_key,
    consumer_secret: credentials.consumer_secret,
    access_token_key: credentials.access_token_key,
    access_token_secret: credentials.access_token_secret
});

/*
ISSUES:
-what if tweet has multiple tracked words, or multiple instances of the same word?
-what if tweet has multiple URLs?
-incrementing count on a list of counts means getting a string value, 
	parsing int, incrementing, then writing back as a string
-can we store trackedWords in redis as well so that it can be modified by other client?
-we could just turn trackedWords in to an array of RegExp to simplify a bit
-make sure string equality works with ===
*/

t.stream(
    'statuses/filter',
    { track: trackedWords }, //words to be tracked by twitter stream
    function(stream) { //check for each tracked word in the tweet and incr redis count if found
        stream.on('data', function(tweet) {
            console.log(tweet.text);
			//extract the tweet URL
			var tweetURL = "";
			try {
				if (tweet.entities.urls[0].expanded_url != undefined) { //undefined??
					//if there is an expanded_url, use it
					console.log("expanded != null");
					tweetURL = tweet.entities.urls[0].expanded_url;
				}
				else if (tweet.entities.urls[0].url != undefined) {
					console.log("else...");
					//otherwise, use the regular url if it exists
					tweetURL = tweet.entities.urls[0].url;
				}
			}
			catch (error) {
				console.log("error: " + error);
			}
			console.log("logging tweetURL...");
			console.log(tweetURL);
			if (tweetURL != "") {  //undefined?? 
				for (var i = 0 ; i < trackedWords.length ; i++) {
					var word = trackedWords[i];
					var wordRegExp = new RegExp(trackedWords[i]); //turn string in trackedwords in to regexp
					if(tweet.text.match(wordRegExp)) {
						var urlListName = word + "urls";
						var countsListName = word + "counts";
						if (client.exists(urlListName) === false) {
							//if URL list doesnt exist yet, create it
							client.rpush(urlListName, tweetURL);
						}
						//get list of URLs for trackedWords[i] as Array
						//first get length of list so we know what range to give lrange
						client.llen(urlListName, function (error, listLength) { 
							if (error) {
								console.log("error: " + error);
							}
							client.lrange(word, 0, listLength - 1, function (error, list) {// -1 might be wrong
								if (error) {
									console.log("error: " + error);
								}
								var foundMatch = false;
								for (var j = 0 ; j < list.length ; j++) { //loop thru array of URLs to check for match
									//if match, get index and increment count
									if (list[j] === tweetURL) {
										incrementCount(j, countsListName);
										foundMatch = true;
										//break?
									}
								}
								//if no match, add URL to trackedWords[i] list and start new count
								if (foundMatch === false) {
									//add new URL and corresponding count to the lists
									client.rpush(urlListName, tweetURL);
									client.rpush(countsListName, "1");
								}
							});
						});
					}
				}
			}
        });
    }
);

function incrementCount (i, countsListName) {
	//get count from redis
	//parse count to int
	//increment
	//set count in redis to new value
	client.lrange(countsListName,i,i, function (error, result) {
		var count = parseInt(result);
		count++;
		client.lset(countsListName, i, count.toString());
	});
}