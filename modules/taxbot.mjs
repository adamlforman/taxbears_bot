import fetch from "node-fetch";
import { ConnectionEvent } from "./connectionEvent.mjs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client, Events, GatewayIntentBits, Partials, TextChannel } = require('discord.js');

export default class TaxBot {
  constructor() {
    this.initialized = false;

    // parse the .env file
    require("dotenv").config();

    const _config = {
      // This is read in from the un-committed .env file in the root folder
      token: process.env.AUTH_TOKEN,
      prefix: "!",
      logFilePath: "connectionEvents.txt",
      maxEventsStored: 5,
      saveLogsInterval: 5000,
    };

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
    this.client = new Client({
      partials: [Partials.Message, Partials.Channel, Partials.Reaction,],
      intents: [
        GatewayIntentBits.MessageContent, // Needed for embedded images (!mtgcard)
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
      ],
    });

    this.client
      .login(this.config.token)
      .then((val) => {
        console.log("Connected to Discord Server.");
      })
      .catch((reason) => {
        console.log("Error connecting to Discord Server.");
        console.log(reason);
      });
  }

  /**
   * Initialize the bot and connect to the discord server
   */
  Start() {
    this.init();

    this.buildConnection();

    this.registerCommands();

    this.client.on(Events.Debug, console.log);

    /**
     * When a user changes voice channels (including connect/disconnect),
     * parse and save the event for later access from the !whowasthat command
     */
    this.client.on(Events.VoiceStateUpdate, (oldMember, newMember) => {
      let connectEvent = new ConnectionEvent(oldMember, newMember);

      // The eventType is set to null if the change event parse fails
      if (connectEvent.eventType) {
        this.saveConnectionEvent(connectEvent);
      }
    });

    this.client.on(Events.MessageReactionAdd, async (reaction, user) => {
      // When we receive a reaction we check if the reaction is partial or not
      if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
          await reaction.fetch();
        } catch (error) {
          console.error(
            "Something went wrong when fetching the message: ",
            error
          );
          // Return as `reaction.message.author` may be undefined/null
          return;
        }
      }
      if (reaction.message.author.bot && !user.bot) {
        if (reaction.emoji.name === "🗑️" && reaction.message.deletable) {
          await reaction.message.delete();
        }
      }
    });
  }

  registerCommands() {
    this.client.on(Events.MessageCreate, async (message) => {
      // When we receive a message we check if the message is partial or not
      if (message.partial) {
        // If the message was removed the fetching might result in an API error, which we need to handle
        try {
          await message.fetch();
        } catch (error) {
          console.error(
            "Something went wrong when fetching the message: ",
            error
          );
          // Return as `message.author` may be undefined/null
          return;
        }
      }
      const messageContent = message.content;
      const channel = message.channel;

      // Our bot needs to know if it will execute a command
      // It will listen for messages that will start with `!`
      if (!messageContent.startsWith(this.config.prefix)) {
        return;
      }

      // We don't respond to messages from bots (including this one)
      if (message.author.bot) {
        return;
      }

      let args = messageContent.substring(this.config.prefix.length).split(" ");

      let cmd = args.shift().toLowerCase();

      switch (cmd) {
        case "commands":
          message.author.send(getCommandNames());
          message.react("👍");
          break;
        case "echo":
          if (args.length) {
            sendToChannel(channel, args.join(" "));
          }
          break;

        case "help":
        case "man":
          message.author.send(getHelpMessage(this.config, args));
          message.react("👍");
          break;
        case "mtg":
        case "mtgcard":
          mtgCard(args, channel);
          break;

        case "ping":
          sendToChannel(channel, "pong!");
          break;

        case "pong":
          sendToChannel(channel, "ping!");
          break;

        case "pizzq": // Hi Karli
          message.react("<:karli:230881965702643722>");
        case "pizza":
          sendToChannel(channel, "😀  🍕🍕🍕🍕  😊");
          break;

        case "whoami":
          sendToChannel(channel, `You are ${message.author.username}. `);
          break;

        case "whowasthat":
          let whoMsg = parseConnectionEvents(args, this.storedConnectionEvents);
          sendToChannel(channel, whoMsg);
          break;

        default:
          return;
      }
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

/**
 *
 * @param {TextChannel} channel
 * @param msgStr
 */
function sendToChannel(channel, msgStr, deleteReact = true) {
  // Truncate message length to avoid Discord rejecting it.
  if (msgStr.length > 2000) {
    msgStr = msgStr.substring(0, 2000);
  }
  const msgProm = channel.send(msgStr);
  if (deleteReact) {
    msgProm
      .then((message) => {
        message.react("🗑️");
      })
      .catch((err) => {
        console.error(err);
      });
  }
}

function mtgCard(args, channel) {
  const errorMessage =
    "An unexpected error occurred retrieving the card image: ";

  let foundCard = false;

  // use promises to send a "searching..." message
  // if the fetch takes more than 1 second
  const cardPromise = getMtgCardUrlByName(args);
  const delayPromise = new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });

  delayPromise
    .then((_) => {
      if (!foundCard) {
        sendToChannel(
          channel,
          `Searching for an image of the card '${args.join(" ")}'...`
        );
      }
    })
    .catch((reason) => {
      sendToChannel(channel, errorMessage + reason);
    });

  cardPromise
    .then((cardUrl) => {
      foundCard = true;
      if (Array.isArray(cardUrl)) {
        for (const url of cardUrl) {
          if (url) sendToChannel(channel, url, false);
        }
      } else if (cardUrl) {
        sendToChannel(channel, cardUrl, false);
      }
    })
    .catch((reason) => {
      sendToChannel(channel, errorMessage + reason);
    });
}

function parseConnectionEvents(args, events) {
  let useRelative = true;
  while (args[0] && args[0].startsWith("-")) {
    let flag = args.shift();
    switch (flag) {
      case "-t":
      case "--time":
        useRelative = false;
    }
  }
  // read in the first argument as a specified number of events to return
  let intArg = parseInt(args.shift());

  let messageToSend =
    "An unexpected error occurred while retrieving recent connection events. ";

  if (!events || !events.length) {
    messageToSend =
      "Sorry, I don't have a record of a recent connection / disconnection. ";
  } else {
    // Default to 1 request if no arg specified. Ensure we don't exceed array length.
    let numToRead = intArg ? Math.min(intArg, events.length) : 1;

    // Grab the last (numEventsRequested) elements of the stored events (not exceeding the array's length)
    // Convert each of them to a legible string, and then concatenate them to each other with newlines
    let strEvents = events
      .slice(-1 * numToRead)
      .reverse()
      .map((e) => e.toString(useRelative)) // Array stores events in chronological order
      .join("\n");

    // If there's more than 1 event being returned, add a prefix line so that the records line up nicely
    messageToSend =
      numToRead === 1
        ? strEvents
        : `The ${numToRead} most recent events are: \n` + strEvents;
  }
  return messageToSend;
}

const byNameUrl = "https://api.scryfall.com/cards/named?format=image&fuzzy=";
const byNameBacksideUrl =
  "https://api.scryfall.com/cards/named?format=image&face=back&fuzzy=";
const searchApiUrl = "https://api.scryfall.com/cards/search?q=name:";
const maxDisambiguationOptions = 10;

/**
 * Given the whole, exact name of a Magic, the Gathering card,
 * retrieve a URL for an image of the card
 * @param {string} cardArgs The name of the card, a a string array
 */
async function getMtgCardUrlByName(cardArgs) {
  const formattedArgs = cardArgs.join("+");
  const humanReadableArgs = "`" + cardArgs.join(" ") + "`";

  const fetchPromise = await fetch(byNameUrl + formattedArgs);
  const backsidePromise = await fetch(byNameBacksideUrl + formattedArgs);

  let foundUrl = ["", ""];

  // On a single result, Scryfall redirects the request to the image URL.
  if (fetchPromise.redirected) {
    foundUrl[0] = fetchPromise.url;

    if (backsidePromise.redirected && backsidePromise.status != 422) {
      foundUrl[1] = backsidePromise.url;
    }

    return foundUrl;
  }

  // Didn't get a redirect, so there's not an unambiguous result.
  // Parse the actual response from Scryfall.
  const byNameJson = await fetchPromise.json();

  // If there was some error other than multiple results, just propagate that.
  if (byNameJson.type != "ambiguous") {
    return byNameJson.details ?? "Error parsing the error from Scryfall.";
  }

  // Use the "Search" API to find all potential matches.
  let searchUrl = searchApiUrl + formattedArgs;
  const searchPromise = await fetch(searchUrl);
  const searchJson = await searchPromise.json();
  let foundNames = searchJson.data.map((card) => card.name);

  // If we have too many options to show, truncate them.
  const length = foundNames.length;
  let numFound = length;
  if (length > maxDisambiguationOptions) {
    let numExtra;
    if (length < 175) {
      numExtra = length - maxDisambiguationOptions;
    } else {
      numFound = numExtra = "many";
    }
    foundNames.splice(
      /*start=*/ maxDisambiguationOptions,
      /*deleteCount=*/ Infinity,
      `... and ${numExtra} more`
    );
  }

  return (
    `I found ${numFound} cards possibly matching ${humanReadableArgs}.\n` +
    `Did you mean:\n` +
    `${foundNames.map((name) => `* ${name}`).join("\n")}`
  );
}

const echoGuide = {
  name: "echo",
  shortDescription: `Echoes the given text back to you`,
  synopsis: `echo TEXT`,
  description: `Responds in the same channel with the given TEXT. Does not respond at all if there is no given TEXT.`,
};
const helpGuide = {
  name: "help",
  shortDescription: `Sends you help documentation`,
  synonyms: ["help", "man"],
  synopsis: `help [COMMAND]`,
  description: `Whispers you with help documentation. If COMMAND is specified, gives specific usage information. `,
};
const mtgGuide = {
  name: "mtg",
  shortDescription: "Finds an image of a Magic: the Gathering card by name",
  synonyms: ["mtg", "mtgcard"],
  synopsis: `mtg CARDNAME`,
  description:
    "Responds with an image of the Magic: the Gathering card most closely matching CARDNAME. \n" +
    "\tIf a single card cannot be determined by the given name, will fail and respond with an error message. " +
    "Uses fuzzy string matching. API for card images provided by <http://scryfall.com/> \n" +
    "\tIf your search is taking unexpectedly long, will respond with a 'searching' message first. ",
};
const pingGuide = {
  name: "ping",
  description: "Responds with 'pong!'",
};
const pongGuide = {
  name: "pong",
  description: "Responds with 'ping!'",
};
const pizzaGuide = {
  name: "pizza",
  shortDescription: "Reward the bot with some pizza",
  synonyms: ["pizza", "pizzq"],
  description: "Responds with '😀  🍕🍕🍕🍕  😊'. ",
};
const whoAmIGuide = {
  name: "whoami",
  description: "Responds with your discord username",
};
const whoWasThatGuide = {
  name: "whowasthat",
  shortDescription: `Responds with recent connect/disconnect events`,
  synopsis: `whowasthat [NUM]`,
  flags: {
    name: "--time",
    shortName: "-t",
    description:
      "Displays the event time as an absolute time, instead of relative",
  },
  description:
    `Responds with the most recent voice channel change event (connection, disconnection, move). \n` +
    `\tIf NUM is specified, will give the NUM most recent events, up to a configured maximum. `,
};

const helpGuides = [
  echoGuide,
  helpGuide,
  mtgGuide,
  pingGuide,
  pongGuide,
  pizzaGuide,
  whoAmIGuide,
  whoWasThatGuide,
];

function getCommandNames() {
  return (
    "Commands:\n```" +
    helpGuides
      .map((g) => g.name.padEnd(15) + (g.shortDescription || g.description))
      .join("\n") +
    "```"
  );
}

function getHelpMessage(config, args) {
  let cmdName = null;
  if (args && args.length) {
    cmdName = args.shift().toLowerCase();
  }
  if (cmdName && cmdName.startsWith(config.prefix)) {
    cmdName = cmdName.substring(config.prefix.length);
  }

  let helpMessage =
    "There was an error interpreting your request. Please check your message and try again. ";
  switch (cmdName) {
    default:
      helpMessage = `Sorry, I don't have any help for the command '${cmdName}'. `;
      break;
    case null:
      helpMessage =
        `Hi! I'm a basic Discord bot, with some limited command-response functionality.\r` +
        `For a list of commands, use\r\t${config.prefix}commands\n` +
        `For help with a particular command, use\r` +
        `\t${config.prefix}help <command>\r\t\tOR\r\t${config.prefix}man <command>\r`;
      break;

    case "echo":
      helpMessage = parseHelpObject(echoGuide);
      break;

    case "help":
      helpMessage = parseHelpObject(helpGuide);
      break;

    case "mtg":
    case "mtgcard":
      helpMessage = parseHelpObject(mtgGuide);
      break;

    case "ping":
      helpMessage = parseHelpObject(pingGuide);
      break;

    case "pong":
      helpMessage = parseHelpObject(pongGuide);
      break;

    case "pizzq": // Hi Karli
    case "pizza":
      helpMessage = parseHelpObject(pizzaGuide);
      break;

    case "whoami":
      helpMessage = parseHelpObject(whoAmIGuide);
      break;

    case "whowasthat":
      helpMessage = parseHelpObject(whoWasThatGuide);
      break;
  }

  return helpMessage;
}

function parseHelpObject(helpObj) {
  const header = `Help Documentation - ${helpObj.name}\r`;
  const nameSec = `NAME\r\t${helpObj.name} - ${
    helpObj.shortDescription || helpObj.description
    }\r\r`;
  const synonymsSec = `SYNONYMS\r\t${
    helpObj.synonyms && helpObj.synonyms.join("\r\t")
    }\r\r`;
  const synopsisSec = `SYNOPSIS\r\t${helpObj.synopsis}\r\r`;
  const descSec = `DESCRIPTION\r\t${helpObj.description}\r\r`;
  const flags = helpObj.flags
    ? `FLAGS\r\t\`${helpObj.flags.name}\`, \`${helpObj.flags.shortName}\`\r\t${helpObj.flags.description}\r\r`
    : "";

  return `${header}${nameSec}${helpObj.synonyms ? synonymsSec : ""}${flags}${
    helpObj.synopsis ? synopsisSec : ""
    }${helpObj.description ? descSec : ""}`;
}
