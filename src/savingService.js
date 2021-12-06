const personalityService = require('./personalityService')
const historyService = require('./historyService')
const memoryService = require('./memoryService')
const utils = require('./utils')
const fs = require("fs");

class SavingService {

    static save(channel) {
        // Prevents saving DMs
        if (channel.startsWith("##")) return false
        const personality = personalityService.getChannelPersonality(channel)
        const history = historyService.getChannelHistory(channel)
        const memory = memoryService.getChannelMemory(channel)

        const filename = `./save/${process.env.BOTNAME}/${channel}.json`
        const data = {
            personality,
            history,
            memory
        }

        try {
            fs.mkdirSync(`./save/${process.env.BOTNAME}`)
        } catch (e) {

        }

        try {
            utils.save(filename, JSON.stringify(data, null, 4))
            return true
        } catch (e) {
            console.log(e)
        }
    }

    static load(channel) {
        try {
            const {personality, history, memory} = utils.load(`./save/${process.env.BOTNAME}/${channel}.json`)
            if (personality) {
                personalityService.channelBotTranslations[channel] = personality
            }
            if (history) {
                historyService.channelHistories[channel] = history
            }
            if (memory) {
                memoryService.channelMemories[channel] = memory
            }
            if (personality && history && memory)
                return true
        } catch (e) {
            console.log(e)
        }

        return false
    }

    static loadAllChannels(){
        try {
            const channelFiles = fs.readdirSync(`./save/${process.env.BOTNAME}`)
            if (channelFiles) {
                for (let channelFile of channelFiles) {
                    SavingService.load(channelFile.replace('.json', ''))
                }
            }
        }catch(e){

        }
    }

}

module.exports = SavingService