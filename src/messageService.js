const conf = require("../conf.json")

class MessageService {
    static parse(msg) {
        const answer = msg.startsWith(conf.botName + ": ") ?  // Remove starting bot name if present
            msg.slice((conf.botName + ": ").length)
            : msg

        // Remove everything from the output that is not something that the bot says itself
        return answer
            .split(`${conf.botName} :`)
            .join("\n")
            .split(`${conf.botName}:`)
            .join("\n")
            .split(/([ a-zA-Z0-9-_'`\[\]]+ :)/)[0]           // Remove text after first "nick: "
            .split(/([ a-zA-Z0-9-_'`\[\]]+:)/)[0]           // Remove text after first "nick:"
            .split("\n")
            .map((str) => str.trim())
            .join("\n")
            .replace(/  +/g, ' ')      // Remove double spaces
            .replace(/\n /g, ' ')
            .replace(",\n", ", ")
            .replace(".\n", ". ")
            .replace("?\n", "? ")
            .replace("!\n", "! ")
            .replace("\n", ". ")
    }
}

module.exports = MessageService