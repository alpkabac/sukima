import aiService from "../aiService.js";
import utils from "../../utils.js";
import generatorService from "../generatorService.js";

const generatorSpawnAnimal = utils.load("./data/generationPrompt/rpg/spawn.json")
const generatorAttackAnimal = utils.load("./data/generationPrompt/rpg/attack.json")
const generatorLootAnimal = utils.load("./data/generationPrompt/rpg/loot.json")

const stopToken = 224 // "⁂"

class DuckHuntService {
    static activePawn = {}
    static activeLoot = {}
    static playerWeapon = {}

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
        console.log("object", object)

        this.activePawn[channel] = {
            name: object.name,
            difficulty:object.difficulty,
            description: object.desc,
            alive: true
        }

        return `New Encounter!\nDifficulty: ${object.difficulty}\nName: ${object.name}\nDescription: ${object.description}`
    }

    /**
     * Attack the current pawn
     */
    static async attack(channel, username) {
        if (!this.activePawn[channel] || !this.activePawn[channel].alive) return null

        let weapon = "Bare hands"
        if (this.playerWeapon[channel]) {
            if (this.playerWeapon[channel][username]) {
                weapon = this.playerWeapon[channel][username]
            }
        }

        const prompt = generatorService.getPrompt(
            generatorAttackAnimal,
            [
                {name: "name", value: this.activePawn[channel].name},
                {name: "difficulty", value: this.activePawn[channel].difficulty},
                {name: "weapon", value: weapon},
                {name: "description"},
                {name: "success"}
            ],
            true
        )
        const result = await aiService.simpleEvalbot(prompt.completePrompt, 150, channel.startsWith("##"), stopToken)
        const object = generatorService.parseResult(generatorAttackAnimal, prompt.placeholderPrompt, result)
        console.log("object", object)

        if (!this.activePawn[channel].attacks) this.activePawn[channel].attacks = []
        this.activePawn[channel].attacks.push(object.description)

        if (object.success && object.success.toLowerCase() === "true") {
            this.activePawn[channel].alive = false
        }

        return {
            description: object.description,
            success: object.success
        }
    }

    /**
     * Generate a loot for that pawn
     */
    static async loot(channel) {
        if (!this.activePawn[channel] || this.activePawn[channel].alive) return null

        const prompt = generatorService.getPrompt(
            generatorLootAnimal,
            [
                {name: "name", value: this.activePawn[channel].name},
                {name: "difficulty", value: this.activePawn[channel].difficulty},
                {name: "loot"},
            ],
            true
        )
        const result = await aiService.simpleEvalbot(prompt.completePrompt, 150, channel.startsWith("##"), stopToken)
        const object = generatorService.parseResult(generatorLootAnimal, prompt.placeholderPrompt, result)
        console.log("object", object)

        this.activeLoot[channel] = object.loot
        this.activePawn[channel] = null

        return object.loot
    }

    static async pick(channel, username) {
        if (!this.activeLoot[channel]) return null

        if (!this.playerWeapon[channel]) {
            this.playerWeapon[channel] = {}
        }
        this.playerWeapon[channel][username] = this.activeLoot[channel]

        this.activeLoot[channel] = null

        return this.playerWeapon[channel][username]
    }
}

export default DuckHuntService