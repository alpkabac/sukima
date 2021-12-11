import {config} from "dotenv";

config()
import utils from "../utils.js";
import personalityService from "./personalityService.js";


class BannedTokensService {
    static channelBannedTokens = {}

    static getBannedTokens(channel) {
        if (!channel) throw new Error("Channel argument is mandatory")

        if (this.channelBannedTokens[channel]) {
            return this.channelBannedTokens[channel]
        }

        const personality = personalityService.getChannelPersonality(channel)

        if (personality && personality.bannedTokenFiles) {
            let bannedTokenFiles
            if (typeof personality.bannedTokenFiles === "string") {
                bannedTokenFiles = this.parseBannedTokenFilesString(personality.bannedTokenFiles)
            } else if (personality.bannedTokenFiles?.length > 0) {
                bannedTokenFiles = personality.bannedTokenFiles
            } else {
                throw new Error("Whoops, shouldn't happen, contact Noli!")
            }

            this.loadChannelBannedTokenFiles(channel, bannedTokenFiles)
            return this.channelBannedTokens[channel]
        }

        if (process.env.LOAD_CHANNEL_BANNED_TOKENS_FILE) {
            this.loadChannelMappings(channel)
            return this.channelBannedTokens[channel]
        }

        if (process.env.BANNED_TOKENS_FILE) {
            this.channelBannedTokens[channel] = utils.load(`./data/bannedTokens/${process.env.BANNED_TOKENS_FILE}`)
            return this.channelBannedTokens[channel]
        }

        this.channelBannedTokens[channel] = utils.load(`./data/bannedTokens/default.json`)
        return this.channelBannedTokens[channel]
    }

    static parseBannedTokenFilesString(bannedTokenFilesString) {
        return bannedTokenFilesString   // ["end_of_text", "nsfw"]
            .split("+")                 // "end_of_text + nsfw"
            .map(f => f.trim())         // ["end_of_text ", " nsfw"]
    }

    static loadChannelBannedTokenFiles(channel, bannedTokenFiles) {
        let allBannedTokens = []
        for (let bannedTokenFile of bannedTokenFiles) {
            const bannedTokens = utils.load(`./data/bannedTokens/${bannedTokenFile}.json`)
            allBannedTokens.concat(bannedTokens)
        }
        this.channelBannedTokens[channel] = allBannedTokens
    }

    static loadChannelMappings(channel) {
        if (process.env.LOAD_CHANNEL_BANNED_TOKENS_FILE) {
            let channelSettings =
                process.env.LOAD_CHANNEL_BANNED_TOKENS_FILE         // "#alice-sfw: end_of_text + nsfw , #alice-nsfw:end_of_text"
                    .split(",")                             // ["#alice-sfw: end_of_text + nsfw ", " #alice-nsfw:end_of_text"]
                    .map(e => e.trim())                             // ["#alice-sfw: end_of_text + nsfw", "#alice-nsfw:end_of_text"]
                    .map(e => {
                        let [channelName, bannedTokenFiles] = e     // "#alice-sfw: end_of_text + nsfw"
                            .split(":")                     // ["#alice-sfw", " end_of_text + nsfw"]
                            .map(f => f.trim())                     // ["#alice-sfw", "end_of_text + nsfw"]

                        bannedTokenFiles = this.parseBannedTokenFilesString(bannedTokenFiles)
                        return {channel: channelName, bannedTokenFiles} // {channel: "#alice-sfw", bannedTokenFiles: ["end_of_text", "nsfw"]}
                    })

            for (let channelSetting of channelSettings) {
                if (channel === channelSetting.channel) {
                    this.loadChannelBannedTokenFiles(channelSetting.channel, channelSetting.bannedTokenFiles)
                    return
                }
            }
        }
    }
}

export default BannedTokensService