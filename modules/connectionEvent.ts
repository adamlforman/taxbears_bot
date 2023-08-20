import { VoiceState } from "discord.js";

export class ConnectionEvent {
  timestampMs: number;
  userName: string | null;
  eventType: string | null;
  channelName: string;

  /**
   *
   * @param	{VoiceState}	oldMember The pre-update voice state of the user
   * @param	{VoiceState}	newMember The post-update voice state of the user
   * @param newMember
   */
  constructor(oldMember: VoiceState, newMember: VoiceState) {
    // Determine the old channel, if there was one
    let oldUserChannel = getChannel(oldMember);

    // Determine the new channel, if there was one
    let newUserChannel = getChannel(newMember);

    // Determine the user name, being careful
    // about accessing potentially null objects
    let userName: string | null;
    if (newMember && newMember.member) {
      userName = newMember.member.user.username;
    } else if (oldMember && oldMember.member) {
      userName = oldMember.member.user.username;
    } else {
      userName = null;
    }

    let channelName = newUserChannel || oldUserChannel;

    // Determine what type of event this was
    let eventType: string | null = null;
    if (newUserChannel && oldUserChannel) {
      if (newUserChannel !== oldUserChannel) {
        eventType = "moved to channel";
      } else {
        // This is an event like a mute-toggle that we don't wish to save
        eventType = null;
      }
    } else {
      if (newUserChannel && !oldUserChannel) {
        // Connect event
        eventType = "connected to channel";
      } else if (!newUserChannel && oldUserChannel) {
        // Disconnect event
        eventType = "disconnected from channel";
      }
    }

    this.timestampMs = Date.now();
    this.userName = userName;
    this.eventType = eventType;
    this.channelName = channelName;
  }

  /**
   * Parse a connection event into a legible string
   * @param {boolean} useRelative Whether to
   * @returns {string} A legible string representing the event
   */
  toString(useRelative: boolean = true): string {
    if (useRelative) {
      // "{2 minutes ago}, {ArsanL} {disconnected from channel}: {Internet Starlite}. "
      return `${timeSince(this.timestampMs)}, ${this.userName} ${
        this.eventType
      }: ${this.channelName}.`;
    } else {
      return `<t:${Math.trunc(this.timestampMs / 1000)}>, ${this.userName} ${
        this.eventType
      }: ${this.channelName}.`;
    }
  }
}

/**
 * Get the channel name from a Voice State in a null-safe way
 * @param   {VoiceState}    memberVoiceState    A voice state
 */
function getChannel(memberVoiceState: VoiceState): string {
  return memberVoiceState?.channel?.name ?? "";
}

/**
 * Given a Date, return a legible relative string description of
 * it (e.g. "5 seconds ago, 1 hour ago")
 * @param {number} timestampMs
 */
function timeSince(timestampMs: number) {
  let dateTime = new Date(timestampMs);
  if (!dateTime) {
    return "<Time Parse Error>";
  }
  let now = new Date();
  let secondsPast = (now.getTime() - dateTime.getTime()) / 1000;
  if (secondsPast < 60) {
    let numSecs = secondsPast;
    return `${numSecs} second${numSecs > 1 ? "s" : ""} ago`;
  }
  if (secondsPast < 3600) {
    let numMins = secondsPast / 60;
    return `${numMins} minute${numMins > 1 ? "s" : ""} ago`;
  }
  if (secondsPast <= 86400) {
    let numHrs = secondsPast / 3600;
    return `${numHrs} hour${numHrs > 1 ? "s" : ""} ago`;
  } else {
    let day = dateTime.getDate();
    let month = dateTime
      .toDateString()
      .match(/ [a-zA-Z]*/)
      ?.at(0)
      ?.replace(" ", "");
    let year =
      dateTime.getFullYear() == now.getFullYear()
        ? ""
        : " " + dateTime.getFullYear();
    return "On " + day + " " + month + year;
  }
}
