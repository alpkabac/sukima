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
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            let difficulty
            let name

            const args = parsedMsg.split(';').map(s => s.trim())
            if (args.length === 2) {
                difficulty = args[0]
                name = args[1]
            } else if (args.length === 1) {
                difficulty = args[0]
            } else {
                difficulty = parsedMsg || null
            }

            return await duckHuntService.spawn(channel, difficulty, name)
        },
        false
    ),
    attack: new Command(
        "Attack",
        [],
        ["!atk", "!attack", "⚔", "⚔️", ":crossed_swords:", ":baguette_attack:", "Attack!", "!fight", "!kill", "!charge", "!finish"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return await duckHuntService.attack(channel, from)
        },
        false
    ),
    take: new Command(
        "Grab loot",
        [],
        ["!grab", "!pick", "!take", "!keep"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.take(channel, from, parsedMsg)
        },
        false
    ),
    drop: new Command(
        "Drop item",
        [],
        ["!drop"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.drop(channel, from, parsedMsg)
        },
        false
    ),
    look: new Command(
        "Look items on the floor",
        [],
        ["!look"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.look(channel, from)
        },
        false
    ),
    sell: new Command(
        "Sell item",
        [],
        ["!sell"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.sell(channel, from, parsedMsg)
        },
        false
    ),
    equip: new Command(
        "Equip Item",
        [],
        ["!equipItem", "!equip"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.equipItem(channel, from, parsedMsg.trim())
        },
        false
    ),
    equipWeapon: new Command(
        "Equip Weapon",
        [],
        ["!equipWeapon", "!equip Weapon", "!equip weapon", "!equipW", "!equip W", "!equip", "!weapon"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.equipWeapon(channel, from, parsedMsg.trim())
        },
        false
    ),
    equipArmor: new Command(
        "Equip armor",
        [],
        ["!equipArmor", "!equip Armor", "!equip armor", "!equipAr", "!equip Ar", "!equip ar", "!armor", "!wear"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.equipArmor(channel, from, parsedMsg.trim())
        },
        false
    ),
    equipAccessory: new Command(
        "Equip accessory",
        [],
        ["!equipRing", "!equipAccessory", "!equip Accessory", "!equip accessory", "!equipAcc", "!equip Acc", "!equip acc", "!equipAc", "!equip Ac", "!equip ac", "!accessory"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.equipAccessory(channel, from, parsedMsg.trim())
        },
        false
    ),
    unequipWeapon: new Command(
        "Unequip Weapon",
        [],
        ["!unequipWeapon", "!unequip Weapon", "!unequipW", "!unequip W"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.unequipWeapon(channel, from)
        },
        false
    ),
    unequipArmor: new Command(
        "Unequip armor",
        [],
        ["!unequipArmor", "!unequip Armor", "!unequip armor", "!unequipAr", "!unequip Ar", "!unequip ar"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.unequipArmor(channel, from)
        },
        false
    ),
    unequipAccessory: new Command(
        "Unequip accessory",
        [],
        ["!unequipAccessory", "!unequip Accessory", "!unequipAcc", "!unequip Acc", "!unequip acc", "!unequipAc", "!unequip Ac", "!unequip ac"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.unequipAccessory(channel, from)
        },
        false
    ),
    showInventory: new Command(
        "Show Inventory",
        [],
        ["!inventory", "!showInventory", "!showEquipment", "!checkEquipment", "!checkInventory"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.showInventory(channel, from)
        },
        false
    ),
    upgradeBackpack: new Command(
        "Upgrade Backpack",
        [],
        ["!upgradeBackpack", "!upgrade", "!Upgrade"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.upgradeBackpack(channel, from)
        },
        false
    ),
}

duckHuntCommands.all = [
    duckHuntCommands.spawn,
    duckHuntCommands.attack,
    duckHuntCommands.take,
    duckHuntCommands.drop,
    duckHuntCommands.look,
    duckHuntCommands.sell,
    duckHuntCommands.equipArmor,
    duckHuntCommands.equipAccessory,
    duckHuntCommands.unequipWeapon,
    duckHuntCommands.unequipArmor,
    duckHuntCommands.unequipAccessory,
    duckHuntCommands.showInventory,
    duckHuntCommands.upgradeBackpack,
    duckHuntCommands.equipWeapon,
    //duckHuntCommands.equip,
]

export default duckHuntCommands