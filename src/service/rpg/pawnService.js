import generatorService from "../generatorService.js";
import utils from "../../utils.js";
import envService from "../../util/envService.js";

const generatorEnemy = utils.fileExists(`./bot/${envService.getBotId()}/generator/enemy.json`) ?
    utils.loadJSONFile(`./bot/${envService.getBotId()}/generator/enemy.json`)
    : utils.loadJSONFile("./data/generator/rpg/enemy.json")

class Pawn {
    constructor(name, difficulty, description) {
        this.name = name;
        this.difficulty = difficulty;
        this.description = description;
        this.weapon = null
        this.armor = null
        this.accessory = null
        this.inventory = []
        this.gold = 0

        this.attacks = []
        this.health = {
            wounds: [],
            bloodLoss: 'none',
            status: "alive"
        }
        this.alive = true
        this.createdAt = Date.now()
    }
}

class PawnService {
    static activePawn = {}
    static lastPawnCreatedAt = {}
    static lastPawnKilledAt = {}

    static getActivePawn(channel) {
        if (this.activePawn[channel]) return this.activePawn[channel]
    }

    /**
     *
     * @param channel
     * @param name
     * @param difficulty
     * @param description
     */
    static createPawn(channel, name, difficulty, description) {
        this.activePawn[channel] = new Pawn(name, difficulty, description)
        this.lastPawnCreatedAt[channel] = Date.now()
        return this.activePawn[channel]
    }

    static async generatePawn(channel, name, difficulty, description){
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

        if (description !== null) {
            args = [
                {name: "encounterDescription", value: description},
                {name: "name"},
                {name: "difficulty"},
            ]
        }

        const {
            object,
            result,
            module
        } = await generatorService.generator(generatorEnemy, args, channel.startsWith("##"), "spawn")

        return new Pawn(object.name, object.difficulty, object.encounterDescription)
    }

    static isPawnAliveOnChannel(channel) {
        return this.activePawn[channel] && this.activePawn[channel].alive
    }

    static isPawnDeadOnChannel(channel) {
        return this.activePawn[channel] && !this.activePawn[channel].alive
    }

    static removePawn(channel) {
        delete this.activePawn[channel]
    }
}

export default PawnService