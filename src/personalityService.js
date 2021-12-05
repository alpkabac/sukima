require('dotenv').config()

class PersonalityService {
    static channelBotTranslations = {}

    static getChannelPersonality(channel) {
        if (!this.channelBotTranslations[channel]) {
            this.changeChannelPersonality(channel)
        }
        return this.channelBotTranslations[channel]
    }

    static changeChannelPersonality(channel, code = process.env.TRANSLATION_FILE || "en-EN", botName = process.env.BOTNAME) {
        try {
            this.channelBotTranslations[channel] = JSON.parse(JSON.stringify(require(`../translations/aiPersonality/${botName}/${code}.json`)))
            return true
        } catch (e) {
            try {
                this.channelBotTranslations[channel] = JSON.parse(JSON.stringify(require(`../translations/aiPersonality/${botName}/${process.env.TRANSLATION_FILE}.json`)))
            } catch (e2) {
                this.channelBotTranslations[channel] = JSON.parse(JSON.stringify(require(`../translations/aiPersonality/CustomAI/en-EN.json`)))
            }
            return false
        }
    }
}

module.exports = PersonalityService