'use strict';

const Discord = require('discord.js');
var auth = require('./auth.json');

// Initialize Discord Bot
const client = new Discord.Client();

client.on('ready', function (evt) {
    console.log('Connected');
});

client.login(auth.token);

let mostRecentVoiceChange;

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
				let lastEvent = mostRecentVoiceChange;
				if (lastEvent) {
					let whoWasThatReply = lastEvent.userName + ' ' + lastEvent.eventType + ': ' + lastEvent.channelName;
					message.channel.send(whoWasThatReply);
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
	
	let connectEvent = {
		userName,
		channelName,
		eventType
	};
	
	console.log(connectEvent);
	
	mostRecentVoiceChange = connectEvent;
});