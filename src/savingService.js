const personalityService = require('./personalityService')
const historyService = require('./historyService')
const memoryService = require('./memoryService')
const utils = require('./utils')

class SavingService {

    static save(channel) {
        const personality = personalityService.getChannelPersonality(channel)
        const history = historyService.getChannelHistory(channel)
        const memory = memoryService.getChannelMemory(channel)

        const filename = `./save/${channel}.json`
        const data = {
            personality,
            history,
            memory
        }

        utils.save(filename, data)
    }

    static load(channel) {

    }

}

module.exports = SavingService