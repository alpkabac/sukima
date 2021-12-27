import aiService from "../aiService.js";
import utils from "../../utils.js";
import generatorService from "../generatorService.js";
import playerService from "./playerService.js";
import pawnService from "./pawnService.js";

const generatorSpawnAnimal = utils.load("./data/generationPrompt/rpg/spawn.json")
const generatorAttackAnimal = utils.load("./data/generationPrompt/rpg/attack.json")
const generatorLootAnimal = utils.load("./data/generationPrompt/rpg/loot.json")
const generatorSell = utils.load("./data/generationPrompt/rpg/sell.json")

const stopToken = 224 // "⁂"

class DuckHuntService {
    static activePawn = {}
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

        return `New Encounter!\nDifficulty: ${object.difficulty}\nName: ${object.name}\nDescription: ${object.description}`
    }

    /**
     * Attack the current pawn
     */
    static async attack(channel, username) {
        if (!pawnService.isPawnAliveOnChannel(channel)) return {error: "# Nothing to attack..."}

        const player = playerService.getPlayer(channel, username)
        const pawn = pawnService.getActivePawn(channel)

        let weapon = "No weapon"
        if (player.weapon) {
            weapon = player.weapon
        }

        const prompt = generatorService.getPrompt(
            generatorAttackAnimal,
            [
                {name: "name", value: pawn.name},
                {name: "difficulty", value: pawn.difficulty},
                {name: "weapon", value: weapon},
                {name: "description"},
                {name: "success"}
            ],
            true
        )
        const result = await aiService.simpleEvalbot(prompt.completePrompt, 150, channel.startsWith("##"), stopToken)
        const object = generatorService.parseResult(generatorAttackAnimal, prompt.placeholderPrompt, result)

        pawn.attacks.push(object.description)

        if (object.success && object.success.toLowerCase() === "true") {
            pawn.alive = false
        }

        return (object.success && object.success.toLowerCase() === "true") ?
            {
                message: `[ Attack by ${username} ]\n${object.description}\nIs enemy dead? ${object.success}`,
                reactWith: ['⚔', '✓']
            }
            :
            {
                message: `[ Attack by ${username} ]\n${object.description}\nIs enemy dead? ${object.success}`,
                reactWith: ['⚔', '✓']
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
            message: `[ Player ${username} sold item "${item}" for ${goldAmount} gold! Total player gold: ${player.gold} ]`
        }
    }

    static async equip(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        const itemSlotNotProvided = (!itemSlot && typeof itemSlot === "string")

        if (itemSlotNotProvided) return {
            error: "# You have to provide an inventory slot number for this command"
        }

        const itemSlotNumber = parseInt(itemSlot)
        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (item === null) return {
            error: `# No item in inventory slot [${itemSlotNumber}]`
        }

        if (!player.weapon) {
            player.weapon = player.inventory[itemSlotNumber]

            return {
                success: true,
                message: `[ Player ${username} equips item "${player.weapon}" ]`
            }
        } else {
            const weapon = player.weapon
            player.weapon = player.inventory[itemSlotNumber]
            player.inventory.splice(itemSlotNumber, 1)
            player.inventory.push(weapon)
            return {
                success: true,
                message: `[ Player ${username} equips item "${player.weapon}" and puts "${weapon}" into its backpack (slot [${player.inventory.length - 1}]) ]`
            }
        }
    }

    static async showInventory(channel, username) {
        const player = playerService.getPlayer(channel, username)
        return {
            message: `[ Player ${username} ]`
                + `\nEquipped weapon: ${!player.weapon ? 'No weapon' : player.weapon}`
                + `\nGold: ${player.gold}`
                + `\nBackpack size: ${player.inventorySize}`
                + `\nInventory: [ ${player.inventory.map((item, n) => `${n}: "${item}"`).join(', ')} ]`
        }
    }

    static async upgradeBackpack(channel, username) {
        const player = playerService.getPlayer(channel, username)

        const price = (player.inventorySize * player.inventorySize) * 100

        if (player.gold < price) return {
            error: `You don't have enough gold (${player.gold}/${price})`
        }

        player.inventorySize += 1
        player.gold -= price

        return {
            message: `[ Player ${username} upgraded its backpack for ${price} gold! ]`
                + `\nNew backpack size: ${player.inventorySize}`
                + `\nCurrent gold balance after upgrade: ${player.gold}`
        }
    }
}

export default DuckHuntService