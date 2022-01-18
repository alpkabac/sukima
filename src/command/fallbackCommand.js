import {config} from "dotenv";
import Command from "./Command.js";

config()


const fallbackCommands = {
    fallback: new Command(
        "Command Fallback",
        [],
        ["!"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return {
                message: `# Command \`${msg}\` isn't implemented yet!`,
                instantReply: true
            }
        },
        true
    )
}

fallbackCommands.all = [
    fallbackCommands.fallback,
]

export default fallbackCommands