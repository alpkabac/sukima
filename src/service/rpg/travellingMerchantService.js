import generatorService from "../generatorService.js";
import playerService from "./playerService.js";
import {MessageAttachment, MessageEmbed} from "discord.js";
import utils from "../../utils.js";


class TravellingMerchantService {
    static merchantName = "TravellingMerchant"
    static lastMerchantTimestamps = {}
    static merchantTimeBeforeRespawn = {}

    static async getSpell() {
        const args = [
            {name: "rarity"},
            {name: "type"},
            {name: "item"},
        ]
        const item = await generatorService.newWorkflow("spell", args)

        return {name: item.item, type: item.type, rarity: item.rarity}
    }

    /**
     *
     * @param item
     * @return {Promise<null|*>} returns null when item price couldn't be estimated
     */
    static async putPriceOnItem(item) {
        const args = [
            {name: "item", value: item.name},
            {name: "type", value: item.type || 'undefined type'},
            {name: "rarity", value: item.rarity || 'undefined rarity'},
            {name: "price"},
        ]
        const object = await generatorService.newWorkflow("spellPriceEstimation", args)

        let goldAmount = parseInt(
            object?.price?.trim().split(' ')[0]
        )

        if (!goldAmount || isNaN(goldAmount)) {
            return null
        }

        item.forSale = true
        item.playerPrice = goldAmount * 4
        return item
    }

    static async getPricedSpell() {
        let item = await this.getSpell()
        return await this.putPriceOnItem(item)
    }

    static async manageMerchant(channel) {
        let merchant = playerService.getPlayer(channel, this.merchantName, false)

        if (!merchant) {
            // Waits 10 minutes before trying to spawn (counted from merchant spawn)
            if (this.lastMerchantTimestamps[channel] && Date.now() < (this.lastMerchantTimestamps[channel] + (1000 * 60 * 10))) {
                return null
            }

            if (this.lastMerchantTimestamps[channel]
                && this.merchantTimeBeforeRespawn[channel]
                && Date.now() < (this.lastMerchantTimestamps[channel] + this.merchantTimeBeforeRespawn[channel])) {
                return null
            }

            return await this.spawnMerchant(channel)
        } else {
            if (Date.now() > merchant.timeout) {
                const embed = new MessageEmbed()
                    .setColor('#ffff66')
                    .setTitle(`The Travelling Merchant leaves...`)
                    .setDescription(`He will come back soon with more items to sell.`)

                delete playerService.players[channel][this.merchantName]
                return embed
            }
        }
    }

    static async spawnMerchant(channel) {
        const merchant = playerService.getPlayer(channel, this.merchantName, true)
        const minItemCount = 5
        const maxItemCount = 10
        const itemCount = Math.floor(Math.random() * (maxItemCount - minItemCount) + minItemCount)
        const promises = []
        for (let i = 0; i < itemCount; i++) {
            promises.push(this.getPricedSpell())
        }
        const items = await Promise.all(promises)
        merchant.inventorySize = maxItemCount

        for (let item of items) {
            if (item) {
                merchant.inventory.push(item)
            }
        }

        const embed = new MessageEmbed()
            .setColor('#ffff66')
            .setTitle(`The Travelling Merchant arrives!`)
            .setDescription(`The merchant currently has ${merchant.inventory.length} items to sell!\nHe will stay here for 10 minutes before leaving.\nCheck out what he has to sell with \`!shop\``)

        const buff = await utils.generatePicture("Dwarf Merchant")
        if (buff) {
            const m = new MessageAttachment(buff, "generated_image.png")
            embed.attachFiles([m])
        }

        const minTimeBeforeRespawn = 1000 * 60 * 20
        const maxTimeBeforeRespawn = 1000 * 60 * 40
        merchant.timeout = Date.now() + (1000 * 60 * 10)
        this.lastMerchantTimestamps[channel] = Date.now()
        this.merchantTimeBeforeRespawn[channel] = Math.floor(Math.random() * (maxTimeBeforeRespawn - minTimeBeforeRespawn) + minTimeBeforeRespawn)

        return embed
    }


    static getMerchantName() {
        return this.merchantName
    }
}

export default TravellingMerchantService