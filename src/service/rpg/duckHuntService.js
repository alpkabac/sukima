import utils from "../../utils.js";
import generatorService from "../generatorService.js";
import playerService from "./playerService.js";
import pawnService from "./pawnService.js";
import envService from "../../util/envService.js";
import worldItemsService from "./worldItemsService.js";
import {MessageAttachment, MessageEmbed} from "discord.js";
import axios from "axios";

const generatorAttackNew = utils.load("./data/generationPrompt/rpg2/attack.json")
const generatorEnemy = utils.load("./data/generationPrompt/rpg2/enemy.json")
const generatorSpellBook = utils.load("./data/generationPrompt/rpg/generateSpellBook.json")

const stopToken = 224 // "⁂"

let lastUploadedGenerator = null

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
                {name: "encounterDescription"},
            ]
        } else if (difficulty && !name) {
            args = [
                {name: "difficulty", value: difficulty},
                {name: "name"},
                {name: "encounterDescription"},
            ]
        } else if (!difficulty && name) {
            args = [
                {name: "name", value: name},
                {name: "difficulty"},
                {name: "encounterDescription"},
            ]
        } else {
            args = [
                {name: "name", value: name},
                {name: "difficulty", value: difficulty},
                {name: "encounterDescription"},
            ]
        }

        const object = generatorService.generator(generatorEnemy, args, channel.startsWith("##"))

        pawnService.createPawn(channel, object.name, object.difficulty, object.encounterDescription)

        return new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('New Encounter!')
            .setDescription(object.encounterDescription)
            .addFields(
                {name: 'Enemy name', value: object.name, inline: true},
                {name: 'Difficulty', value: object.difficulty, inline: true},
            )
    }

    /**
     * Attack the current pawn
     */
    static async attack(channel, username) {
        if (!pawnService.isPawnAliveOnChannel(channel)) return {
            error: `# ${username} tried to attack, but there is no enemy...`,
            deleteUserMsg: true
        }

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

        let weapon = "No Weapon"
        if (player.weapon) {
            weapon = player.weapon
        }

        let armor = "No Armor"
        if (player.armor) {
            armor = player.armor
        }

        const enemyStatus = `[ Name: ${pawn.name}; difficulty: ${pawn.difficulty}; wounds: ${pawn.wounds.length === 0 ? 'none' : [...new Set(pawn.wounds)].join(', ')}; blood loss: ${pawn.bloodLoss}; status: ${pawn.status} ]`

        const playerEquipment = `[ ${!weapon ? 'No Weapon' : weapon.name}; ${!armor ? 'No Armor' : armor.name}` + (player.accessory ? `; ${player.accessory.name}` : '') + ` ]`

        const args = [
            {name: "player", value: playerEquipment},
            {name: "enemy", value: enemyStatus},
            {name: "description"},
            {name: "wounds"},
            {name: "bloodLoss"},
            {name: "status"}
        ]
        const object = generatorService.generator(generatorAttackNew, args, channel.startsWith("##"))

        pawn.attacks.push({player: username, description: object.description})
        if (object.wounds && object.wounds.trim() && !["n/a", "no damage", "none", "undefined", "blocked", "spared", "missed", "failed attempt", "failed attempt (unsuccessful)", "0", "thrown", "nothing"].includes(object.wounds.trim().toLowerCase())) {
            const newWounds = [...new Set(object.wounds.toLowerCase().split(',').map(e => e.trim()))]
            if (newWounds instanceof Array && newWounds.length === 1) {
                pawn.wounds.push(newWounds[0])
            } else if (newWounds instanceof Array && newWounds.length > 1) {
                pawn.wounds.push(...newWounds)
            } else {
                pawn.wounds.push(newWounds.join(', '))
            }
        }

        if (object.bloodLoss && object.bloodLoss.trim()) {
            pawn.bloodLoss = object.bloodLoss
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
            .addField('New enemy wounds', object.wounds || 'undefined', true)
            .addField('New enemy blood loss', object.bloodLoss || 'undefined', true)
            .addField('New enemy status', object.status || 'undefined', true)
            .addField('All enemy wounds', [...new Set(pawn.wounds)].join('\n') || 'none', false)


        const embed = pawn.alive ? null : (await this.loot(channel))

        return {
            message: msg,
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
        const args = [
            {name: "name", value: pawn.name},
            {name: "difficulty", value: pawn.difficulty},
            {name: "item"},
            {name: "type"},
            {name: "rarity"},
        ]
        const object = generatorService.generator(generatorEnemy, args, channel.startsWith("##"))


        worldItemsService.appendItem(channel, {name: object.item, type: object.type, rarity: object.rarity})
        pawnService.removePawn(channel)

        const embed = new MessageEmbed()
            .setColor('#ffff66')
            .setTitle(`Loot for ${pawn.name} (difficulty: ${pawn.difficulty.toLowerCase()}): "${object.item}"`)
            .setDescription(`Looted item "${object.item}" is on the ground slot number [${worldItemsService.getActiveItems(channel).length - 1}]`)
            .addField("Item type", object.type, true)
            .addField("Item rarity", object.rarity, true)

        if (result) {
            return embed
        }
    }

    static take(channel, username, itemSlot) {
        const activeItems = worldItemsService.getActiveItems(channel)
        const itemSlotNotProvided = (!itemSlot.trim() && typeof itemSlot === "string")
        const itemSlotNumber = parseInt(itemSlot?.trim())

        if (activeItems.length === 0) return null

        const player = playerService.getPlayer(channel, username)

        const tookItem = playerService.takeItem(channel, username, itemSlotNotProvided ? activeItems[0] : activeItems[itemSlotNumber])
        if (tookItem) {
            activeItems.splice(itemSlotNotProvided ? 0 : itemSlotNumber, 1)
        }

        return tookItem ? player.inventory[player.inventory.length - 1] : tookItem
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

        if (!item) {
            player.inventory.splice(player.inventory.indexOf(item), 1)
            return {
                error: `# ${username} tried to drop an item but has no item in inventory slot [${itemSlotNumber}]`,
                instantReply: true,
                deleteUserMsg: true
            }
        }


        worldItemsService.appendItem(channel, item)
        player.inventory.splice(player.inventory.indexOf(item), 1)

        const embed = new MessageEmbed()
            .setColor('#888844')
            .setTitle(`Player ${username} drops the item "${item.name}" on the ground`)
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

        msg.setDescription(`${items.map((item, i) => `${i}: [${item.rarity} ${item.type}] "${item.name}"`).join('\n') || 'None'}`)

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
                `# ${username} tried to sell an item but has no item in its backpack`
                : `# ${username} tried to sell an item but has no item in inventory slot [${itemSlotNumber}]`,
            instantReply: true,
            deleteUserMsg: true
        }

        const args = [
            {name: "item", value: item.name},
            {name: "type", value: item.type},
            {name: "rarity", value: item.rarity},
            {name: "price"},
        ]
        const object = generatorService.generator(generatorEnemy, args, channel.startsWith("##"))

        // TODO: clean and generify
        const goldAmount = !object?.price ? 0 : parseInt(
            object?.price.replace("${" + generatorEnemy.placeholders[0][0] + "}", generatorEnemy.placeholders[0][1])
        )

        if (goldAmount && typeof goldAmount === "number" && !isNaN(goldAmount)) {
            player.gold += goldAmount
            if (itemSlotNotProvided) {
                player.weapon = null
            } else {
                player.inventory.splice(player.inventory.indexOf(item), 1)
            }
        } else {
            return {
                error: `# ${username} tried to sell an item but something went wrong with the AI generation (missing numerical value in result)\nFull result:\n\`\`\`${result}\`\`\``,
                instantReply: true,
                deleteUserMsg: true
            }
        }

        const embed = new MessageEmbed()
            .setColor('#ffff00')
            .setTitle(`Player ${username} sold the item "${item.name}" for ${goldAmount} gold!`)
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
            error: `# ${username} tried to equip an item but has no item in inventory slot [${itemSlotNumber}]`,
            instantReply: true,
            deleteUserMsg: true
        }

        if (!player.weapon) {
            player.weapon = player.inventory[itemSlotNumber]
            player.inventory.splice(player.inventory.indexOf(player.inventory[itemSlotNumber]), 1)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.weapon.name}" as weapon`)
                .setDescription(`Equipped "${player.weapon.name}" as weapon`)
                .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)

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
                .setTitle(`Player ${username} equips item "${player.weapon.name}" as weapon`)
                .setDescription(`${username} puts "${weapon.name}" into its backpack slot number [${player.inventory.length - 1}]`)
                .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
            return {
                success: true,
                message: embed,
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
            error: `# ${username} tried to equip an item but has no item in inventory slot [${itemSlotNumber}]`,
            instantReply: true,
            deleteUserMsg: true
        }

        if (!player.armor) {
            player.armor = player.inventory[itemSlotNumber]
            player.inventory.splice(player.inventory.indexOf(player.inventory[itemSlotNumber]), 1)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.armor.name}" as armor`)
                .setDescription(`Equipped "${player.armor.name}" as armor`)
                .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
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
                .setTitle(`Player ${username} equips item "${player.armor.name}" as armor`)
                .setDescription(`${username} puts "${armor.name}" into its backpack slot number [${player.inventory.length - 1}]`)
                .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
            return {
                success: true,
                message: embed,
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
            error: `# ${username} tried to equip an item but has no item in inventory slot [${itemSlotNumber}]`,
            instantReply: true,
            deleteUserMsg: true
        }

        if (!player.accessory) {
            player.accessory = player.inventory[itemSlotNumber]
            player.inventory.splice(player.inventory.indexOf(player.inventory[itemSlotNumber]), 1)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.accessory.name}" as accessory`)
                .setDescription(`Equipped "${player.accessory.name}" as accessory`)
                .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
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
                .setTitle(`Player ${username} equips item "${player.accessory.name}" as accessory`)
                .setDescription(`${username} puts "${accessory.name}" into its backpack slot number [${player.inventory.length - 1}]`)
                .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
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
                error: `# ${username} tried to unequip its weapon but doesn't have any!`,
                instantReply: true,
                deleteUserMsg: true
            }
        } else {
            if (player.inventory.length < player.inventorySize) {
                player.inventory.push(player.weapon)
                player.weapon = null

                const embed = new MessageEmbed()
                    .setColor('#665500')
                    .setTitle(`Player ${username} unequips weapon "${player.inventory[player.inventory.length - 1].name}"`)
                    .setDescription(`${username} puts item "${player.inventory[player.inventory.length - 1].name}" into its backpack slot number [${player.inventory.length - 1}]`)
                    .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                    .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                    .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
                return {
                    success: true,
                    message: embed,
                    deleteUserMsg: true,
                    instantReply: true
                }
            } else {
                return {
                    error: `# ${username} tried to unequip its weapon but doesn't have enough space in inventory!`,
                    instantReply: true,
                    deleteUserMsg: true
                }
            }

        }
    }

    static async unequipArmor(channel, username) {
        const player = playerService.getPlayer(channel, username)

        if (!player.armor) {
            return {
                error: `# ${username} tried to unequip its armor but doesn't have any!`,
                instantReply: true,
                deleteUserMsg: true
            }
        } else {
            if (player.inventory.length < player.inventorySize) {
                player.inventory.push(player.armor)
                player.armor = null
                const embed = new MessageEmbed()
                    .setColor('#665500')
                    .setTitle(`Player ${username} unequips armor "${player.inventory[player.inventory.length - 1].name}"`)
                    .setDescription(`${username} puts item "${player.inventory[player.inventory.length - 1].name}" into its backpack slot number [${player.inventory.length - 1}]`)
                    .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                    .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                    .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
                return {
                    success: true,
                    message: embed,
                    deleteUserMsg: true,
                    instantReply: true
                }
            } else {
                return {
                    error: `# ${username} tried to unequip its armor but doesn't have enough space in its backpack!`,
                    instantReply: true,
                    deleteUserMsg: true
                }
            }

        }
    }

    static async unequipAccessory(channel, username) {
        const player = playerService.getPlayer(channel, username)

        if (!player.accessory) {
            return {
                error: `# ${username} tried to unequip its accessory but doesn't have any!`,
                instantReply: true,
                deleteUserMsg: true
            }
        } else {
            if (player.inventory.length < player.inventorySize) {
                player.inventory.push(player.accessory)
                player.accessory = null
                const embed = new MessageEmbed()
                    .setColor('#665500')
                    .setTitle(`Player ${username} unequips accessory "${player.inventory[player.inventory.length - 1].name}"`)
                    .setDescription(`${username} puts item "${player.inventory[player.inventory.length - 1].name}" into its backpack slot number [${player.inventory.length - 1}]`)
                    .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                    .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                    .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
                return {
                    success: true,
                    message: embed,
                    deleteUserMsg: true,
                    instantReply: true
                }
            } else {
                return {
                    error: `# ${username} tried to unequip its accessory but doesn't have enough space in its backpack!`,
                    instantReply: true,
                    deleteUserMsg: true
                }
            }

        }
    }

    static async showInventory(channel, username) {
        const player = playerService.getPlayer(channel, username)
        const embed = new MessageEmbed()
            .setColor('#887733')
            .setTitle(`Inventory of Player ${username}`)
            .setDescription(`Backpack (${player.inventory.length}/${player.inventorySize}):${player.inventory.map((item, n) => `\n${n}: [${item.rarity} ${item.type}] "${item.name}"`).join(', ')}`)
            .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
            .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
            .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
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
            error: `# ${username} tried to upgrade its backpack but doesn't have enough gold! (${player.gold}/${price})`,
            instantReply: true,
            deleteUserMsg: true
        }

        player.inventorySize += 1
        player.gold -= price

        const newPrice = Math.floor(Math.pow(player.inventorySize * 2, 3) + Math.pow(player.inventorySize * 9.59, 2))

        const embed = new MessageEmbed()
            .setColor('#33ff33')
            .setTitle(`Player ${username} upgraded its backpack for ${price} gold!`)
            .setDescription(`New backpack size: ${player.inventorySize}\nCost of next upgrade: ${newPrice} gold\nCurrent gold balance after upgrade: ${player.gold}`)
        return {
            message: embed,
            deleteUserMsg: true,
            instantReply: true
        }
    }

    static async generateSpell(channel, args) {
        const object = generatorService.generator(generatorSpellBook, args, channel.startsWith("##"))

        return {
            message: JSON.stringify(object, null, 4),
            instantReply: true
        }
    }

    static async generator(channel, args, attachmentUrl) {
        if (!attachmentUrl && !lastUploadedGenerator) return {
            error: "# You need to upload a JSON generator file as attachment to your command"
        }

        let generator
        if (!lastUploadedGenerator || attachmentUrl) {
            generator = await getAttachment(attachmentUrl)
            lastUploadedGenerator = generator
        } else {
            generator = lastUploadedGenerator
        }
        let argsJSON
        try {
            argsJSON = !args ? null : JSON.parse(args.trim())
        } catch (e) {
            return {
                error: "# Invalid JSON",
                instantReply: true
            }
        }

        let json = []
        let nbResults = 1
        if (argsJSON) {
            for (let name in argsJSON) {
                if (name === 'nbResults') {
                    if (typeof argsJSON[name] === "string") {
                        argsJSON[name] = parseInt(argsJSON[name])
                    }
                    nbResults = Math.min(5, argsJSON[name])
                }
                if (name === "aiParameters") {
                    generator.aiParameters = argsJSON[name]
                } else if (name === "aiModel") {
                    generator.aiModel = argsJSON[name]
                } else if (name === "submodule") {
                    // TODO
                } else {
                    json.push({name, value: argsJSON[name]})
                }
            }
        }

        let properties = json.length > 0 ? json : generator["properties"]
        let results = []
        for (let i = 0; i < nbResults; i++) {
            let prompt = generatorService.getPrompt(
                generator,
                properties,
                true
            )

            if (generator.placeholders) {
                for (let placeholder of generator.placeholders) {
                    prompt.completePrompt = prompt.completePrompt.replace("${" + placeholder[0] + "}", placeholder[1])
                }
            }

            const result = await generatorService.executePrompt(generator, prompt.completePrompt, channel.startsWith("##"))
            const object = generatorService.parseResult(generator, prompt.placeholderPrompt, result)
            results.push(object)
        }

        const resultsJSONString = JSON.stringify(results, null, 1)

        const attachment = resultsJSONString.length < 2000 ? resultsJSONString : new MessageAttachment(Buffer.from(resultsJSONString), 'results.json')

        return {
            message: attachment,
            instantReply: true
        }
    }

    static async generatorPrompt(channel, args, attachmentUrl) {
        if (!attachmentUrl && !lastUploadedGenerator) return {
            error: "# You need to upload a JSON generator file as attachment to your command"
        }

        let generator
        if (!lastUploadedGenerator) {
            generator = await getAttachment(attachmentUrl)
            lastUploadedGenerator = generator
        } else {
            generator = lastUploadedGenerator
        }

        let argsJSON
        try {
            argsJSON = !args ? null : JSON.parse(args.trim())
        } catch (e) {
            return {
                error: "# Invalid JSON",
                instantReply: true
            }
        }

        let json = []
        if (argsJSON) {
            for (let name in argsJSON) {
                if (name !== 'nbResults') {
                    json.push({name, value: argsJSON[name]})
                }
            }
        }

        let properties = json.length > 0 ? json : generator["properties"]
        const prompt = generatorService.getPrompt(
            generator,
            properties,
            true
        )

        if (generator.placeholders) {
            for (let placeholder of generator.placeholders) {
                prompt.completePrompt = prompt.completePrompt.replace("${" + placeholder[0] + "}", placeholder[1])
            }
        }

        const attachment = new MessageAttachment(Buffer.from(prompt.completePrompt), 'generator.json')
        return {
            message: attachment,
            instantReply: true
        }
    }
}

async function getAttachment(attachmentUrl) {
    // fetch the file from the external URL
    const response = await axios.get(attachmentUrl);

    // if there was an error send a message with the status
    if (!response?.data)
        return

    // take the response stream and read it to completion
    return await response.data
}

export default DuckHuntService