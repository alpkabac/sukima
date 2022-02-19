import {config} from "dotenv";
import utils from "../utils.js";

config()


class PersonalityService {
    static channelBotPersonality = {}

    static getChannelPersonality(channel) {
        if (!this.channelBotPersonality[channel]) {
            this.changeChannelPersonality(channel)
        }
        return this.channelBotPersonality[channel]
    }

    static changeChannelPersonality(channel, code = process.env.TRANSLATION_FILE || "default") {
        try {
            this.channelBotPersonality[channel] = utils.loadJSONFile(`./bot/${process.env.BOT_ID}/${code}.personality`)
            return true
        } catch (e) {
            console.error("Personality file not found")
        }
    }
}

export default PersonalityService