class Player {
    constructor() {
        this.weapon = "Old Rusty Kitchen Knife"
        this.armor = "Ragged Loincloth"
        this.accessory = null
        this.gold = 0
        this.inventory = []
        this.inventorySize = 1
        this.lastAttackAt = null
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

    static takeItem(channel, username, item) {
        const player = this.getPlayer(channel, username)
        if (player.inventory.length < player.inventorySize) {
            player.inventory.push(item)
            return {equippedAsWeapon: false}
        } else {
            return false
        }
    }
}

export default PlayerService