class Pawn {
    constructor(name, difficulty, description) {
        this.name = name;
        this.difficulty = difficulty;
        this.description = description;
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