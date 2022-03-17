import {config} from "dotenv";
import Command from "./Command.js";
import duckHuntService from "../service/rpg/duckHuntService.js";
import axios from "axios";
import * as fs from "fs";
import envService from "../util/envService.js";
import rpgService from "../service/rpg/rpgService.js";

config()

const duckHuntCommands = {
    editRPG: new Command(
        "Edit RPG",
        ["!editRPG", '!erpg'],
        [],
        process.env.ALLOW_RPG_SPAWN,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            async function getAttachment(attachmentUrl) {
                const path = `bot/${envService.getBotId()}/rpg.zip`
                try {
                    await (fs.rmSync(path))
                } catch {
                }

                // fetch the file from the external URL
                const response = await axios.get(attachmentUrl, {
                    responseType: 'arraybuffer',
                })

                const zip = Buffer.from(response.data, 'binary')
                fs.writeFileSync(path, zip)
            }

            await getAttachment(attachmentUrl)

            rpgService.loadAllGenerators()
            return {
                message: "# RPG mod loaded",
                success: true
            }
        },
        true
    ),
    spawnItem: new Command(
        "Spawn Item",
        [],
        ["!spawnItem "],
        process.env.ALLOW_RPG_SPAWN,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            let type
            let name
            let rarity

            const args = parsedMsg.split(';').map(s => s.trim())
            if (args.length === 3) {
                rarity = args[0]?.toLowerCase()
                type = args[1]?.toLowerCase()
                name = args[2]
            } else if (args.length === 2) {
                rarity = args[0]?.toLowerCase()
                type = args[1]?.toLowerCase()
            } else if (args.length === 1) {
                type = args[0]?.toLowerCase()
            } else {
                return {
                    error: "You have to provide rarity, type and name, each separated with a semi colon `;`"
                }
            }

            return await duckHuntService.spawnItem(channel, from, rarity, type, name)
        },
        false
    ),
    spawnEquipItem: new Command(
        "Spawn Equip Item",
        [],
        ["!spawnEquipItem "],
        process.env.ALLOW_RPG_SPAWN,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            let type
            let name
            let rarity

            const args = parsedMsg.split(';').map(s => s.trim())
            if (args.length === 3) {
                rarity = args[0]
                type = args[1]
                name = args[2]
            } else if (args.length === 2) {
                rarity = args[0]
                type = args[1]
            } else if (args.length === 1) {
                type = args[0]
            } else {
                return {
                    error: "You have to provide rarity, type and name, each separated with a semi colon `;`"
                }
            }

            return await duckHuntService.spawnEquipItem(channel, from, rarity.toLowerCase(), type.toLowerCase(), name)
        },
        false
    ),
    spawn: new Command(
        "Spawn",
        ["!spawn"],
        ["!spawn "],
        process.env.ALLOW_RPG_SPAWN,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            let difficulty
            let name
            let encounterDescription


            const args = parsedMsg.split(';').map(s => s.trim())
            if (args.length === 3) {
                difficulty = args[0]
                name = args[1]
                encounterDescription = args[2]
            } else if (args.length === 2) {
                difficulty = args[0]
                name = args[1]
            } else if (args.length === 1) {
                difficulty = args[0]
            } else {
                difficulty = parsedMsg || null
            }

            return await duckHuntService.spawn(channel, difficulty, name, encounterDescription)
        },
        false
    ),
    spawnSwarm: new Command(
        "Spawn Swarm of Enemies",
        ["!spawnSwarm", "!swarm"],
        ["!spawnSwarm ", "!swarm "],
        process.env.ALLOW_RPG_SPAWN,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            let difficulty
            let name
            let durationInSeconds

            const args = parsedMsg.split(';').map(s => s.trim())
            if (args.length === 2) {
                difficulty = args[0]
                try {
                    if (!isNaN(args[1])) {
                        durationInSeconds = parseInt(args[1]) * 1000
                    } else {
                        name = args[1]
                    }
                } catch {
                    name = args[1]
                }
            } else if (args.length === 1) {
                try {
                    if (!isNaN(args[0])) {
                        durationInSeconds = parseInt(args[0]) * 1000
                    } else {
                        difficulty = args[0]
                    }
                } catch {
                    difficulty = args[0]
                }
            } else {
                difficulty = parsedMsg || null
            }

            duckHuntService.getSwarm().duration = durationInSeconds ? durationInSeconds : Math.floor(Math.random() * (240 - 120) + 120) * 1000
            duckHuntService.getSwarm().timestamp = Date.now()

            duckHuntService.getSwarm().name = name
            duckHuntService.getSwarm().difficulty = difficulty

            return await duckHuntService.swarm(channel, difficulty, name)
        },
        false
    ),
    attack: new Command(
        "Attack",
        [],
        ["!attack", "!atk", "!atj", "!akt", "⚔", "⚔️", ":crossed_swords:", ":baguette_attack:", "!fight", "!kill", "!charge"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return await duckHuntService.attack(channel, from, false, parsedMsg)
        },
        false
    ),
    wound: new Command(
        "Wound",
        [],
        ["!wound"],
        process.env.ALLOW_RPG_SPAWN,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return await duckHuntService.wound(channel, from, false, parsedMsg)
        },
        false
    ),
    kill: new Command(
        "Kill Player",
        [],
        ["!kill "],
        process.env.ALLOW_RPG_SPAWN,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return await duckHuntService.kill(channel, from, parsedMsg)
        },
        false
    ),
    heal: new Command(
        "Heal",
        [],
        ["!heal"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return await duckHuntService.attack(channel, from, true, parsedMsg)
        },
        false
    ),
    resurrect: new Command(
        "Resurrect",
        ["!resurrect"],
        [],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return await duckHuntService.resurrect(channel, from)
        },
        false
    ),
    revive: new Command(
        "Revive",
        [],
        ["!revive"],
        process.env.ALLOW_RPG_SPAWN,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return await duckHuntService.adminResurrect(channel, from, parsedMsg, false)
        },
        false
    ),
    take: new Command(
        "Grab loot",
        [],
        ["!take", "!grab", "!pick", "!keep"],
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
    cleanup: new Command(
        "Deletes items on the floor",
        [],
        ["!cleanup"],
        process.env.ALLOW_RPG_SPAWN,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            let indexFrom = parseInt(parsedMsg.split('-')[0]) || null
            if (isNaN(indexFrom)) indexFrom = null
            let indexTo = parseInt(parsedMsg.split('-')[1]) || null
            if (isNaN(indexTo)) indexTo = null
            return duckHuntService.cleanup(channel, from, indexFrom, indexTo)
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
    markItemForSale: new Command(
        "Mark Item for Sale",
        [],
        ["!forSale "],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            const [itemSlot, price] = parsedMsg.split(' ')

            if (isNaN(itemSlot)) {
                return {
                    message: `# Player ${from} tried to put an item for sale but didn't provide an item slot as number (value: \`${itemSlot}\`).`,
                    deleteUserMsg: true
                }
            }
            if (isNaN(price)) {
                return {
                    message: `# Player ${from} tried to put an item for sale but didn't provide a price as number (value: \`${price}\`).`,
                    deleteUserMsg: true
                }
            }

            return duckHuntService.forSale(channel, from, itemSlot, price)
        },
        true
    ),
    markItemNotForSale: new Command(
        "Mark Item NOT for Sale",
        [],
        ["!notForSale "],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            const itemSlot = parsedMsg.trim()

            if (isNaN(itemSlot)) {
                return {
                    message: `# Player ${from} tried to remove an item for sale but didn't provide an item slot as number (value: \`${itemSlot}\`).`,
                    deleteUserMsg: true
                }
            }

            return duckHuntService.notForSale(channel, from, itemSlot)
        },
        true
    ),
    buyItemFromPlayer: new Command(
        "Buy Item From Player",
        [],
        ["!buy "],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            const [playerName, itemSlot] = parsedMsg.split(' ')

            if(!playerName){
                return {
                    message: `# Player ${from} tried to buy an item from a player, but didn't provide a player name.`,
                    deleteUserMsg: true
                }
            }

            if(!itemSlot){
                return {
                    message: `# Player ${from} tried to buy an item from player ${playerName}, but didn't provide slot number.`,
                    deleteUserMsg: true
                }
            }

            if (isNaN(itemSlot)) {
                return {
                    message: `# Player ${from} tried to buy an item from ${playerName} but didn't provide an item slot as number (value: \`${itemSlot}\`).`,
                    deleteUserMsg: true
                }
            }

            return duckHuntService.buyItemFromPlayer(channel, from, playerName, itemSlot)
        },
        true
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
        ["!equipWeapon", "!equip Weapon", "!equip weapon", "!equipW", "!equip W", "!weapon", "!ew"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.equipWeapon(channel, from, parsedMsg.trim())
        },
        false
    ),
    equipArmor: new Command(
        "Equip armor",
        [],
        ["!equipArmor", "!equip Armor", "!equip armor", "!equipAr", "!equip Ar", "!equip ar", "!armor", "!wear", "!ear"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.equipArmor(channel, from, parsedMsg.trim())
        },
        false
    ),
    equipAccessory: new Command(
        "Equip accessory",
        [],
        ["!equipAccessory", "!equipRing", "!equip Accessory", "!equip accessory", "!equipAcc", "!equip Acc", "!equip acc", "!equipAc", "!equip Ac", "!equip ac", "!accessory", "!eac"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.equipAccessory(channel, from, parsedMsg.trim())
        },
        false
    ),
    equipHeal: new Command(
        "Equip Heal",
        [],
        ["!equipHeal", "!equip Heal", "!equip heal", "!equipH", "!equip H", "!eh"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.equipHeal(channel, from, parsedMsg.trim())
        },
        false
    ),
    unequipWeapon: new Command(
        "Unequip Weapon",
        [],
        ["!unequipWeapon", "!unequip Weapon", "!unequipW", "!unequip W", "!uew"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.unequipWeapon(channel, from)
        },
        false
    ),
    unequipArmor: new Command(
        "Unequip armor",
        [],
        ["!unequipArmor", "!unequip Armor", "!unequip armor", "!unequipAr", "!unequip Ar", "!unequip ar", "!uear"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.unequipArmor(channel, from)
        },
        false
    ),
    unequipAccessory: new Command(
        "Unequip accessory",
        [],
        ["!unequipAccessory", "!unequip Accessory", "!unequipAcc", "!unequip Acc", "!unequip acc", "!unequipAc", "!unequip Ac", "!unequip ac", "!ueac"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.unequipAccessory(channel, from)
        },
        false
    ),
    unequipHeal: new Command(
        "Unequip Heal",
        [],
        ["!unequipHeal", "!unequip Heal", "!unequipH", "!unequip H", "!ueh"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.unequipHeal(channel, from)
        },
        false
    ),
    showInventory: new Command(
        "Show Inventory",
        [],
        ["!inventory", "!backpack", "!equipment", "!showInventory", "!showBackpack", "!showEquipment", "!checkInventory", "!checkBackpack", "!checkEquipment", "!inv"],
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
    setGender: new Command(
        "Set Player Gender",
        [],
        ["!setGender"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.setGender(channel, from, parsedMsg)
        },
        false
    ),
    inspectItem: new Command(
        "Inspect Item",
        [],
        ["!inspect", "!ins"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.inspectItem(channel, from, parsedMsg.trim())
        },
        false
    ),
    reInspectItem: new Command(
        "Inspect Item",
        [],
        ["!reinspect", '!rei'],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.reInspectItem(channel, from, parsedMsg.trim())
        },
        false
    ),
}

