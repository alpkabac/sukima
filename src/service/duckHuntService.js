import aiService from "./aiService.js";
import utils from "../utils.js";

const generatorSpawnAnimal = utils.load("./data/generationPrompt/duckHunt-spawn-animal.json")
const generatorAttackAnimal = utils.load("./data/generationPrompt/duckHunt-attack-animal.json")
const generatorLootAnimal = utils.load("./data/generationPrompt/duckHunt-loot-animal.json")

const stopToken = 224 // "⁂"

class DuckHuntService {
    static activePawn = {}
    static activeLoot = {}
    static playerWeapon = {}

    /**
     * Spawns a random animal/critter/enemy
     */
    static async spawn(channel, difficulty = null, name = null) {

        const prompt = this.getSpawnPrompt(true, difficulty, name)
        const result = await aiService.simpleEvalbot(prompt, 150, channel.startsWith("##"), stopToken)
        const completeResult = (
            (
                (difficulty && !name) ?
                    `DIFFICULTY: ${difficulty}\nNAME:`
                    : (difficulty && name) ?
                        `NAME: ${name}\nDIFFICULTY: ${difficulty}\nDESCRIPTION:`
                        : 'NAME:'
            )
            + result).replace('⁂', '').trim()

        const split = completeResult.split('\n')
        name = split.find(l => l.startsWith("NAME: "))?.replace("NAME: ", '')
        difficulty = split.find(l => l.startsWith("DIFFICULTY: "))?.replace("DIFFICULTY: ", '')
        const description = split.find(l => l.startsWith("DESCRIPTION: "))?.replace("DESCRIPTION: ", '')


        this.activePawn[channel] = {
            name,
            difficulty,
            description,
            alive: true
        }

        return `New Encounter!\nDifficulty: ${difficulty}\nName: ${name}\nDescription: ${description}`
    }

    // TODO: generify
    static getSpawnPrompt(shuffle = false, difficulty = null, name = null) {
        const list = shuffle ? utils.shuffleArray(generatorSpawnAnimal.list) : generatorSpawnAnimal.list
        if (difficulty && name) {
            return list
                .map(m => `NAME: ${m.name}\nDIFFICULTY: ${m.difficulty}\nDESCRIPTION: ${m.description}\n`)
                .join('⁂\n') + `⁂\nNAME: ${name}\nDIFFICULTY: ${difficulty}\nDESCRIPTION:`
        }
        if (difficulty) {
            return list
                .map(m => `DIFFICULTY: ${m.difficulty}\nNAME: ${m.name}\nDESCRIPTION: ${m.description}\n`)
                .join('⁂\n') + `⁂\nDIFFICULTY: ${difficulty}\nNAME:`
        }

        return list
            .map(m => `NAME: ${m.name}\nDIFFICULTY: ${m.difficulty}\nDESCRIPTION: ${m.description}\n`)
            .join('⁂\n') + `⁂\nNAME:`
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

        const prompt = this.getAttackPrompt(channel, true, weapon)
        const result = await aiService.simpleEvalbot(prompt, 150, channel.startsWith("##"), stopToken)
        const completeResult = ('DESCRIPTION:' + result).replace('⁂', '').trim()

        const split = completeResult.split('\n')
        const description = split.find(l => l.startsWith("DESCRIPTION: "))?.replace("DESCRIPTION: ", '')
        const success = split.find(l => l.startsWith("IS ENEMY DEAD: "))?.replace("IS ENEMY DEAD: ", '')

        if (!this.activePawn[channel].attacks) this.activePawn[channel].attacks = []
        this.activePawn[channel].attacks.push(description)

        if (success && success.toLowerCase() === "true") {
            this.activePawn[channel].alive = false
        }

        return {
            description,
            success
        }
    }

    // TODO: generify
    static getAttackPrompt(channel, shuffle = false, weapon = "Bare fists") {
        const list = shuffle ? utils.shuffleArray(generatorAttackAnimal.list) : generatorAttackAnimal.list

        return list
            .map(m => `NAME: ${m.name}\nDIFFICULTY: ${m.difficulty}\nWEAPON: ${m.weapon}\nDESCRIPTION: ${m.description}\nIS ENEMY DEAD: ${m.success}\n`)
            .join('⁂\n') + `⁂\nNAME: ${this.activePawn[channel].name}\nDIFFICULTY: ${this.activePawn[channel].difficulty}\nWEAPON: ${weapon}\nDESCRIPTION:`
    }

    /**
     * Generate a loot for that pawn
     */
    static async loot(channel) {
        if (!this.activePawn[channel] || this.activePawn[channel].alive) return null

        const prompt = this.getLootPrompt(channel, true)
        const result = await aiService.simpleEvalbot(prompt, 150, channel.startsWith("##"), stopToken)
        const completeResult = result.replace('⁂', '').trim()

        this.activeLoot[channel] = completeResult
        this.activePawn[channel] = null

        return completeResult
    }

    // TODO: generify
    static getLootPrompt(channel, shuffle = false) {
        const list = shuffle ? utils.shuffleArray(generatorLootAnimal.list) : generatorLootAnimal.list

        return list
            .map(m => `NAME: ${m.name}\nDIFFICULTY: ${m.difficulty}\nLOOT: ${m.loot}\n`)
            .join('⁂\n') + `⁂\nNAME: ${this.activePawn[channel].name}\nDIFFICULTY: ${this.activePawn[channel].difficulty}\nLOOT:`
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