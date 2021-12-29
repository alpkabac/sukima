import aiService from "../aiService.js";
import utils from "../../utils.js";
import generatorService from "../generatorService.js";
import playerService from "./playerService.js";
import pawnService from "./pawnService.js";
import envService from "../../util/envService.js";

const generatorSpawnAnimal = utils.load("./data/generationPrompt/rpg/spawn.json")
const generatorAttackAnimal = utils.load("./data/generationPrompt/rpg/attack.json")
const generatorAttackNew = utils.load("./data/generationPrompt/rpg/attackNew.json")
const generatorLootAnimal = utils.load("./data/generationPrompt/rpg/loot.json")
const generatorSell = utils.load("./data/generationPrompt/rpg/sell.json")
const generatorSpellBook = utils.load("./data/generationPrompt/rpg/generateSpellBook.json")

const stopToken = 224 // "⁂"

class DuckHuntService {
    static activeLoot = {}

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

        return `[ New Encounter! ]\nDifficulty: ${object.difficulty}\nName: ${object.name}\nDescription: ${object.description}`
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
                error: `You're still too tired to attack, please wait ${((1000 * envService.getRpgAttackCoolDown() - timeDiff) / 1000).toFixed(0)} seconds`,
                reactWith: '⌛'
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
        const prompt = generatorService.getPrompt(
            generatorAttackNew,
            [
                {name: "player", value: `[ weapon: ${weapon}; armor: ${armor} ]`},
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

        return {
            message: `[ Attack by ${username} ]\nEnemy current status: ${enemyStatus}\nAction description: ${object.description}\nNew enemy wounds: ${object.wounds}\nNew enemy status: ${object.status}`,
            reactWith: '⚔',
            deleteUserMsg: true
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

        this.activeLoot[channel] = object.loot
        pawnService.removePawn(channel)

        return object.loot
    }

    static take(channel, username) {
        if (!this.activeLoot[channel]) return null

        const player = playerService.getPlayer(channel, username)

        const tookItem = playerService.takeItem(channel, username, this.activeLoot[channel])
        if (tookItem) {
            this.activeLoot[channel] = null
        }

        return !tookItem ? false : {
            item: tookItem.equippedAsWeapon ? player.weapon : player.inventory[player.inventory.length - 1],
            equippedAsWeapon: tookItem.equippedAsWeapon
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
                `# You have no weapon to sell`
                : `# No item in inventory slot [${itemSlotNumber}]`
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

        return {
            success: true,
            message: `[ Player ${username} sold item "${item}" for ${goldAmount} gold! Total player gold: ${player.gold} ]`,
            deleteUserMsg: true
        }
    }

    static async equipWeapon(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        const itemSlotNotProvided = (!itemSlot && typeof itemSlot === "string")

        let itemSlotNumber
        if (itemSlotNotProvided && player.inventory.length !== 1) {
            return {
                error: "# You have to provide an inventory slot number for this command"
            }
        } else if (itemSlotNotProvided) {
            itemSlotNumber = 0
        }else{
            itemSlotNumber = parseInt(itemSlot)
        }

        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (item === null) return {
            error: `# No item in inventory slot [${itemSlotNumber}]`
        }

        if (!player.weapon) {
            player.weapon = player.inventory[itemSlotNumber]
            player.inventory.splice(player.inventory.indexOf(player.inventory[itemSlotNumber]), 1)
            return {
                success: true,
                message: `[ Player ${username} equips item "${player.weapon}" as weapon ]`,
                deleteUserMsg: true
            }
        } else {
            const weapon = player.weapon
            player.weapon = player.inventory[itemSlotNumber]
            player.inventory.splice(itemSlotNumber, 1)
            player.inventory.push(weapon)
            return {
                success: true,
                message: `[ Player ${username} equips item "${player.weapon}" as weapon and puts "${weapon}" into its backpack (slot [${player.inventory.length - 1}]) ]`,
                deleteUserMsg: true
            }
        }
    }

    static async equipArmor(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        const itemSlotNotProvided = (!itemSlot && typeof itemSlot === "string")

        let itemSlotNumber
        if (itemSlotNotProvided && player.inventory.length !== 1) {
            return {
                error: "# You have to provide an inventory slot number for this command"
            }
        } else if (itemSlotNotProvided) {
            itemSlotNumber = 0
        }else {
            itemSlotNumber = parseInt(itemSlot)
        }
        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (item === null) return {
            error: `# No item in inventory slot [${itemSlotNumber}]`
        }

        if (!player.armor) {
            player.armor = player.inventory[itemSlotNumber]
            player.inventory.splice(player.inventory.indexOf(player.inventory[itemSlotNumber]), 1)

            return {
                success: true,
                message: `[ Player ${username} equips item "${player.armor}" as armor ]`,
                deleteUserMsg: true
            }
        } else {
            const armor = player.armor
            player.armor = player.inventory[itemSlotNumber]
            player.inventory.splice(itemSlotNumber, 1)
            player.inventory.push(armor)
            return {
                success: true,
                message: `[ Player ${username} equips item "${player.armor}" as armor and puts "${armor}" into its backpack (slot [${player.inventory.length - 1}]) ]`,
                deleteUserMsg: true
            }
        }
    }

    static async showInventory(channel, username) {
        const player = playerService.getPlayer(channel, username)
        return {
            message: `[ Player ${username} ]`
                + `\nEquipped weapon: ${!player.weapon ? 'No weapon' : player.weapon}`
                + `\nEquipped armor: ${!player.armor ? 'No armor' : player.armor}`
                + `\nGold: ${player.gold}`
                + `\nBackpack size: ${player.inventorySize}`
                + `\nInventory: [ ${player.inventory.map((item, n) => `${n}: "${item}"`).join(', ')} ]`,
            deleteUserMsg: true
        }
    }

    static async upgradeBackpack(channel, username) {
        const player = playerService.getPlayer(channel, username)

        const price = Math.floor(Math.pow(player.inventorySize * 2, 3)+Math.pow(player.inventorySize * 9.59, 2))

        if (player.gold < price) return {
            error: `# You don't have enough gold to upgrade your backpack (${player.gold}/${price})`
        }

        player.inventorySize += 1
        player.gold -= price

        return {
            message: `[ Player ${username} upgraded its backpack for ${price} gold! ]`
                + `\nNew backpack size: ${player.inventorySize}`
                + `\nCurrent gold balance after upgrade: ${player.gold}`,
            deleteUserMsg: true
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

        return {message: JSON.stringify(object, null, 4)}
    }
}

export default DuckHuntService