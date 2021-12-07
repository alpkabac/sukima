import {config} from "dotenv";

config()

class MessageService {
    static parse(msg) {
        if (!msg) return ""
        const answer = msg.startsWith(process.env.BOTNAME + ": ") ?  // Remove starting bot name if present
            msg.slice((process.env.BOTNAME + ": ").length)
            : msg

        // Remove everything from the output that is not something that the bot says itself
        return answer.split('\n')[0]
            .replace(/(.)\1{3,}/g, "$1")
    }
}

export default MessageService