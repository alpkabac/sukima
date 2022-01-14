import {config} from "dotenv";
import Command from "./Command.js";
import duckHuntService from "../service/rpg/duckHuntService.js";

config()


const fallbackCommands = {
    fallback: new Command(
        "Command Fallback",
        [],
        ["!"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.fallback(channel, command, msg)
        },
        true
    )
}

fallbackCommands.all = [
    fallbackCommands.fallback,
]

export default fallbackCommands