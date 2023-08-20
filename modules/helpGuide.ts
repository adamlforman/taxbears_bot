export class HelpGuide {
  name: string;
  shortDescription?: string;
  synonyms?: string[];
  flags?: FlagHelp[];
  synopsis?: string;
  description: string;

  toString(): string {
    const header = `Help Documentation - ${this.name}\r`;
    const nameSec = `NAME\r\t${this.name} - ${
      this.shortDescription || this.description
    }\r\r`;
    const synonymsSec = `SYNONYMS\r\t${
      this.synonyms && this.synonyms.join("\r\t")
    }\r\r`;
    const synopsisSec = `SYNOPSIS\r\t${this.synopsis}\r\r`;
    const descSec = `DESCRIPTION\r\t${this.description}\r\r`;
    const flags = this.flags ? `FLAGS\r${this.flags.join("\r")}\r` : "";

    return `${header}${nameSec}${this.synonyms ? synonymsSec : ""}${flags}${
      this.synopsis ? synopsisSec : ""
    }${this.description ? descSec : ""}`;
  }
}

export class FlagHelp {
  name: string;
  shortName: string;
  description: string;

  toString(): string {
    return `\t\`${this.name}\`, \`${this.shortName}\`\r\t${this.description}\r`;
  }
}
