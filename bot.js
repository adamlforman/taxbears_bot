'use strict';

const Discord = require('discord.js');
const fs = require('fs');
const fetch = require("node-fetch");
var auth = require('./auth.json');

// Initialize Discord Bot
const client = new Discord.Client();

const logFilePath = "log.txt";

let getLogFile = () => {
	return fs.readFileSync(logFilePath, {
		encoding: "utf-8",
		flag: 'as+'
	});
};

let logWriteStream = () => {
	return fs.createWriteStream(logFilePath, {
		flags: "w+"
	});
};

/**
 * @type {ConnectionEvent[]}
 */
let storedConnectionEvents = new Array();
const maxEventsStored = 5;

client.on('ready', function (evt) {
	console.log('Connected to Discord server.');
	
	console.log('Finding log file...');

	let savedLogs = getLogFile();

	if (savedLogs) {
		storedConnectionEvents = JSON.parse(savedLogs);
		
		console.log("Read in " + storedConnectionEvents.length + " logs from log file.");	
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
			let whoReply = 'You are ' + message.author.username + '.';
			message.channel.send(whoReply);
			break;
		case 'pizza':
			let pizza = '😀  🍕🍕🍕🍕  😊';
			message.channel.send(pizza);
			break;
		case 'mtg':
		case 'mtgcard':
			let foundCard = false;

			const cardPromise = getMtgCardUrlByName(args);
			const delayPromise = new Promise((resolve, reject) => {
				setTimeout(resolve,1000);
			});

			delayPromise.then((_) => {
				if (!foundCard) {
					message.channel.send(`Searching for an image of the card '${args.join(' ')}'...`);
				}
			}).catch((reason) => {
				message.channel.send("An unexpected error occurred retrieving the card image: "+ reason);
			});
			
			cardPromise.then((cardUrl) => {
				message.channel.send(cardUrl);				
				foundCard = true;
			}).catch((reason) => {
				message.channel.send("An unexpected error occurred retrieving the card image: "+ reason);
			});

			break;
		case 'whowasthat':
			// read in the first argument as a specified number of events to return
			let intArg = parseInt(args.shift());

			let messageToSend = "An unexpected error occurred while retrieving recent connection events. ";
			
			if (!storedConnectionEvents || !storedConnectionEvents.length) {
				messageToSend = "Sorry, I don't have a record of a recent connection / disconnection. ";
			}
			else {				
				// Default to 1 request if no arg specified. Ensure we don't exceed array length.
				let numToRead = intArg ? Math.min(intArg,storedConnectionEvents.length) : 1;

				// Grab the last (numEventsRequested) elements of the stored events (not exceeding the array's length)
				// Convert each of them to a legible string, and then concatenate them to each other with newlines
				let strEvents = storedConnectionEvents.slice(-1 * numToRead)
													  .reverse()	// Array stores events in chronological order
													  .map((conEvent) => stringifyConnectionEvent(conEvent))
													  .join('\n');
				
				// If there's more than 1 event being returned, add a prefix line so that the records line up nicely
				messageToSend = numToRead === 1 ? strEvents : `The ${numToRead} most recent events are: \n` + strEvents;
			}
			
			message.channel.send(messageToSend);
			break;

		// Just add any case commands if you want to..
	}
});

/**
 * When a user changes voice channels (including connect/disconnect),
 * parse and save the event for later access from the !whowasthat command
 */
client.on('voiceStateUpdate', (oldMember, newMember) => {
	
	let connectEvent = parseVoiceStateChange(oldMember, newMember);

	saveConnectionEvent(connectEvent);

});

/**
 * Parse a user connection / disconnection event (a Vocie State Update)
 * into an object with the data we care about for the !whowasthat command
 * @param	{Discord.VoiceState}	oldMember The pre-update voice state of the user
 * @param	{Discord.VoiceState}	newMember The post-update voice state of the user
 * @returns	{ConnectionEvent}	An object capturing the data of the event
 */
