import {config} from "dotenv";

config()
import utils from "./utils.js";


class PersonalityService {
    static channelBotPersonality = {}

    static getChannelPersonality(channel) {
        if (!this.channelBotPersonality[channel]) {
            this.changeChannelPersonality(channel)
        }
        return this.channelBotPersonality[channel]
    }

    static changeChannelPersonality(channel, code = process.env.TRANSLATION_FILE || "en-EN", botName = process.env.BOTNAME) {
        try {
            this.channelBotPersonality[channel] = utils.load(`./translations/aiPersonality/${botName}/${code}.json`)
            return true
        } catch (e) {
            try {
                this.channelBotPersonality[channel] = utils.load(`./translations/aiPersonality/${botName}/${process.env.TRANSLATION_FILE}.json`)
            } catch (e2) {
                this.channelBotPersonality[channel] = utils.load(`./translations/aiPersonality/CustomAI/en-EN.json`)
            }
            return false
        }
    }
}

export default PersonalityService