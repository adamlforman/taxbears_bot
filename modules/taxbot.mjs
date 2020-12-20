import { Client } from 'discord.js';
import fetch from "node-fetch";
import { ConnectionEvent } from './connectionEvent.mjs';

export default class TaxBot {
	
	
	constructor() {
		this.initialized = false;

		const _config = {				
			// This is the auth token. Find a better place to put this
			token: "NzA5MjMxOTYwNTQ2ODY5Mjk4.Xri6fQ.chYhbLLegBS4NGNfa1AbofMufNk",
			prefix: '!',
			logFilePath: "connectionEvents.txt",
			maxEventsStored: 5,
			saveLogsInterval: 5000
		}

		this.config = _config;
	}

	init() {
		if (!this.initialized) {			

			/**
			 * @type {ConnectionEvent[]}
			 */
			this.storedConnectionEvents = new Array();
			
			this.initialized = true;
		}
	}

	buildConnection() {
		// Initialize Discord Bot
		this.client = new Client();
		
		this.client.login(this.config.token).then((val) => {
			console.log('Connected to Discord Server.');
		}).catch((reason) => {
			console.log('Error connecting to Discord Server.');
			console.log(reason);
		});
	}

	/**
	 * Initialize the bot and connect to the discord server
	 */
	Start() {

		this.init();

		this.buildConnection();
				
		this.client.on('message', (message) => {
			let messageContent = message.content;
			
			// Our bot needs to know if it will execute a command
			// It will listen for messages that will start with `!`
			if (!messageContent.startsWith(this.config.prefix) || message.author.bot)  {
				return;
			}

			// We don't respond to messages from bots (including this one)
			if (message.author.bot) {
				return;
			}
			
			let args = messageContent.substring(this.config.prefix.length).split(' ');
			
			let cmd = args.shift().toLowerCase();
			
			switch (cmd) {
				case 'ping':
					message.channel.send('pong!');
					break;
				case 'pong':
					message.channel.send('ping!');
					break;
				case 'echo':
					if (args.length) {
						message.channel.send(args.join(' '));
					}
					break;
				case 'whoami':
					let whoReply = 'You are ' + message.author.username + '.';
					message.channel.send(whoReply);
					break;
				case 'pizzq':	// Hi Karli
				case 'pizza':
					let pizza = '😀  🍕🍕🍕🍕  😊';
					message.channel.send(pizza);
					break;
				case 'mtg':
				case 'mtgcard':					
					const errorMessage = "An unexpected error occurred retrieving the card image: ";
					
					let cardMsg = errorMessage;
					let foundCard = false;
					
					// use promises to send a "searching..." message
					// if the fetch takes more than 1 second
					const cardPromise = getMtgCardUrlByName(args);
					const delayPromise = new Promise((resolve, reject) => {
						setTimeout(resolve,1000);
					});
					
					delayPromise.then((_) => {
						if (!foundCard) {
							message.channel.send(`Searching for an image of the card '${args.join(' ')}'...`);
						}
					}).catch((reason) => {
						cardMsg = errorMessage + reason;
					});
					
					cardPromise.then((cardUrl) => {
						cardMsg = cardUrl;				
						foundCard = true;
					}).catch((reason) => {
						cardMsg = errorMessage + reason;
					});

					message.channel.send(cardMsg);
					break;
				case 'whowasthat':
					const events = this.storedConnectionEvents;

					let whoMsg = parseConnectionEvents(args, events);
					
					message.channel.send(whoMsg);
					break;
												
				// Just add any case commands if you want to..
			}
		});
										
		/**
		 * When a user changes voice channels (including connect/disconnect),
		 * parse and save the event for later access from the !whowasthat command
		 */
		this.client.on('voiceStateUpdate', (oldMember, newMember) => {
			
			let connectEvent = new ConnectionEvent(oldMember, newMember);
			
			this.saveConnectionEvent(connectEvent);
			
		});
	}

	/**
	 * Save a connection event for later retrieval by
	 * the !whowasthat command
	 * @param	{ConnectionEvent}	connectEvent	The event to be saved
	 */
	saveConnectionEvent(connectEvent) {

		// Add it to our in-memory array
		this.storedConnectionEvents.push(connectEvent);

		// Purge any events above our max non-creepiness storage limit
		while (this.storedConnectionEvents.length > this.config.maxEventsStored) {
			this.storedConnectionEvents.shift();
		}
	}
}

function parseConnectionEvents(args, events) {
	// read in the first argument as a specified number of events to return
	let intArg = parseInt(args.shift());

	let messageToSend = "An unexpected error occurred while retrieving recent connection events. ";

	if (!events || !events.length) {
		messageToSend = "Sorry, I don't have a record of a recent connection / disconnection. ";
	}
	else {
		// Default to 1 request if no arg specified. Ensure we don't exceed array length.
		let numToRead = intArg ? Math.min(intArg, events.length) : 1;

		// Grab the last (numEventsRequested) elements of the stored events (not exceeding the array's length)
		// Convert each of them to a legible string, and then concatenate them to each other with newlines
		let strEvents = events.slice(-1 * numToRead)
			.reverse() // Array stores events in chronological order
			.join('\n');

		// If there's more than 1 event being returned, add a prefix line so that the records line up nicely
		messageToSend = numToRead === 1 ? strEvents : `The ${numToRead} most recent events are: \n` + strEvents;
	}
	return messageToSend;
}

/**
 * Given the whole, exact name of a Magic, the Gathering card,
 * retrieve a URL for an image of the card
 * @param {string} cardArgs The name of the card, a a string array
 */
async function getMtgCardUrlByName(cardArgs) {
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