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
				message.channel.send('Pong!');
                break;
            case 'echo':
				message.channel.send(messageContent.substring(6));
                break;
            case 'whoami':
				let whoReply = 'You are <@' + message.member.displayName + '>.';
                message.channel.send(whoReply);
                break;
			case 'whowasthat':
				let logFileContents = getLogFile();

				let allEvents = logFileContents.split('\n');
				console.log(allEvents);
				let lastEvent = allEvents[allEvents.length - 1];

				if (lastEvent) {
					message.channel.send(lastEvent);
				}
				else {
					message.channel.send("Sorry, I don't have a record of a recent connection / disconnection. ");
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
		userName = newMember.member.displayName
	}
	else if (oldMember != {}) {
		userName = oldMember.member.displayName
	}
	
	let channelName = (newUserChannel || oldUserChannel);
	let eventType = "moved to channel";
		
	if (newUserChannel && !oldUserChannel) {
		eventType = "connected to channel";
	}
	if (!newUserChannel && oldUserChannel) {
		eventType = "disconnected from channel";
	}
	
	let eventString = '\n' + userName + ' ' + eventType + ': ' + channelName;
	logWriteStream.write(eventString, () => {
		console.log("Wrote connection event to stream. ");
	});
});