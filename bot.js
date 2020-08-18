'use strict';

const Discord = require('discord.js');
const fs = require('fs');
var auth = require('./auth.json');
const { stream } = require('winston');

// Initialize Discord Bot
const client = new Discord.Client();

const logFilePath = "log.txt";

let getLogFile = () => {
	return fs.readFileSync(logFilePath, {
		encoding: "utf-8"
	});
};

let logWriteStream;
let storedConnectionEvents = [];
const maxEventsStored = 5;

client.on('ready', function (evt) {
	console.log('Connected to Discord server.');
	
	console.log('Finding log file...');

	// This will create the file if it does not exist, but will not
	// overwrite its contents if it already does.
	//let streamFlags = fs.existsSync(logFilePath) ? "r+": "w+";

	logWriteStream = fs.createWriteStream(logFilePath, {
		flags: "as+"
	});

	if (!logWriteStream) {
		console.log("Error creating write stream to log file. Configured path: " + logFilePath);
	}
	else {
		console.log("Connected to log file.");
	}
});

client.login(auth.token);

client.on('message', function (message) {
	let messageContent = message.content;

    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (messageContent.substring(0, 1) == '!') {
        console.log(messageContent);
        var args = messageContent.substring(1).split(' ');
        var cmd = args[0].toLowerCase();

        switch (cmd) {
            // !ping
            case 'ping':
				message.channel.send('pong!');
                break;
			case 'pong':
				message.channel.send('ping!');
				break;
            case 'echo':
				message.channel.send(messageContent.substring(6));
                break;
            case 'whoami':
				let whoReply = 'You are ' + message.member.user.username + '.';
                message.channel.send(whoReply);
                break;
			case 'whowasthat':
				let intArg = parseInt(messageContent.substring(12));
				
				if (!intArg) {
					intArg = 1;
				}

				/*
				let logFileContents = getLogFile();
				let allEvents = logFileContents.split('\n');				
				*/

				let allEvents = storedConnectionEvents;

				if (intArg > 1 && intArg > allEvents.length) {
					intArg = allEvents.length;
				}
				for (let i = 1; i <= intArg; i++) {
					/*
					let lastEventJson = allEvents[allEvents.length - i];
					let obj;

					if (lastEventJson) {
						obj = JSON.parse(lastEventJson);
					}*/

					let obj = allEvents[allEvents.length - i];

					if (obj) {
						let legibleEventString = timeSince(obj.timestamp) + ', ' + obj.userName + ' ' + obj.eventType + ': ' + obj.channelName;
						message.channel.send(legibleEventString);
					}
				
					else {
						// if we have fewer than requested records, don't print apology when we run out
						if (i > 1) {
							break;
						}
						message.channel.send("Sorry, I don't have a record of a recent connection / disconnection. ");
						break;
					}
				}
				break;

            // Just add any case commands if you want to..
        }
    }
});

client.on('voiceStateUpdate', (oldMember, newMember) => {
	
	let oldUserChannel = "";
	if (oldMember && oldMember != {}) {
		let ch = oldMember.channel;
		if (ch) {
			oldUserChannel = ch.name;
		}
	}
	
	let newUserChannel = ""
	if (newMember && newMember != {}) {
		let ch = newMember.channel;
		if (ch) {
			newUserChannel = ch.name;
		}
	}
	
	let userName = "placeHolderUserName"
	if (newMember && newMember != {}) {
		userName = newMember.member.user.username
	}
	else if (oldMember != {}) {
		userName = oldMember.member.user.username
	}
	
	let channelName = (newUserChannel || oldUserChannel);
	let eventType = "moved to channel";
		
	if (newUserChannel && !oldUserChannel) {
		eventType = "connected to channel";
	}
	if (!newUserChannel && oldUserChannel) {
		eventType = "disconnected from channel";
	}
	
	let timestamp = Date.now();

	let connectEvent = {
		timestamp,
		userName,
		eventType,
		channelName
	};


	storedConnectionEvents.unshift(connectEvent);
	while(storedConnectionEvents.length > maxEventsStored) {
		storedConnectionEvents.pop();
	}

	/*
	let eventJson = '\n' + JSON.stringify(connectEvent);

	logWriteStream.write(eventJson, () => {
		console.log("Wrote connection event to stream. ");
	});*/
});

var timeSince = function(timestamp) {
	var now = new Date(),
    secondsPast = (now.getTime() - timestamp) / 1000;
	if (secondsPast < 60) {
		return parseInt(secondsPast) + ' seconds ago';
	}
	if (secondsPast < 3600) {
		return parseInt(secondsPast / 60) + ' minutes ago';
	}
	if (secondsPast <= 86400) {
		return parseInt(secondsPast / 3600) + ' hours ago';
	}
	if (secondsPast > 86400) {
		day = timestamp.getDate();
		month = timestamp.toDateString().match(/ [a-zA-Z]*/)[0].replace(" ", "");
		year = timestamp.getFullYear() == now.getFullYear() ? "" : " " + timestamp.getFullYear();
		return day + " " + month + year;
	}
};