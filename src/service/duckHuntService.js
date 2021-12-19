import aiService from "./aiService.js";
import utils from "../utils.js";

const generatorSpawnAnimal = utils.load("./data/generationPrompt/duckHunt-spawn-animal.json")
const generatorAttackAnimal = utils.load("./data/generationPrompt/duckHunt-attack-animal.json")

const stopToken = 224 // "⁂"

class DuckHuntService {
    static activePawn = null

    /**
     * Spawns a random animal/critter/enemy
     */
    static async spawn(channel, difficulty = null, name = null) {

        const prompt = this.getSpawnPrompt(true, difficulty, name)
        const result = await aiService.simpleEvalbot(prompt, 150, channel.startsWith("##"), stopToken)
        const completeResult = ((difficulty ? `DIFFICULTY: ${difficulty}\nNAME:` : 'NAME:') + result).replace('⁂', '').trim()

        const split = completeResult.split('\n')
        name = split.find(l => l.startsWith("NAME: "))?.replace("NAME: ", '')
        difficulty = split.find(l => l.startsWith("DIFFICULTY: "))?.replace("DIFFICULTY: ", '')
        const description = split.find(l => l.startsWith("DESCRIPTION: "))?.replace("DESCRIPTION: ", '')

        this.activePawn = {
            name,
            difficulty,
            description,
            alive: true
        }

        return `New Encounter!\nDifficulty: ${difficulty}\nName: ${name}\nDescription: ${description}`
    }

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
        } else {
            return list
                .map(m => `NAME: ${m.name}\nDIFFICULTY: ${m.difficulty}\nDESCRIPTION: ${m.description}\n`)
                .join('⁂\n') + `⁂\nNAME:`
        }
    }

    /**
     * Attack the current pawn
     */
    static async attack(channel, weapon = "Bare fists") {
        if (!this.activePawn) return null

        const prompt = this.getAttackPrompt(true, weapon)
        const result = await aiService.simpleEvalbot(prompt, 150, channel.startsWith("##"), stopToken)
        const completeResult = ('DESCRIPTION:' + result).replace('⁂', '').trim()

        const split = completeResult.split('\n')
        const description = split.find(l => l.startsWith("DESCRIPTION: "))?.replace("DESCRIPTION: ", '')
        const success = split.find(l => l.startsWith("SUCCESS: "))?.replace("SUCCESS: ", '')

        if (!this.activePawn.attacks) this.activePawn.attacks = []
        this.activePawn.attacks.push(description)


        if (success.toLowerCase() === "true") {
            this.activePawn.alive = false
            this.activePawn = null
        }

        return {
            description,
            success
        }
    }

    static getAttackPrompt(shuffle = false, weapon = "Bare fists") {
        if (!this.activePawn) return null

        const list = shuffle ? utils.shuffleArray(generatorAttackAnimal.list) : generatorAttackAnimal.list

        return list
            .map(m => `NAME: ${m.name}\nDIFFICULTY: ${m.difficulty}\nWEAPON: ${m.weapon}\nDESCRIPTION: ${m.description}\nSUCCESS: ${m.success}\n`)
            .join('⁂\n') + `⁂\nNAME: ${this.activePawn.name}\nDIFFICULTY: ${this.activePawn.difficulty}\nWEAPON: ${weapon}\nDESCRIPTION:`
    }

    /**
     * Generate a loot for that pawn
     */
    static loot() {

    }
}

export default DuckHuntService