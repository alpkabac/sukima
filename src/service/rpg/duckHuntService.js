import aiService from "../aiService.js";
import utils from "../../utils.js";
import generatorService from "../generatorService.js";
import playerService from "./playerService.js";
import pawnService from "./pawnService.js";
import envService from "../../util/envService.js";
import worldItemsService from "./worldItemsService.js";
import {MessageEmbed} from "discord.js";

const generatorSpawnAnimal = utils.load("./data/generationPrompt/rpg/spawn.json")
const generatorAttackNew = utils.load("./data/generationPrompt/rpg/attackNew.json")
const generatorLootAnimal = utils.load("./data/generationPrompt/rpg/loot.json")
const generatorSell = utils.load("./data/generationPrompt/rpg/sell.json")
const generatorSpellBook = utils.load("./data/generationPrompt/rpg/generateSpellBook.json")

const stopToken = 224 // "⁂"

class DuckHuntService {

    /**
     * Spawns a random animal/critter/enemy
     */
    static async spawn(channel, difficulty = null, name = null) {

        let args
        if (!difficulty && !name) {
            args = [
                {name: "name"},
                {name: "difficulty"},
                {name: "description"},
            ]
        } else if (difficulty && !name) {
            args = [
                {name: "difficulty", value: difficulty},
                {name: "name"},
                {name: "description"},
            ]
        } else if (!difficulty && name) {
            args = [
                {name: "name", value: name},
                {name: "difficulty"},
                {name: "description"},
            ]
        } else {
            args = [
                {name: "name", value: name},
                {name: "difficulty", value: difficulty},
                {name: "description"},
            ]
        }

        const prompt = generatorService.getPrompt(
            generatorSpawnAnimal,
            args,
            true
        )
        const result = await aiService.simpleEvalbot(prompt.completePrompt, 150, channel.startsWith("##"), stopToken)
        const object = generatorService.parseResult(generatorSpawnAnimal, prompt.placeholderPrompt, result)

        pawnService.createPawn(channel, object.name, object.difficulty, object.description)

        return new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('New Encounter!')
            .setDescription(object.description)
            .addFields(
                {name: 'Name', value: object.name, inline: true},
                {name: 'Difficulty', value: object.difficulty, inline: true},
            )
    }

