import {config} from "dotenv";
import Command from "./Command.js";
import duckHuntService from "../service/rpg/duckHuntService.js";
import playerService from "../service/rpg/playerService.js";

config()


const duckHuntCommands = {
    spawn: new Command(
        "Spawn",
        ["!spawn"],
        ["!spawn "],
        process.env.ALLOW_RPG_SPAWN,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {

            return {
                error: "Temporarily disabled for testing purposes"
            }

            let difficulty
            let name

            /*
            const args = parsedMsg.split(';').map(s => s.trim())
            if (args.length === 2) {
                difficulty = args[0]
                name = args[1]
            } else if (args.length === 1) {
                difficulty = args[0]
            } else {
                difficulty = parsedMsg || null
            }
             */

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
        [],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            return await duckHuntService.attack(channel, from)
        },
        false
    ),
    attack2: new Command(
        "Attack2: the return of the attack",
        ["!attack2"],
        [],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            return await duckHuntService.attack2(channel, from)
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
                    message: `[ Looted Item: ${result} ]`,
                    success: true,
                    deleteUserMsg: true
                }
            }
            return {error: "# Nothing to loot..."}
        },
        false
    ),
    take: new Command(
        "Grab loot",
        [],
        ["!grab", "!pick", "!take"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            const result = duckHuntService.take(channel, from)

            const player = playerService.getPlayer(channel, from)
            if (result) {
                return {
                    message:
                        result.equippedAsWeapon ?
                            `[ Player ${from} equips the item "${result.item}" as a weapon ]`
                            : `[ Player ${from} takes the item "${result.item}" and puts it in its backpack (slot [${player.inventory.length - 1}]) ]`,
                    success: true,
                    deleteUserMsg: true
                }
            } else if (result === false) {
                return {
                    error: `# Can't take item, you have something in your hands and your backpack is full. Try to \`!sell\` or \`!drop\` an item first!`
                }
            }
            return {error: "# Nothing to grab..."}
        },
        false
    ),
    sell: new Command(
        "Sell item",
        [],
        ["!sell"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            return duckHuntService.sell(channel, from, parsedMsg)
        },
        false
    ),
    equip: new Command(
        "Equip item",
        [],
        ["!equip"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            return duckHuntService.equip(channel, from, parsedMsg)
        },
        false
    ),
    showInventory: new Command(
        "Show Inventory",
        ["!inventory", "!showInventory"],
        [],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            return duckHuntService.showInventory(channel, from)
        },
        false
    ),
    upgradeBackpack: new Command(
        "Upgrade Backpack",
        ["!upgradeBackpack", "!upgrade"],
        [],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            return duckHuntService.upgradeBackpack(channel, from)
        },
        false
    ),
    generateSpell: new Command(
        "Generate Spell",
        [],
        ["!spellBook", "!spellbook", "!spell"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            return duckHuntService.generateSpell(channel, parsedMsg)
        },
        false
    ),
}

duckHuntCommands.all = [
    duckHuntCommands.spawn,
    duckHuntCommands.attack,
    duckHuntCommands.attack2,
    duckHuntCommands.loot,
    duckHuntCommands.take,
    duckHuntCommands.sell,
    duckHuntCommands.equip,
    duckHuntCommands.showInventory,
    duckHuntCommands.upgradeBackpack,
    duckHuntCommands.generateSpell,
]

export default duckHuntCommands