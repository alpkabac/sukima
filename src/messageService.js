require('dotenv').config()

class MessageService {
    static parse(msg) {
        const answer = msg.startsWith((process.env.SURNAME || process.env.BOTNAME) + ": ") ?  // Remove starting bot name if present
            msg.slice(((process.env.SURNAME || process.env.BOTNAME) + ": ").length)
            : msg

        // Remove everything from the output that is not something that the bot says itself
        return answer.split('\n')[0]
            .replace(/(.)\1{3,}/g, "$1")

            /*
            .split(`${process.env.BOTNAME} :`)
            .join("\n")
            .split(`${process.env.BOTNAME}:`)
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
             */
    }
}

module.exports = MessageService