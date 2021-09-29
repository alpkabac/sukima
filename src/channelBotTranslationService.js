require('dotenv').config()
const conf = require('../conf.json')
const fs = require('fs')

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
            //this.channelBotTranslations[channel] = JSON.parse(fs.readFileSync(__dirname.replace('\\src', '') + `\\translations\\aiPersonality\\${botName}/${code}.json`))
            this.channelBotTranslations[channel] = JSON.parse(JSON.stringify(require(`../translations/aiPersonality/${botName}/${code}.json`)))
            return true
        } catch (e) {
            try {
                //this.channelBotTranslations[channel] = fs.readFileSync(`../translations/aiPersonality/${botName}/${conf.defaultBotTranslationFile}.json`).toJSON()
                this.channelBotTranslations[channel] = JSON.parse(JSON.stringify(require(`../translations/aiPersonality/${botName}/${conf.defaultBotTranslationFile}.json`)))
            } catch (e2) {
                console.log(e2)
            }
            return false
        }
    }
}

console.log("##########################################################################################################")

module.exports = ChannelBotTranslationService