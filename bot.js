'use strict';

const Discord = require('discord.js');
const fs = require('fs');
var auth = require('./auth.json');

// Initialize Discord Bot
const client = new Discord.Client();

const logFilePath = "log.txt";

let getLogFile = () => {
	return fs.readFileSync(logFilePath, {
		encoding: "utf-8"
	});
};

let logWriteStream = () => {
	return fs.createWriteStream(logFilePath, {
		flags: "w+"
	});
};
let storedConnectionEvents = [];
const maxEventsStored = 5;

client.on('ready', function (evt) {
	console.log('Connected to Discord server.');
	
	console.log('Finding log file...');

	let savedLogs = getLogFile();

	if (savedLogs) {
		storedConnectionEvents = JSON.parse(savedLogs);
		
		console.log("Read in " + storedConnectionEvents.length + "logs from log file.");	
	}
	
	else {
		console.log("No logs found in file.");
	}

});

client.login(auth.token);

const prefix = '!';

client.on('message', function (message) {
	let messageContent = message.content;

    // Our bot needs to know if it will execute a command
	// It will listen for messages that will start with `!`
    if (!messageContent.startsWith(prefix) || message.author.bot)  {
		return;
	}
		
	let args = messageContent.substring(1).split(' ');

	let cmd = args.shift().toLowerCase();

	switch (cmd) {
		case 'ping':
			message.channel.send('pong!');
			break;
		case 'pong':
			message.channel.send('ping!');
			break;
		case 'echo':
			message.channel.send(args.join(' '));
			break;
		case 'whoami':
			let whoReply = 'You are ' + message.member.user.username + '.';
			message.channel.send(whoReply);
			break;
		case 'pizza':
			let pizza = '😀  🍕🍕🍕🍕  😊';
			message.channel.send(pizza);
			break;
		case 'whowasthat':
			let intArg = parseInt(args.shift());
			
			if (!intArg) {
				intArg = 1;
			}

			let allEvents = storedConnectionEvents;

			if (intArg > 1 && intArg > allEvents.length) {
				intArg = allEvents.length;
			}
			for (let i = 1; i <= intArg; i++) {

				let obj = allEvents[allEvents.length - i];

				if (obj) {
					let legibleEventString = timeSince(obj.timestamp) + ', ' + obj.userName + ' ' + obj.eventType + ': ' + obj.channelName;
					message.channel.send(legibleEventString);
				}
			
				else {
					// if we have fewer than requested records, don't print apology when we run out
					if (i > 1 && intArg !== 1) {
						break;
					}
					message.channel.send("Sorry, I don't have a record of a recent connection / disconnection. ");
					break;
				}
			}
			break;

		// Just add any case commands if you want to..
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
	else if (!newUserChannel && oldUserChannel) {
		eventType = "disconnected from channel";
	}
	else {
		return;
	}
	
	let timestamp = Date.now();

	let connectEvent = {
		timestamp,
		userName,
		eventType,
		channelName
	};


	storedConnectionEvents.push(connectEvent);
	while(storedConnectionEvents.length > maxEventsStored) {
		storedConnectionEvents.shift();
	}

	logWriteStream().write(JSON.stringify(storedConnectionEvents));

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