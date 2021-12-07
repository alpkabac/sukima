import {config} from "dotenv";

config()
import utils from "./utils.js";


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
            this.channelBotTranslations[channel] = utils.load(`./translations/aiPersonality/${botName}/${code}.json`)
            return true
        } catch (e) {
            try {
                this.channelBotTranslations[channel] = utils.load(`./translations/aiPersonality/${botName}/${process.env.TRANSLATION_FILE}.json`)
            } catch (e2) {
                this.channelBotTranslations[channel] = utils.load(`./translations/aiPersonality/CustomAI/en-EN.json`)
            }
            return false
        }
    }
}

export default PersonalityService