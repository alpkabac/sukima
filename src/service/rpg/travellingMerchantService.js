import generatorService from "../generatorService.js";
import playerService from "./playerService.js";
import {MessageAttachment, MessageEmbed} from "discord.js";
import utils from "../../utils.js";


class TravellingMerchantService {
    static merchantName = "TravellingMerchant"
    static lastMerchantTimestamps = {}
    static lastMerchantSpawnTryTimestamp = {}

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
            if (this.lastMerchantTimestamps[channel] &&
                Date.now() < this.lastMerchantTimestamps[channel] + (1000 * 60 * 60)
            ) return null

            if (this.lastMerchantSpawnTryTimestamp[channel]) {
                const timeDiff = Date.now() - this.lastMerchantSpawnTryTimestamp[channel]

                if (Math.random() > (timeDiff / 1000 / 60 / 60)) {
                    this.lastMerchantSpawnTryTimestamp[channel] = Date.now()
                    return null
                }
            } else {
                this.lastMerchantSpawnTryTimestamp[channel] = Date.now()
            }
            merchant = await this.spawnMerchant(channel)

            const embed = new MessageEmbed()
                .setColor('#ffff66')
                .setTitle(`The Travelling Merchant arrives!`)
                .setDescription(`The merchant currently has ${merchant.inventory.length} items to sell!\nHe will stay here for 10 minutes before leaving.\nCheck out what he has to sell with \`!shop\``)

            const buff = await utils.generatePicture(this.merchantName)
            if (buff) {
                const m = new MessageAttachment(buff, "generated_image.png")
                embed.attachFiles([m])
            }

            return embed
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

        merchant.timeout = Date.now() + (1000 * 60 * 10)
        this.lastMerchantTimestamps[channel] = Date.now()

        return merchant
    }


    static getMerchantName() {
        return this.merchantName
    }
}

export default TravellingMerchantService