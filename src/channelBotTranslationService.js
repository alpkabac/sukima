require('dotenv').config()
const conf = require('../conf.json')

class ChannelBotTranslationService {
    static channelBotTranslations = {}

    static getChannelBotTranslations(channel) {
        if (!this.channelBotTranslations[channel]) {
            this.changeChannelBotTranslations(channel)
        }
        return this.channelBotTranslations[channel]
    }

    static changeChannelBotTranslations(channel, code = conf.defaultBotTranslationFile, botName = process.env.BOTNAME) {
        try {
            this.channelBotTranslations[channel] = require(`../translations/aiPersonality/${botName}/${code}.json`)
            return true
        } catch (e) {
            try {
                this.channelBotTranslations[channel] = require(`../translations/aiPersonality/${botName}/${conf.defaultBotTranslationFile}.json`)
            } catch (e2) {
                console.log(e2)
            }
            return false
        }
    }
}

module.exports = ChannelBotTranslationService