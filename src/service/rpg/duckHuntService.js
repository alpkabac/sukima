import utils from "../../utils.js";
import generatorService from "../generatorService.js";
import playerService from "./playerService.js";
import pawnService from "./pawnService.js";
import envService from "../../util/envService.js";
import worldItemsService from "./worldItemsService.js";
import {MessageAttachment, MessageEmbed} from "discord.js";

const generatorAttackNew = utils.load("./data/generator/rpg/attack.json")
const generatorEnemy = utils.load("./data/generator/rpg/enemyLight.json")
const generatorSpellBook = utils.load("./data/generationPrompt/rpg/generateSpellBook.json")

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

        const {
            object,
            result,
            module
        } = await generatorService.generator(generatorEnemy, args, channel.startsWith("##"), "spawn")

        pawnService.createPawn(channel, object.name, object.difficulty, object.encounterDescription)

        return {
            message: new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('New Encounter!')
                .setDescription(object.encounterDescription)
                .addFields(
                    {name: 'Enemy name', value: object.name, inline: true},
                    {name: 'Difficulty', value: object.difficulty, inline: true},
                ),
            pushIntoHistory: [`[ New Enemy Encounter: ${object.name} (${object.difficulty}) ]\nNarrator to the group: ${object.encounterDescription}`, null, channel],
            success: true,
            deleteUserMsg: true,
            instantReply: true
        }
    }

    /**
     * Attack the current pawn
     */
    static async attack(channel, username) {
        if (!pawnService.isPawnAliveOnChannel(channel)) return {
            message: `# ${username} tried to attack, but there is no enemy...`,
            deleteUserMsg: true,
            deleteNewMessage: username !== process.env.BOTNAME,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to attack, but there is no enemy yet... ]`, null, channel],
        }

        const player = playerService.getPlayer(channel, username)
        const timeDiff = Date.now() - player.lastAttackAt
        if (player.lastAttackAt && timeDiff < 1000 * envService.getRpgAttackCoolDown()) {
            return {
                message: `# ${username} tried to attack but is still too tired, ${username} will have to wait for ${((1000 * envService.getRpgAttackCoolDown() - timeDiff) / 1000).toFixed(0)} seconds to attack again`,
                reactWith: '⌛',
                deleteNewMessage: username !== process.env.BOTNAME,
                deleteUserMsg: true,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to attack but is still too tired, ${username} will have to wait for ${((1000 * envService.getRpgAttackCoolDown() - timeDiff) / 1000).toFixed(0)} seconds to attack again ]`, null, channel],
            }
        }

        const pawn = pawnService.getActivePawn(channel)


        const enemyWounds = pawn.wounds.length === 0 ? 'none' : [...new Set(pawn.wounds)].join(', ')
        const enemyStatus = `[ Enemy: ${pawn.name}; difficulty: ${pawn.difficulty}; wounds: ${enemyWounds}; blood loss: ${pawn.bloodLoss}; status: ${pawn.status} ]`
        const playerEquipment = playerService.getEquipmentPrompt(player)

        // Attack part
        const argsAttack = [
            {name: "player", value: playerEquipment},
            {name: "enemy", value: enemyStatus},
            {name: "description"}
        ]

        const {object: objectAttack} = await generatorService.generator(generatorAttackNew, argsAttack, channel.startsWith("##"), "attack")


        // Wounds part
        const argsWounds = [
            {name: "description", value: objectAttack.description},
            {name: "wounds"},
        ]

        const {object: objectWounds} = await generatorService.generator(generatorAttackNew, argsWounds, channel.startsWith("##"), "woundDetection")

        // Blood loss part
        const argsBloodLoss = [
            {name: "enemyCurrentBloodLoss", value: pawn.bloodLoss},
            {name: "description", value: objectAttack.description},
            {name: "wounds", value: objectWounds.wounds},
            {name: "bloodLoss"},
        ]

        const {object: objectBloodLoss} = await generatorService.generator(generatorAttackNew, argsBloodLoss, channel.startsWith("##"), "bloodLossDetection")

        // State part
        const argsStatus = [
            {name: "enemyCurrentWounds", value: pawn.wounds},
            {name: "enemyCurrentBloodLoss", value: pawn.bloodLoss},
            {name: "enemyCurrentStatus", value: pawn.status},
            {name: "description", value: objectAttack.description},
            {name: "wounds", value: objectWounds.wounds},
            {name: "status"},
        ]

        const {object: objectStatus} = await generatorService.generator(generatorAttackNew, argsStatus, channel.startsWith("##"), "statusDetection")

        pawn.attacks.push({player: username, description: objectAttack.description})

        const noDamageStrings = ["n/a", "no damage", "none", "undefined", "blocked", "spared", "missed", "failed attempt", "failed attempt (unsuccessful)", "0", "thrown", "nothing"]
        if (objectWounds.wounds && objectWounds.wounds.trim() && !noDamageStrings.includes(objectWounds.wounds.trim().toLowerCase())) {
            const newWounds = [...new Set(objectWounds.wounds.toLowerCase().split(',').map(e => e.trim()))]
            if (newWounds instanceof Array && newWounds.length === 1) {
                pawn.wounds.push(newWounds[0])
            } else if (newWounds instanceof Array && newWounds.length > 1) {
                pawn.wounds.push(...newWounds)
            } else {
                pawn.wounds.push(newWounds.join(', '))
            }
        }

        if (objectBloodLoss.bloodLoss && objectBloodLoss.bloodLoss.trim()) {
            pawn.bloodLoss = objectBloodLoss.bloodLoss
        }

        if (objectStatus.status && objectStatus.status.trim() && !["failed"].includes(objectStatus.status.trim().toLowerCase())) {
            pawn.status = objectStatus.status.toLowerCase()
        }

        if (objectStatus.status && objectStatus.status.trim() && ["dead", "killed", "died", "deceased"].includes(objectStatus.status.trim().toLowerCase())) {
            pawn.alive = false
        }

        player.lastAttackAt = Date.now()

        const msg = new MessageEmbed()
            .setColor('#ff0000')
            .setTitle(`${username} attacks the ${pawn.name} (${pawn.difficulty})`)
            .setDescription(`${objectAttack.description || 'undefined'}`)
            .addField('New enemy wounds', objectWounds.wounds || 'undefined', true)
            .addField('New enemy blood loss', objectBloodLoss.bloodLoss || 'undefined', true)
            .addField('New enemy status', objectStatus.status || 'undefined', true)
            .addField('All enemy wounds', [...new Set(pawn.wounds)].join('\n') || 'none', false)

        const {embed, pushIntoHistory} = pawn.alive ? {embed: null, pushIntoHistory: null} : (await this.loot(channel))

        if (!pawn.alive) {
            pawnService.lastPawnKilledAt[channel] = Date.now()
        }

        const historyMessage = (username !== process.env.BOTNAME ? "!attack\n" : '')
            + `[ ${username} attacks the ${pawn.name}! ]`
            + `\n[ Enemy new wound(s): ${objectWounds.wounds}; Enemy new status: ${objectStatus.status}${pawn.alive ? ' (not dead yet)' : ''} ]`
            + `\nNarrator to ${username}: ${objectAttack.description}`
            + (pawn.alive ? '' : `\n[ Enemy ${pawn.name} (${pawn.difficulty}) has been defeated! ]`)
            + (pushIntoHistory ? `\n${pushIntoHistory}` : '')

        return {
            pushIntoHistory: [historyMessage, username !== process.env.BOTNAME ? username : null, channel],
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
        const {
            object,
            result,
            module
        } = await generatorService.generator(generatorEnemy, args, channel.startsWith("##"), "loot")

        worldItemsService.appendItem(channel, {name: object.item, type: object.type, rarity: object.rarity})
        pawnService.removePawn(channel)

        const embed = new MessageEmbed()
            .setColor('#ffff66')
            .setTitle(`Loot for ${pawn.name} (${pawn.difficulty.toLowerCase()}): ${object.item} (${object.rarity} ${object.type})`)
            .setDescription(`Looted item "${object.item}" is on the ground slot number [${worldItemsService.getActiveItems(channel).length - 1}]`)
            .addField("Item type", object.type, true)
            .addField("Item rarity", object.rarity, true)

        if (object) {
            return {
                embed,
                pushIntoHistory: `[ Loot item falling on the ground for defeating ${pawn.name} (${pawn.difficulty.toLowerCase()}): ${object.item} (${object.rarity} ${object.type}) ]`
            }
        }
    }

    static take(channel, username, itemSlot) {
        const activeItems = worldItemsService.getActiveItems(channel)
        const fromBot = username === process.env.BOTNAME
        const itemSlotNotProvided = fromBot ? true : (!itemSlot?.trim() && typeof itemSlot === "string")
        const itemSlotNumber = itemSlotNotProvided ? activeItems.length - 1 : parseInt(itemSlot?.trim())

        const player = playerService.getPlayer(channel, username)

        const tookItem = playerService.takeItem(channel, username, activeItems[itemSlotNumber])
        if (tookItem) {
            activeItems.splice(itemSlotNumber, 1)
        }

        const item = tookItem ? player.inventory[player.inventory.length - 1] : tookItem

        if (item) {
            const embed = new MessageEmbed()
                .setColor('#884422')
                .setTitle(`Player ${username} takes the item "${item.name}"`)
                .setDescription(`${username} puts the item in its backpack slot number [${player.inventory.length - 1}]`)

            return {
                message: embed,
                success: true,
                deleteUserMsg: true,
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !take\n` : '') + `[ Player ${username} takes the item ${item.name} (${item.rarity} ${item.type}) from the ground and puts it in its backpack ]`, null, channel]
            }
        } else if (item === false) {
            return {
                message: `# ${username} tried to take an item, but its backpack is full. Try to \`!sell\` or \`!drop\` an item first, or \`!upgrade\` your backpack!!`,
                instantReply: true,
                deleteUserMsg: true,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to take an item, but its backpack is full. Try to "!sell" or "!drop" your backpack selected item first, or use "!upgradeBackpack"! ]`, null, channel]
            }
        }
        return {
            message: `# ${username} tried to take an item on the ground, but there is no item to grab...`,
            instantReply: true,
            deleteUserMsg: true,
            deleteNewMessage: username !== process.env.BOTNAME,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to take an item on the ground, but there is no item to grab... ]`, null, channel]
        }
    }

    static async drop(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)
        const fromBot = username === process.env.BOTNAME
        const itemSlotNotProvided = fromBot ? true : (!itemSlot?.trim() && typeof itemSlot === "string")
        const itemSlotNumber = itemSlotNotProvided ? player.inventory.length - 1 : parseInt(itemSlot?.trim())

        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (!item) {
            return {
                message: `# ${username} tried to drop an item but has no item in inventory slot [${itemSlotNumber}]`,
                instantReply: true,
                deleteUserMsg: true,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to drop an item from backpack but doesn't have any item! ]`, null, channel]
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
            message: embed,
            deleteUserMsg: true,
            instantReply: true,
            pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !drop\n` : '') + `[ Player ${username} drops the item ${item.name} (${item.rarity} ${item.type}) on the ground ]`, null, channel]
        }
    }

    static async look(channel, username) {
        const items = worldItemsService.getActiveItems(channel)

        const msg = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`Items on the ground`)

        msg.setDescription(`${items.map((item, i) => `${i}: [${item.rarity} ${item.type}] "${item.name}"`).join('\n') || 'None'}`)

        return {
            success: true,
            message: msg,
            deleteUserMsg: true,
            instantReply: true,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Item on the ground: ${items[items.length - 1]?.name || 'none'} ]`, null, channel]
        }
    }

    static async sell(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        const itemSlotNotProvided = username === process.env.BOTNAME ? true : (!itemSlot && typeof itemSlot === "string")

        const itemSlotNumber = itemSlotNotProvided ? player.inventory.length - 1 : parseInt(itemSlot)
        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (!item || !item.name || !item.type || !item.rarity) {
            const message = itemSlotNumber < 0 ?
                `# ${username} tried to sell an item but has no item in its backpack`
                : `# ${username} tried to sell an item but has no item in inventory slot [${itemSlotNumber}]`
            return {
                message,
                instantReply: true,
                deleteUserMsg: true,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Player ${username} tried to sell an item but has no item in its backpack! ]`, null, channel]
            }
        }

        const args = [
            {name: "item", value: item.name},
            {name: "type", value: item.type},
            {name: "rarity", value: item.rarity},
            {name: "price"},
        ]
        const {
            object,
            result,
            module
        } = await generatorService.generator(generatorEnemy, args, channel.startsWith("##"), "sell")

        const goldAmount = !object?.price ? null : parseInt(
            object.price.replace(module.placeholders["currency"], '').trim()
        )

        if (goldAmount && typeof goldAmount === "number" && !isNaN(goldAmount)) {
            player.gold += goldAmount
            player.inventory.splice(player.inventory.indexOf(item), 1)
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
            message: embed,
            deleteUserMsg: true,
            instantReply: true,
            pushIntoHistory: [
                (username !== process.env.BOTNAME ? `${username}: !sell\n` : '') + `[ Player ${username} sold the item ${item.name} (${item.rarity} ${item.type}) for ${goldAmount} gold! ]`,
                null,
                channel
            ]
        }
    }

    static async equipItem(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        let itemSlotNumber
        if (!itemSlot?.trim()) {
            itemSlotNumber = player.inventory.length - 1
        } else {
            itemSlotNumber = parseInt(itemSlot)
            if (isNaN(itemSlotNumber)) {
                itemSlotNumber = player.inventory.length - 1
            }
        }

        const item = player.inventory[itemSlotNumber] || null

        if (!item) return {
            error: `# ${username} tried to equip an item but has no item in inventory slot [${itemSlotNumber}]`,
            instantReply: true,
            deleteUserMsg: true
        }

        const ITEM_CATEGORIES = {
            weapon: ["weapon"],
            armor: ["armor", "clothing"],
            accessory: ["accessory"]
        }

        let itemCategory = null
        for (let c in ITEM_CATEGORIES) {
            if (item.type.toLowerCase().includes(ITEM_CATEGORIES[c])) {
                itemCategory = c
                break
            }
        }

        if (itemCategory === null) throw new Error("Null category")

        if (itemCategory === "weapon") {

        } else if (itemCategory === "armor") {

        } else if (itemCategory === "accessory") {

        }
    }

    static async equipWeapon(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        let itemSlotNumber
        if (!itemSlot || !itemSlot.trim() || username === process.env.BOTNAME) {
            itemSlotNumber = player.inventory.length - 1
        } else {
            itemSlotNumber = parseInt(itemSlot)
        }

        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (!item) return {
            message: `# ${username} tried to equip an item but has no item in inventory slot [${itemSlotNumber}]`,
            instantReply: true,
            deleteUserMsg: true,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Player ${username} tried to equip a weapon but has no item in its backpack! ]`, null, channel]

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
                message: embed,
                deleteUserMsg: true,
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !equipWeapon\n` : '') + `[ Player ${username} equips item ${player.weapon.name} (${item.rarity} ${item.type}) as weapon ]`, null, channel]
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
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !equipWeapon\n` : '') + `[ Player ${username} equips item ${player.weapon.name} (${item.rarity} ${item.type}) as weapon and puts previous weapon ${weapon.name} into its backpack ]`, null, channel]
            }
        }
    }

    static async equipArmor(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)


        let itemSlotNumber
        if (!itemSlot || !itemSlot.trim() || username === process.env.BOTNAME) {
            itemSlotNumber = player.inventory.length - 1
        } else {
            itemSlotNumber = parseInt(itemSlot)
        }
        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (!item) return {
            message: `# ${username} tried to equip an item but has no item in inventory slot [${itemSlotNumber}]`,
            instantReply: true,
            deleteUserMsg: true,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Player ${username} tried to equip an armor but has no item in its backpack! ]`, null, channel]
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
                message: embed,
                deleteUserMsg: true,
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !equipArmor\n` : '') + `[ Player ${username} equips item ${player.armor.name} (${item.rarity} ${item.type}) as armor ]`, null, channel]
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
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !equipArmor\n` : '') + `[ Player ${username} equips item ${player.armor.name} (${item.rarity} ${item.type}) as armor and puts previous armor ${armor.name} into its backpack ]`, null, channel]
            }
        }
    }

    static async equipAccessory(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)


        let itemSlotNumber
        if (!itemSlot || !itemSlot.trim() || username === process.env.BOTNAME) {
            itemSlotNumber = player.inventory.length - 1
        } else {
            itemSlotNumber = parseInt(itemSlot)
        }
        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (!item) return {
            message: `# ${username} tried to equip an item but has no item in inventory slot [${itemSlotNumber}]`,
            instantReply: true,
            deleteUserMsg: true,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Player ${username} tried to equip an accessory but has no item in its backpack! ]`, null, channel]
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
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !equipAccessory\n` : '') + `[ Player ${username} equips item ${player.accessory.name} (${item.rarity} ${item.type}) as accessory ]`, null, channel]
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
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !equipAccessory\n` : '') + `[ Player ${username} equips item ${player.accessory.name} (${item.rarity} ${item.type}) as accessory and puts previous accessory ${accessory.name} into its backpack ]`, null, channel]
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
                    instantReply: true,
                    pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !unequipWeapon\n` : '') + `[ Player ${username} unequips weapon "${player.inventory[player.inventory.length - 1].name}" (${player.inventory[player.inventory.length - 1].rarity} ${player.inventory[player.inventory.length - 1].type}) ]`, null, channel]
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
                    instantReply: true,
                    pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !unequipArmor\n` : '') + `[ Player ${username} unequips armor "${player.inventory[player.inventory.length - 1].name}" (${player.inventory[player.inventory.length - 1].rarity} ${player.inventory[player.inventory.length - 1].type}) ]`, null, channel]
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
                    instantReply: true,
                    pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !unequipAccessory\n` : '') + `[ Player ${username} unequips accessory "${player.inventory[player.inventory.length - 1].name}" (${player.inventory[player.inventory.length - 1].rarity} ${player.inventory[player.inventory.length - 1].type}) ]`, null, channel]
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
            instantReply: true,
            pushIntoHistory: [
                (username !== process.env.BOTNAME ? `${username}: !inventory\n` : '')
                + `[ Inventory of Player ${username};`
                + ` backpack used space: (${player.inventory.length}/${player.inventorySize}); `
                + ` backpack selected item: ${player.inventory[player.inventory.length]?.name || 'none'}; `
                + `weapon: ${!player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`}; `
                + `armor: ${!player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`}; `
                + `accessory: ${!player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`} `
                + `]`,
                null,
                channel
            ]
        }
    }

    static async upgradeBackpack(channel, username) {
        const player = playerService.getPlayer(channel, username)

        const price = Math.floor(Math.pow(player.inventorySize * 2, 3) + Math.pow(player.inventorySize * 9.59, 2))

        if (player.gold < price) return {
            message: `# ${username} tried to upgrade its backpack but doesn't have enough gold! (${player.gold}/${price})`,
            instantReply: true,
            deleteUserMsg: true,
            deleteNewMessage: username !== process.env.BOTNAME,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Player ${username} tried to upgrade its backpack but doesn't have enough gold! (${player.gold}/${price}) ]`, null, channel]
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
            instantReply: true,
            pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !upgradeBackpack\n` : '') + `[ Player ${username} upgraded its backpack for ${price} gold! ]`, null, channel]
        }
    }

    static async generateSpell(channel, args) {
        const {
            object,
            result,
            module
        } = await generatorService.generator(generatorSpellBook, args, channel.startsWith("##"))

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
            generator = await utils.getAttachment(attachmentUrl)
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
        let submoduleName = null
        if (argsJSON) {
            for (let name in argsJSON) {
                if (name === 'nbResults') {
                    if (typeof argsJSON[name] === "string") {
                        argsJSON[name] = parseInt(argsJSON[name])
                    }
                    nbResults = Math.min(5, argsJSON[name])
                } else if (name === "aiParameters") {
                    generator.aiParameters = argsJSON[name]
                } else if (name === "aiModel") {
                    generator.aiModel = argsJSON[name]
                } else if (name === "submodule") {
                    submoduleName = argsJSON[name]
                } else {
                    json.push({name, value: argsJSON[name]})
                }
            }
        }

        let properties
        if (submoduleName && generator.submodules?.[submoduleName]?.properties) {
            properties = generator.submodules?.[submoduleName]?.properties?.map(p => {
                return {name: p.name}
            })
            for (let element of json) {
                if (element.value) {
                    const property = properties.find(p => p.name === element.name)
                    if (property) {
                        property.value = element.value
                    }
                }
            }
        } else {
            properties = json.length > 0 ? json : generator["properties"]
        }

        let results = []
        for (let i = 0; i < nbResults; i++) {
            const {
                object,
                result,
                module
            } = await generatorService.generator(generator, properties, channel.startsWith("##"), submoduleName)
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
            generator = await utils.getAttachment(attachmentUrl)
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

        const attachment = utils.getMessageAsFile(prompt.completePrompt, 'generator.json')
        return {
            message: attachment,
            instantReply: true
        }
    }

    static async fallback(channel, command, msg) {
        return {
            message: `# Command \`${msg}\` isn't implemented yet!`,
            instantReply: true
        }
    }
}


export default DuckHuntService