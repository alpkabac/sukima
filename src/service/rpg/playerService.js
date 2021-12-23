class Player {

    constructor() {
        this.weapon = null
        this.gold = 0
        this.inventory = []
        this.inventorySize = 1
    }
}

class PlayerService {
    static players = {}

    static getPlayer(channel, username) {
        if (!this.players[channel]) {
            this.players[channel] = {}
        }
        if (!this.players[channel][username]) this.players[channel][username] = new Player()
        return this.players[channel][username]
    }

    static equipWeapon(channel, username, weapon) {
        const player = this.getPlayer(channel, username)
        if (!player.weapon) {
            player.weapon = weapon
        }

    }
}

export default PlayerService