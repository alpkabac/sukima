import {config} from "dotenv";
import Command from "./Command.js";
import duckHuntService from "../service/rpg/duckHuntService.js";

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
        "Attack",
        ["!attack"],
        ["!attack "],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            const result = await duckHuntService.attack(channel, from)

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
        "Loot",
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
    grab: new Command(
        "Grab loot",
        [],
        ["!grab", "!pick", "!take"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            const result = await duckHuntService.pick(channel, from)

            if (result) {
                return {
                    message: `[ Player ${from} grabbed item "${result}" ]`,
                    success: true
                }
            }
            return {error: "# Nothing to grab..."}
        },
        false
    ),
}

duckHuntCommands.all = [
    duckHuntCommands.spawn,
    duckHuntCommands.attack,
    duckHuntCommands.loot,
    duckHuntCommands.grab
]

export default duckHuntCommands