class Pawn {
    name;
    difficulty;
    description;
    attacks;
    wounds;
    alive;
    createdAt;

    constructor(name, difficulty, description) {
        this.name = name;
        this.difficulty = difficulty;
        this.description = description;
        this.attacks = []
        this.wounds = []
        this.status = "alive"
        this.alive = true
        this.createdAt = Date.now()
    }
}

class PawnService {
    static activePawn = {}
    static lastPawnCreatedAt = {}

    static getActivePawn(channel) {
        if (this.activePawn[channel]) return this.activePawn[channel]
    }

    static createPawn(channel, name, difficulty, description) {
        this.activePawn[channel] = new Pawn(name, difficulty, description)
        this.lastPawnCreatedAt[channel] = Date.now()
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