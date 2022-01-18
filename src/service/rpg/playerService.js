class Player {
    constructor(username) {
        // Bot part
        if (process.env.BOTNAME === username) {
            this.weapon = {name: "Steel Longsword", rarity: "uncommon", type: "weapon"}
            this.armor = {name: "Copper Armor", rarity: "uncommon", type: "armor"}
            this.accessory = {name: "Gold Bracelet", rarity: "uncommon", type: "accessory"}
            this.inventorySize = 1
        }
        // Player part
        else {
            this.weapon = {name: "Old Rusty Kitchen Knife", rarity: "very common", type: "weapon"}
            this.armor = {name: "Ragged Loincloth", rarity: "very common", type: "clothing"}
            this.accessory = null
            this.inventorySize = 1
        }
        this.name = username

        this.gold = 0
        this.inventory = []
        this.health = {
            wounds: 'none',
            bloodLoss: 'none',
            status: 'healthy'
        }
    }
}

class PlayerService {
    static players = {}

    static getPlayer(channel, username) {
        if (!this.players[channel]) {
            this.players[channel] = {}
        }
        if (!this.players[channel][username]) this.players[channel][username] = new Player(username)
        return this.players[channel][username]
    }

    static getPlayerPrompt(player){
        const weapon = player.weapon?.name || 'No Weapon'
        const armor = player.armor?.name || 'No Armor'
        const accessory = player.accessory?.name || 'No Accessory'
        const playerLastInventoryItem = player.inventory[player.inventory.length-1]
        const backpackSelectedItem = `${playerLastInventoryItem?.name || 'none'}`
            + (!playerLastInventoryItem ? ``: ` (${playerLastInventoryItem.rarity} ${playerLastInventoryItem.type})`)
        return `[ Player: ${player.name}; weapon: ${weapon}; armor: ${armor}; accessory: ${accessory}; ${backpackSelectedItem}; wounds: ${player.health.wounds}; blood loss: ${player.health.bloodLoss}; status: ${player.health.status} ]`
    }

    static getEquipmentPrompt(player) {
        let weapon = "No Weapon"
        if (player.weapon) {
            weapon = player.weapon
        }

        let armor = "No Armor"
        if (player.armor) {
            armor = player.armor
        }

        const promptWeapon = `${!weapon ? 'No Weapon' : weapon.name}`
        const promptArmor = `${!armor ? 'No Armor' : armor.name}`
        const promptAccessory = player.accessory ? `; ${player.accessory.name}` : ''

        return `[ ${promptWeapon}; ${promptArmor}${promptAccessory} ]`
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