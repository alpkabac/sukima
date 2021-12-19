import {config} from "dotenv";
import Command from "./Command.js";
import duckHuntService from "../service/duckHuntService.js";

config()


const duckHuntCommands = {
    spawn: new Command(
        "Spawn",
        ["!spawn"],
        ["!spawn "],
        process.env.ALLOW_RPG_SPAWN,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            const args = parsedMsg.split(';').map(s => s.trim())
            let difficulty
            let name
            if (args.length === 2) {
                difficulty = args[0]
                name = args[1]
            } else if (args.length === 1) {
                difficulty = args[0]
            } else {
                difficulty = parsedMsg || null
            }
            return {
                message: await duckHuntService.spawn(channel, difficulty, name),
                success: true,
                deleteUserMsg: true
            }
        },
        false
    ),
    attack: new Command(
        "Spawn",
        ["!attack"],
        ["!attack "],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            const result = await duckHuntService.attack(channel, parsedMsg || undefined)

            if (result) {
                return {
                    message: `[ Attack by ${from} ]\n${result.description}\nSuccess: ${result.success}`,
                    success: true
                }
            }
            return {error: "# Nothing to attack..."}
        },
        false
    ),
    loot: new Command(
        "Spawn",
        ["!loot"],
        [],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            const result = await duckHuntService.loot(channel)

            if (result) {
                return {
                    message: `[ Loot: ${result} ]`,
                    success: true
                }
            }
            return {error: "# Nothing to loot..."}
        },
        false
    ),
}

duckHuntCommands.all = [
    duckHuntCommands.spawn,
    duckHuntCommands.attack,
    duckHuntCommands.loot,
]

export default duckHuntCommands