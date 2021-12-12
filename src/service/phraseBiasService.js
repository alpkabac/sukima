import {config} from "dotenv";

config()
import utils from "../utils.js";
import personalityService from "./personalityService.js";

class PhraseBiasService {
    static channelPhraseBiases = {}

    static getPhraseBiases(channel) {
        if (!channel) throw new Error("Channel argument is mandatory")

        if (this.channelPhraseBiases[channel]) {
            return this.channelPhraseBiases[channel]
        }

        const personality = personalityService.getChannelPersonality(channel)

        // load logit_bias_exp directly from personality
        if (personality && personality.logit_bias_exp) {
            this.channelPhraseBiases[channel] = personality.logit_bias_exp
            return this.channelPhraseBiases[channel]
        }

        // load phrase bias mappings from environment file
        if (process.env.LOAD_CHANNEL_PHRASE_BIASES_FILE) {
            this.loadChannelMappings(channel)
            return this.channelPhraseBiases[channel]
        }

        // load default phrase bias from environment file
        if (process.env.PHRASE_BIASES_FILE) {
            this.channelPhraseBiases[channel] = utils.load(`./data/phraseBias/${process.env.PHRASE_BIASES_FILE}.json`)
            return this.channelPhraseBiases[channel]
        }

        // load phrase bias files from personality
        if (personality && personality.phraseBiasFiles) {
            let phraseBiasFiles
            if (typeof personality.phraseBiasFiles === "string") {
                phraseBiasFiles = this.parsePhraseBiasFilesString(personality.phraseBiasFiles)
            } else if (personality.phraseBiasFiles instanceof Array) {
                phraseBiasFiles = personality.phraseBiasFiles
            }

            this.loadChannelPhraseBiasFiles(channel, phraseBiasFiles)
            return this.channelPhraseBiases[channel]
        }

        // load default phrase bias
        this.channelPhraseBiases[channel] = utils.load(`./data/phraseBias/default.json`)
        return this.channelPhraseBiases[channel]
    }

    static parsePhraseBiasFilesString(phraseBiasFilesString) {
        return phraseBiasFilesString   // ["end_of_text", "nsfw"]
            .split("+")                 // "end_of_text + nsfw"
            .map(f => f.trim())         // ["end_of_text ", " nsfw"]
    }

    static loadChannelPhraseBiasFiles(channel, phraseBiasFiles) {
        let allPhraseBiases = []
        for (let phraseBiasFile of phraseBiasFiles) {
            const phraseBias = utils.load(`./data/phraseBias/${phraseBiasFile}.json`)
            allPhraseBiases.concat(phraseBias)
        }
        this.channelPhraseBiases[channel] = allPhraseBiases
    }

    static loadChannelMappings(channel) {
        if (process.env.LOAD_CHANNEL_PHRASE_BIASES_FILE) {
            let channelSettings =
                process.env.LOAD_CHANNEL_PHRASE_BIASES_FILE         // "#alice-sfw: end_of_text + nsfw , #alice-nsfw:end_of_text"
                    .split(",")                             // ["#alice-sfw: end_of_text + nsfw ", " #alice-nsfw:end_of_text"]
                    .map(e => e.trim())                             // ["#alice-sfw: end_of_text + nsfw", "#alice-nsfw:end_of_text"]
                    .map(e => {
                        let [channelName, phraseBiasFiles] = e     // "#alice-sfw: end_of_text + nsfw"
                            .split(":")                     // ["#alice-sfw", " end_of_text + nsfw"]
                            .map(f => f.trim())                     // ["#alice-sfw", "end_of_text + nsfw"]

                        phraseBiasFiles = this.parsePhraseBiasFilesString(phraseBiasFiles)
                        return {channel: channelName, phraseBiasFiles: phraseBiasFiles} // {channel: "#alice-sfw", phraseBiasFiles: ["end_of_text", "nsfw"]}
                    })

            for (let channelSetting of channelSettings) {
                if (channel === channelSetting.channel) {
                    this.loadChannelPhraseBiasFiles(channelSetting.channel, channelSetting.phraseBiasFiles)
                    return
                }
            }
        }
    }
}

export default PhraseBiasService