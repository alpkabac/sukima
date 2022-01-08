class Player {
    constructor() {
        this.weapon = {name: "Old Rusty Kitchen Knife", rarity: "very common", type: "weapon"}
        this.armor = {name: "Ragged Loincloth", rarity: "very common", type: "clothing"}
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
        if (!item) return null
        const player = this.getPlayer(channel, username)
        if (player.inventory.length < player.inventorySize) {
            player.inventory.push(item)
            return true
        } else {
            return false
        }
    }
}

export default PlayerService