    /**
     * Attack the current pawn
     */
    static async attack(channel, username) {
        if (!pawnService.isPawnAliveOnChannel(channel)) return {error: "# Nothing to attack..."}

        const player = playerService.getPlayer(channel, username)
        const timeDiff = Date.now() - player.lastAttackAt
        if (player.lastAttackAt && timeDiff < 1000 * envService.getRpgAttackCoolDown()) {
            return {
                error: `${username} tried to attack but is still too tired, ${username} will have to wait for ${((1000 * envService.getRpgAttackCoolDown() - timeDiff) / 1000).toFixed(0)} seconds to attack again`,
                reactWith: '⌛',
                deleteNewMessage: true,
                deleteUserMsg: true
            }
        }

        const pawn = pawnService.getActivePawn(channel)

        let weapon = "No weapon"
        if (player.weapon) {
            weapon = player.weapon
        }

        let armor = "No armor"
        if (player.armor) {
            armor = player.armor
        }

        const enemyStatus = `[ Name: ${pawn.name}; difficulty: ${pawn.difficulty}; wounds: ${pawn.wounds.length === 0 ? 'none' : [...new Set(pawn.wounds)].join(', ')}; status: ${pawn.status} ]`

        const playerEquipment = `[ ${weapon}; ${armor}` + (player.accessory ? `; ${player.accessory}` : '') + ` ]`
        const prompt = generatorService.getPrompt(
            generatorAttackNew,
            [
                {name: "player", value: playerEquipment},
                {name: "enemy", value: enemyStatus},
                {name: "description"},
                {name: "wounds"},
                {name: "status"}
            ],
            true
        )
        const result = await aiService.simpleEvalbot(prompt.completePrompt, 150, channel.startsWith("##"), stopToken)
        const object = generatorService.parseResult(generatorAttackNew, prompt.placeholderPrompt, result)

        pawn.attacks.push({player: username, description: object.description})
        if (object.wounds && object.wounds.trim() && !["none", "undefined", "blocked", "spared", "missed", "failed attempt", "failed attempt (unsuccessful)", "0", "thrown", "nothing"].includes(object.wounds.trim().toLowerCase())) {
            const newWounds = [...new Set(object.wounds.toLowerCase().split(',').map(e => e.trim()))]
            if (newWounds instanceof Array && newWounds.length === 1) {
                pawn.wounds.push(newWounds[0])
            } else if (newWounds instanceof Array && newWounds.length > 1) {
                pawn.wounds.push(...newWounds)
            } else {
                pawn.wounds.push(newWounds.join(', '))
            }
        }

        if (object.status && object.status.trim() && !["failed"].includes(object.status.trim().toLowerCase())) {
            pawn.status = object.status.toLowerCase()
        }

        if (object.status && object.status.trim() && ["dead", "killed", "died"].includes(object.status.trim().toLowerCase())) {
            pawn.alive = false
        }

        player.lastAttackAt = Date.now()

        const msg = new MessageEmbed()
            .setColor('#ff0000')
            .setTitle(`${username} attacks the ${pawn.name}`)
            .setDescription(`${object.description || 'undefined'}`)
            .addField('New enemy wounds', object.wounds, true)
            .addField('New enemy status', object.status, true)
            .addField('All enemy wounds', [...new Set(pawn.wounds)] || 'none', false)


        const lootItem = pawn.alive ? null : (await this.loot(channel))
        const embed = new MessageEmbed()
            .setColor('#ffff66')
            .setTitle(`Loot for ${pawn.name} (difficulty: ${pawn.difficulty}): "${lootItem}"`)
            .setDescription(`Looted item "${lootItem}" is on the ground slot number [${worldItemsService.getActiveItems(channel).length - 1}]`)


        return {
            message: msg, // `[ Attack by ${username} ]\nEnemy current status: ${enemyStatus}\nAction description: ${object.description}\nNew enemy wounds: ${object.wounds}\nNew enemy status: ${object.status}`,
            reactWith: '⚔',
            deleteUserMsg: true,
            instantReply: true,
            alsoSend: pawn.alive ? null : embed
        }
    }

    /**
     * Generate a loot for that pawn
     */
    static async loot(channel) {
        if (!pawnService.isPawnDeadOnChannel(channel)) return null

        const pawn = pawnService.getActivePawn(channel)
        const prompt = generatorService.getPrompt(
            generatorLootAnimal,
            [
                {name: "name", value: pawn.name},
                {name: "difficulty", value: pawn.difficulty},
                {name: "loot"},
            ],
            true
        )
        const result = await aiService.simpleEvalbot(prompt.completePrompt, 150, channel.startsWith("##"), stopToken)
        const object = generatorService.parseResult(generatorLootAnimal, prompt.placeholderPrompt, result)

        worldItemsService.appendItem(channel, object.loot)
        pawnService.removePawn(channel)

        return object.loot
    }

    static take(channel, username, itemSlot) {
        const activeItems = worldItemsService.getActiveItems(channel)
        const itemSlotNotProvided = (!itemSlot.trim() && typeof itemSlot === "string")
        const itemSlotNumber = parseInt(itemSlot)

        if (activeItems.length === 0) return null

        const player = playerService.getPlayer(channel, username)

        const tookItem = playerService.takeItem(channel, username, itemSlotNotProvided ? activeItems[0] : activeItems[itemSlotNumber])
        if (tookItem) {
            activeItems.splice(itemSlotNotProvided ? 0 : itemSlotNumber, 1)
        }

        return !tookItem ? false : {
            item: tookItem.equippedAsWeapon ? player.weapon : player.inventory[player.inventory.length - 1],
            equippedAsWeapon: tookItem.equippedAsWeapon
        }
    }

