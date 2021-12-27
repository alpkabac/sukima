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

    static takeItem(channel, username, item){
        const player = this.getPlayer(channel, username)
        if (!player.weapon) {
            player.weapon = item
            return {equippedAsWeapon:true}
        }else{
            if (player.inventory.length < player.inventorySize){
                player.inventory.push(item)
                return {equippedAsWeapon:false}
            }else{
                return false
            }
        }
    }

    static equipWeapon(channel, username, weapon) {
        const player = this.getPlayer(channel, username)
        if (!player.weapon) {
            player.weapon = weapon
            return true
        }else{
            return false
        }
    }
}

export default PlayerService