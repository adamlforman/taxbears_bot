import { VoiceState } from "discord.js";

export class ConnectionEvent {
    /**
     * 
	 * @param	{VoiceState}	oldMember The pre-update voice state of the user
	 * @param	{VoiceState}	newMember The post-update voice state of the user
     * @param newMember 
     */
    constructor(oldMember, newMember) {

		// Determine the old channel, if there was one
		let oldUserChannel = getChannel(oldMember);
		
		// Determine the new channel, if there was one
		let newUserChannel = getChannel(newMember);
		
		// Determine the user name, being careful
		// about accessing potentially null objects
		let userName = "placeHolderUserName";
		if (newMember && newMember != {}) {
			userName = newMember.member.user.username
		}
		else if (oldMember != {}) {
			userName = oldMember.member.user.username
		}
		
        let channelName = (newUserChannel || oldUserChannel);
        
        // Determine what type of event this was
        // Default to null
		let eventType = null;
        if (newUserChannel && oldUserChannel) {
            if (newUserChannel !== oldUserChannel) {
                eventType = "moved to channel";
            }
            else {
                // This is an event like a mute-toggle that we don't wish to save
                eventType = null;
            } 
        }
        else {
            if (newUserChannel && !oldUserChannel) {
                // Connect event
                eventType = "connected to channel";
            }
            else if (!newUserChannel && oldUserChannel) {
                // Disconnect event
                eventType = "disconnected from channel";
            }
        }
    
											
		this.timestamp = Date.now();
        this.userName = userName;
        this.eventType = eventType;
        this.channelName = channelName;
    }

	/**
	 * Parse a connection event into a legible string
	 * @param {ConnectionEvent} connectEvent The event to parse
	 * @returns {string} A legible string representing the event
	 */
	toString() {
		// "{2 minutes ago}, {ArsanL} {disconnected from channel}: {Internet Starlite}. "
		return `${timeSince(this.timestamp)}, ${this.userName} ${this.eventType}: ${this.channelName}.`;
	}
}

/**
 * Get the channel name from a Voice State in a null-safe way
 * @param   {VoiceState}    memberVoiceState    A voice state
 */
function getChannel(memberVoiceState) {
    let channelName = "";
    if (memberVoiceState && memberVoiceState != {}) {
        let ch = memberVoiceState.channel;
        if (ch) {
            channelName = ch.name;
        }
    }
    return channelName;
}

/**
 * Given a Date, return a legible relative string description of
 * it (e.g. "5 seconds ago, 1 hour ago")
 * @param {Date} timestamp 
 */
function timeSince(timestamp) {
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
}
