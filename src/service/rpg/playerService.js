class Player {
    constructor(username) {
        this.name = username
        this.gender = null

        this.health = {
            wounds: [],
            bloodLoss: 'none',
            status: 'healthy'
        }

        this.weapon = null
        this.armor = null
        this.accessory = null
        this.heal = null

        this.gold = 0
        this.inventory = []
        this.inventorySize = 1
    }
}

const STATUS_DEAD = ["dead", "killed", "died", "deceased", "destroyed", "obliterated", "annihilated", "total destruction", "disintegrated", "dissolved"]


class PlayerService {
    static players = {}

    static isDead(channel, player) {
        return this.players[channel] && this.players[channel][player] && !STATUS_DEAD.includes(this.players[channel][player]?.health?.status?.toLowerCase())
    }

    static getPlayer(channel, username, createIfAbsent = true) {
        if (!this.players[channel]) {
            this.players[channel] = {}
        }
        if (createIfAbsent && !this.players[channel][username]) this.players[channel][username] = new Player(username)
        return this.players[channel][username]
    }

    static getPlayerPrompt(player) {
        const weapon = player.weapon ? `${player.weapon.name} (${player.weapon.rarity} ${player.weapon.type})` : 'No Weapon'
        const armor = player.armor ? `${player.armor.name} (${player.armor.rarity} ${player.armor.type})` : 'No Armor'
        const accessory = player.accessory ? `${player.accessory.name} (${player.accessory.rarity} ${player.accessory.type})` : 'No Accessory'
        const heal = player.heal ? `${player.heal.name} (${player.heal.rarity} ${player.heal.type})` : 'No Heal'
        const playerLastInventoryItem = player.inventory[player.inventory.length - 1]
        const backpackSelectedItem = `${playerLastInventoryItem?.name || 'none'}`
            + (!playerLastInventoryItem ? `` : ` (${playerLastInventoryItem.rarity} ${playerLastInventoryItem.type})`)
        return `[ Player: ${player.name}; gender: ${player.gender || "unspecified"}; race: human; weapon: ${weapon}; armor: ${armor}; accessory: ${accessory}; heal: ${heal}; selectable item in backpack: ${backpackSelectedItem}; wounds: ${player.health.wounds}; blood loss: ${player.health.bloodLoss}; status: ${player.health.status} ]`
    }

    static getItemPrompt(item) {
        return `${item.name} (${item.rarity} ${item.type})`
    }

    static getEquipmentPrompt(player, healMode = false) {
        return `[ ${this.getEquipmentString(player, healMode)} ]`
    }

    static getEquipmentString(player, healMode = false) {
        let weapon = player.weapon || {
            name: "None",
            type: "weapon",
            rarity: "no"
        }

        if (healMode) {
            weapon = player.heal || {
                name: "None",
                type: "heal",
                rarity: "no"
            }
        }

        const promptWeapon = PlayerService.getItemPrompt(weapon)
        const promptArmor = healMode ? '' : player.armor ? `; ${PlayerService.getItemPrompt(player.armor)}` : ''
        const promptAccessory = healMode ? '' : player.accessory ? `; ${PlayerService.getItemPrompt(player.accessory)}` : ''

        return `${promptWeapon}${promptArmor}${promptAccessory}`
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