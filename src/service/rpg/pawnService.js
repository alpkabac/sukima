class Pawn {
    name;
    difficulty;
    description;
    attacks;
    alive;

    constructor(name, difficulty, description) {
        this.name = name;
        this.difficulty = difficulty;
        this.description = description;
        this.attacks = []
        this.alive = true
    }
}

class PawnService {
    static activePawn = {}

    static getActivePawn(channel) {
        if (this.activePawn[channel]) return this.activePawn[channel]
    }

    static createPawn(channel, name, difficulty, description) {
        this.activePawn[channel] = new Pawn(name, difficulty, description)
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