var parseVoiceStateChange = function(oldMember, newMember) {

	// Determine the old channel, if there was one
	let oldUserChannel = "";
	if (oldMember && oldMember != {}) {
		let ch = oldMember.channel;
		if (ch) {
			oldUserChannel = ch.name;
		}
	}
	
	// Determine the new channel, if there was one
	let newUserChannel = ""
	if (newMember && newMember != {}) {
		let ch = newMember.channel;
		if (ch) {
			newUserChannel = ch.name;
		}
	}
	
	// Determine the user name, being careful
	// about accessing potentially null objects
	let userName = "placeHolderUserName"
	if (newMember && newMember != {}) {
		userName = newMember.member.user.username
	}
	else if (oldMember != {}) {
		userName = oldMember.member.user.username
	}
	
	// Determine what type of event this was
	let channelName = (newUserChannel || oldUserChannel);
	let eventType = "moved to channel";
	
	if (newUserChannel && !oldUserChannel) {
		// Connect event
		eventType = "connected to channel";
	}
	else if (!newUserChannel && oldUserChannel) {
		// Disconnect event
		eventType = "disconnected from channel";
	}
	else {
		// Channel move event - discard
		return;
	}
	
	let timestamp = Date.now();

	let connectEvent = {
		timestamp,
		userName,
		eventType,
		channelName
	};

	return connectEvent;
}

/**
 * Save a connection event for later retrieval by
 * the !whowasthat command
 * @param	{ConnectionEvent}	connectEvent	The event to be saved
 */
var saveConnectionEvent = function(connectEvent) {

	// Add it to our in-memory array
	storedConnectionEvents.push(connectEvent);

	// Purge any events above our max non-creepiness storage limit
	while(storedConnectionEvents.length > maxEventsStored) {
		storedConnectionEvents.shift();
	}

	// Update the file backup
	logWriteStream().write(JSON.stringify(storedConnectionEvents));
}

/**
 * Parse a connection event into a legible string
 * @param {ConnectionEvent} connectEvent The event to parse
 * @returns {string} A legible string representing the event
 */
var stringifyConnectionEvent = function(ev) {
	// "{2 minutes ago}, {ArsanL} {disconnected from channel}: {Internet Starlite}. "
	return `${timeSince(ev.timestamp)}, ${ev.userName} ${ev.eventType}: ${ev.channelName}.`;
}

/**
 * Given a Date, return a legible relative string description of
 * it (e.g. "5 seconds ago, 1 hour ago")
 * @param {Date} timestamp 
 */
var timeSince = function(timestamp) {
	let dateTime;
	if (timestamp) {
		dateTime = new Date(timestamp);
	}
	else {
		return "<Time Parse Error>";
	}
	var now = new Date(),
    secondsPast = (now.getTime() - dateTime) / 1000;
	if (secondsPast < 60) {
		let numSecs = parseInt(secondsPast);
		return `${numSecs} second${numSecs > 1 ? 's' : ''} ago`;
	}
	if (secondsPast < 3600) {
		let numMins = parseInt(secondsPast / 60);
		return `${numMins} minute${numMins > 1 ? 's' : ''} ago`;
	}
	if (secondsPast <= 86400) {
		let numHrs = parseInt(secondsPast / 3600);
		return `${numHrs} hour${numHrs > 1 ? 's' : ''} ago`;
	}
	if (secondsPast > 86400) {
		let day = dateTime.getDate();
		let month = dateTime.toDateString().match(/ [a-zA-Z]*/)[0].replace(" ", "");
		let year = dateTime.getFullYear() == now.getFullYear() ? "" : " " + dateTime.getFullYear();
		return "On " + day + " " + month + year;
	}
};

/**
 * Given the whole, exact name of a Magic, the Gathering card,
 * retrieve a URL for an image of the card
 * @param {string} cardArgs The name of the card, a a string array
 */
var getMtgCardUrlByName = async function(cardArgs) {
	const scryfallApiUrl = 'https://api.scryfall.com/cards/named?format=image&fuzzy=';

	let fetchUrl = scryfallApiUrl + cardArgs.join('+');
	console.log("fetching from "+fetchUrl);
	const fetchPromise = await fetch(fetchUrl);
	
	if (fetchPromise.redirected) {
		return fetchPromise.url;
	}
	else {
		return `I couldn't find an image for the Magic: the Gathering card named "${cardArgs.join(' ')}". You may need to be more specific.`;
	}	
}

/**
 * @typedef		{object}	ConnectionEvent A user connect / disconnect event
 * @property	{Date}		timestamp		The time of the event
 * @property	{string}	userName		The user who connected or disconnected
 * @property	{string}	eventType		A description of the event type - connect or disconnect
 * @property	{string}	channelName		The name of the channel appropriate to the event
 */