duckHuntCommands.all = [
    duckHuntCommands.editRPG,
    duckHuntCommands.spawnItem,
    duckHuntCommands.spawnEquipItem,
    duckHuntCommands.spawn,
    duckHuntCommands.spawnSwarm,
    duckHuntCommands.kill,
    duckHuntCommands.attack,
    duckHuntCommands.heal,
    duckHuntCommands.resurrect,
    duckHuntCommands.revive,
    duckHuntCommands.wound,
    duckHuntCommands.take,
    duckHuntCommands.drop,
    duckHuntCommands.look,
    duckHuntCommands.cleanup,
    duckHuntCommands.sell,
    duckHuntCommands.markItemForSale,
    duckHuntCommands.markItemNotForSale,
    duckHuntCommands.buyItemFromPlayer,
    duckHuntCommands.equipArmor,
    duckHuntCommands.equipAccessory,
    duckHuntCommands.equipHeal,
    duckHuntCommands.unequipWeapon,
    duckHuntCommands.unequipArmor,
    duckHuntCommands.unequipAccessory,
    duckHuntCommands.unequipHeal,
    duckHuntCommands.showInventory,
    duckHuntCommands.upgradeBackpack,
    duckHuntCommands.setGender,
    duckHuntCommands.equipWeapon,
    duckHuntCommands.inspectItem,
    duckHuntCommands.reInspectItem,
    //duckHuntCommands.equip,
]

export default duckHuntCommands