    static async drop(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        const itemSlotNotProvided = (!itemSlot.trim() && typeof itemSlot === "string")

        if (itemSlotNotProvided) {
            return {
                error: "# This command takes the inventory slot number in argument",
                instantReply: true
            }
        }

        const itemSlotNumber = parseInt(itemSlot)
        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (item === null) return {
            error: `# No item in inventory slot [${itemSlotNumber}]`,
            instantReply: true
        }


        worldItemsService.appendItem(channel, item)
        player.inventory.splice(player.inventory.indexOf(item), 1)

        const embed = new MessageEmbed()
            .setColor('#888844')
            .setTitle(`Player ${username} drops the item "${item}" on the ground`)
            .setDescription(`Ground slot number [${worldItemsService.getActiveItems(channel).length - 1}]`)

        return {
            success: true,
            message: embed, //`[ Player ${username} drops item "${item}" on the ground ]`,
            deleteUserMsg: true,
            instantReply: true
        }
    }

    static async look(channel) {
        const items = worldItemsService.getActiveItems(channel)

        const msg = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`Items on the ground`)

        msg.setDescription(`${items.map((item, i) => `${i}: "${item}"`).join('\n') || 'None'}`)


        return {
            success: true,
            message: msg,
            deleteUserMsg: true,
            instantReply: true
        }
    }

    static async sell(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        const itemSlotNotProvided = (!itemSlot && typeof itemSlot === "string")

        const itemSlotNumber = parseInt(itemSlot)
        const item = itemSlotNotProvided ?
            player.weapon ? player.weapon : null
            : player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (item === null) return {
            error: itemSlot === null ?
                `# You have no item to sell`
                : `# No item in inventory slot [${itemSlotNumber}]`,
            instantReply: true
        }

        const prompt = generatorService.getPrompt(
            generatorSell,
            [
                {name: "name", value: item},
                {name: "price"},
            ],
            true
        )
        const result = await aiService.simpleEvalbot(prompt.completePrompt, 150, channel.startsWith("##"), stopToken)
        const object = generatorService.parseResult(generatorSell, prompt.placeholderPrompt, result)

        // TODO: clean and generify
        const goldAmount = !object?.price ? 0 : parseInt(
            object?.price.replace("${" + generatorSell.placeholders[0][0] + "}", generatorSell.placeholders[0][1])
        )

        if (goldAmount && typeof goldAmount === "number" && !isNaN(goldAmount)) {
            player.gold += goldAmount
            if (itemSlotNotProvided) {
                player.weapon = null
            } else {
                player.inventory.splice(player.inventory.indexOf(item), 1)
            }
        } else {
            throw new Error("Invalid gold amount...")
        }

        const embed = new MessageEmbed()
            .setColor('#ffff00')
            .setTitle(`Player ${username} sold the item "${item}" for ${goldAmount} gold!`)
            .setDescription(`Total player gold now: ${player.gold}`)

        return {
            success: true,
            message: embed, // `[ Player ${username} sold item "${item}" for ${goldAmount} gold! Total player gold: ${player.gold} ]`,
            deleteUserMsg: true,
            instantReply: true
        }
    }

    static async equipWeapon(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        const itemSlotNotProvided = (!itemSlot && typeof itemSlot === "string")

        let itemSlotNumber
        if (itemSlotNotProvided && player.inventory.length !== 1) {
            return {
                error: "# You have to provide an inventory slot number for this command",
                instantReply: true
            }
        } else if (itemSlotNotProvided) {
            itemSlotNumber = 0
        } else {
            itemSlotNumber = parseInt(itemSlot)
        }

        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (item === null) return {
            error: `# No item in inventory slot [${itemSlotNumber}]`,
            instantReply: true
        }

        if (!player.weapon) {
            player.weapon = player.inventory[itemSlotNumber]
            player.inventory.splice(player.inventory.indexOf(player.inventory[itemSlotNumber]), 1)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.weapon}" as weapon`)
                .setDescription(`Equipped "${player.weapon}" as weapon`)
                .addField('Equipped weapon', !player.weapon ? 'No weapon' : player.weapon, true)
                .addField('Equipped armor', !player.armor ? 'No armor' : player.armor, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : player.accessory, true)

            return {
                success: true,
                message: embed, //`[ Player ${username} equips item "${player.weapon}" as weapon ]`,
                deleteUserMsg: true,
                instantReply: true
            }
        } else {
            const weapon = player.weapon
            player.weapon = player.inventory[itemSlotNumber]
            player.inventory.splice(itemSlotNumber, 1)
            player.inventory.push(weapon)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.weapon}" as weapon`)
                .setDescription(`${username} puts "${weapon}" into its backpack slot number [${player.inventory.length - 1}]`)
                .addField('Equipped weapon', !player.weapon ? 'No weapon' : player.weapon, true)
                .addField('Equipped armor', !player.armor ? 'No armor' : player.armor, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : player.accessory, true)
            return {
                success: true,
                message: embed, // `[ Player ${username} equips item "${player.weapon}" as weapon and puts "${weapon}" into its backpack (slot [${player.inventory.length - 1}]) ]`,
                deleteUserMsg: true,
                instantReply: true
            }
        }
    }

    static async equipArmor(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        const itemSlotNotProvided = (!itemSlot && typeof itemSlot === "string")

        let itemSlotNumber
        if (itemSlotNotProvided && player.inventory.length !== 1) {
            return {
                error: "# You have to provide an inventory slot number for this command",
                instantReply: true
            }
        } else if (itemSlotNotProvided) {
            itemSlotNumber = 0
        } else {
            itemSlotNumber = parseInt(itemSlot)
        }
        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (item === null) return {
            error: `# No item in inventory slot [${itemSlotNumber}]`,
            instantReply: true
        }

        if (!player.armor) {
            player.armor = player.inventory[itemSlotNumber]
            player.inventory.splice(player.inventory.indexOf(player.inventory[itemSlotNumber]), 1)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.armor}" as armor`)
                .setDescription(`Equipped "${player.armor}" as armor`)
                .addField('Equipped weapon', !player.weapon ? 'No weapon' : player.weapon, true)
                .addField('Equipped armor', !player.armor ? 'No armor' : player.armor, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : player.accessory, true)
            return {
                success: true,
                message: embed, // `[ Player ${username} equips item "${player.armor}" as armor ]`,
                deleteUserMsg: true,
                instantReply: true
            }
        } else {
            const armor = player.armor
            player.armor = player.inventory[itemSlotNumber]
            player.inventory.splice(itemSlotNumber, 1)
            player.inventory.push(armor)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.armor}" as armor`)
                .setDescription(`${username} puts "${armor}" into its backpack slot number [${player.inventory.length - 1}]`)
                .addField('Equipped weapon', !player.weapon ? 'No weapon' : player.weapon, true)
                .addField('Equipped armor', !player.armor ? 'No armor' : player.armor, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : player.accessory, true)
            return {
                success: true,
                message: embed, // `[ Player ${username} equips item "${player.armor}" as armor and puts "${armor}" into its backpack (slot [${player.inventory.length - 1}]) ]`,
                deleteUserMsg: true,
                instantReply: true
            }
        }
    }

    static async equipAccessory(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        const itemSlotNotProvided = (!itemSlot && typeof itemSlot === "string")

        let itemSlotNumber
        if (itemSlotNotProvided && player.inventory.length !== 1) {
            return {
                error: "# You have to provide an inventory slot number for this command",
                instantReply: true
            }
        } else if (itemSlotNotProvided) {
            itemSlotNumber = 0
        } else {
            itemSlotNumber = parseInt(itemSlot)
        }
        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (item === null) return {
            error: `# No item in inventory slot [${itemSlotNumber}]`,
            instantReply: true
        }

        if (!player.accessory) {
            player.accessory = player.inventory[itemSlotNumber]
            player.inventory.splice(player.inventory.indexOf(player.inventory[itemSlotNumber]), 1)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.accessory}" as accessory`)
                .setDescription(`Equipped "${player.accessory}" as accessory`)
                .addField('Equipped weapon', !player.weapon ? 'No weapon' : player.weapon, true)
                .addField('Equipped armor', !player.armor ? 'No armor' : player.armor, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : player.accessory, true)
            return {
                success: true,
                message: embed,
                deleteUserMsg: true,
                instantReply: true
            }
        } else {
            const accessory = player.accessory
            player.accessory = player.inventory[itemSlotNumber]
            player.inventory.splice(itemSlotNumber, 1)
            player.inventory.push(accessory)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.accessory}" as accessory`)
                .setDescription(`${username} puts "${accessory}" into its backpack slot number [${player.inventory.length - 1}]`)
                .addField('Equipped weapon', !player.weapon ? 'No weapon' : player.weapon, true)
                .addField('Equipped armor', !player.armor ? 'No armor' : player.armor, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : player.accessory, true)
            return {
                success: true,
                message: embed,
                deleteUserMsg: true,
                instantReply: true
            }
        }
    }

    static async unequipWeapon(channel, username) {
        const player = playerService.getPlayer(channel, username)

        if (!player.weapon) {
            return {
                error: `# You don't have any weapon`,
                instantReply: true
            }
        } else {
            if (player.inventory.length < player.inventorySize) {
                player.inventory.push(player.weapon)
                player.weapon = null

                const embed = new MessageEmbed()
                    .setColor('#665500')
                    .setTitle(`Player ${username} unequips weapon "${player.inventory[player.inventory.length - 1]}"`)
                    .setDescription(`${username} puts item "${player.inventory[player.inventory.length - 1]}" into its backpack slot number [${player.inventory.length - 1}]`)
                    .addField('Equipped weapon', !player.weapon ? 'No weapon' : player.weapon, true)
                    .addField('Equipped armor', !player.armor ? 'No armor' : player.armor, true)
                    .addField('Equipped accessory', !player.accessory ? 'No accessory' : player.accessory, true)
                return {
                    success: true,
                    message: embed, // `[ Player ${username} unequips weapon "${player.weapon}" and puts it into its backpack (slot [${player.inventory.length - 1}]) ]`,
                    deleteUserMsg: true,
                    instantReply: true
                }
            } else {
                return {
                    error: `# You don't have enough space in your inventory`,
                    instantReply: true
                }
            }

        }
    }

    static async unequipArmor(channel, username) {
        const player = playerService.getPlayer(channel, username)

        if (!player.armor) {
            return {
                error: `# You don't have any armor`,
                instantReply: true
            }
        } else {
            if (player.inventory.length < player.inventorySize) {
                player.inventory.push(player.armor)
                player.armor = null
                const embed = new MessageEmbed()
                    .setColor('#665500')
                    .setTitle(`Player ${username} unequips armor "${player.inventory[player.inventory.length - 1]}"`)
                    .setDescription(`${username} puts item "${player.inventory[player.inventory.length - 1]}" into its backpack slot number [${player.inventory.length - 1}]`)
                    .addField('Equipped weapon', !player.weapon ? 'No weapon' : player.weapon, true)
                    .addField('Equipped armor', !player.armor ? 'No armor' : player.armor, true)
                    .addField('Equipped accessory', !player.accessory ? 'No accessory' : player.accessory, true)
                return {
                    success: true,
                    message: embed, // `[ Player ${username} unequips armor "${player.armor}" and puts it into its backpack (slot [${player.inventory.length - 1}]) ]`,
                    deleteUserMsg: true,
                    instantReply: true
                }
            } else {
                return {
                    error: `# You don't have enough space in your inventory`,
                    instantReply: true
                }
            }

        }
    }

    static async unequipAccessory(channel, username) {
        const player = playerService.getPlayer(channel, username)

        if (!player.accessory) {
            return {
                error: `# You don't have any accessory`,
                instantReply: true
            }
        } else {
            if (player.inventory.length < player.inventorySize) {
                player.inventory.push(player.accessory)
                player.accessory = null
                const embed = new MessageEmbed()
                    .setColor('#665500')
                    .setTitle(`Player ${username} unequips accessory "${player.inventory[player.inventory.length - 1]}"`)
                    .setDescription(`${username} puts item "${player.inventory[player.inventory.length - 1]}" into its backpack slot number [${player.inventory.length - 1}]`)
                    .addField('Equipped weapon', !player.weapon ? 'No weapon' : player.weapon, true)
                    .addField('Equipped armor', !player.armor ? 'No armor' : player.armor, true)
                    .addField('Equipped accessory', !player.accessory ? 'No accessory' : player.accessory, true)
                return {
                    success: true,
                    message: embed,
                    deleteUserMsg: true,
                    instantReply: true
                }
            } else {
                return {
                    error: `# You don't have enough space in your inventory`,
                    instantReply: true
                }
            }

        }
    }

    static async showInventory(channel, username) {
        const player = playerService.getPlayer(channel, username)
        const embed = new MessageEmbed()
            .setColor('#887733')
            .setTitle(`Inventory of Player ${username}`)
            .setDescription(`Inventory: [ ${player.inventory.map((item, n) => `${n}: "${item}"`).join(', ')} ]`)
            .addField('Equipped weapon', !player.weapon ? 'No weapon' : player.weapon, true)
            .addField('Equipped armor', !player.armor ? 'No armor' : player.armor, true)
            .addField('Equipped accessory', !player.accessory ? 'No accessory' : player.accessory, true)
            .addField('Gold', player.gold, false)
            .addField('Backpack size', player.inventorySize, true)

        return {
            message: embed,
            deleteUserMsg: true,
            instantReply: true
        }
    }

    static async upgradeBackpack(channel, username) {
        const player = playerService.getPlayer(channel, username)

        const price = Math.floor(Math.pow(player.inventorySize * 2, 3) + Math.pow(player.inventorySize * 9.59, 2))

        if (player.gold < price) return {
            error: `# You don't have enough gold to upgrade your backpack (${player.gold}/${price})`,
            instantReply: true
        }

        player.inventorySize += 1
        player.gold -= price

        const embed = new MessageEmbed()
            .setColor('#33ff33')
            .setTitle(`Player ${username} upgraded its backpack for ${price} gold!`)
            .setDescription(`New backpack size: ${player.inventorySize}\nCurrent gold balance after upgrade: ${player.gold}`)
        return {
            message: embed, /*`[ Player ${username} upgraded its backpack for ${price} gold! ]`
                + `\nNew backpack size: ${player.inventorySize}`
                + `\nCurrent gold balance after upgrade: ${player.gold}`,*/
            deleteUserMsg: true,
            instantReply: true
        }
    }

    static async generateSpell(channel, args) {
        const prompt = generatorService.getPrompt(
            generatorSpellBook,
            [
                {name: "bookName", value: args ? args.trim() : null},
                {name: "spellName"},
                {name: "description"},
            ],
            true
        )
        const result = await aiService.simpleEvalbot(prompt.completePrompt, 150, channel.startsWith("##"), stopToken)
        const object = generatorService.parseResult(generatorSpellBook, prompt.placeholderPrompt, result)

        return {
            message: JSON.stringify(object, null, 4),
            instantReply: true
        }
    }
}

export default DuckHuntService