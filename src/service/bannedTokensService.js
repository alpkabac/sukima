import {config} from "dotenv";
import utils from "../utils.js";
import personalityService from "./personalityService.js";

config()


class BannedTokensService {
    static channelBannedTokens = {}

    static getBannedTokens(channel) {
        if (!channel) throw new Error("Channel argument is mandatory")

        if (this.channelBannedTokens[channel]) {
            return this.channelBannedTokens[channel]
        }

        const personality = personalityService.getChannelPersonality(channel)

        // load bad_words_ids directly from personality
        if (personality && personality.bad_words_ids) {
            this.channelBannedTokens[channel] = personality.bad_words_ids
            return this.channelBannedTokens[channel]
        }

        // load banned tokens mappings from environment file
        if (process.env.LOAD_CHANNEL_BANNED_TOKENS_FILE) {
            this.loadChannelMappings(channel)
            return this.channelBannedTokens[channel]
        }

        // load default banned tokens from environment file
        if (process.env.BANNED_TOKENS_FILE) {
            this.channelBannedTokens[channel] = utils.load(`./data/bannedTokens/${process.env.BANNED_TOKENS_FILE}.badwords`)?.bad_words_ids
            return this.channelBannedTokens[channel]
        }

        // load banned token files from personality
        if (personality && personality.bannedTokenFiles) {
            let bannedTokenFiles
            if (typeof personality.bannedTokenFiles === "string") {
                bannedTokenFiles = this.parseBannedTokenFilesString(personality.bannedTokenFiles)
            } else if (personality.bannedTokenFiles instanceof Array) {
                bannedTokenFiles = personality.bannedTokenFiles
            }

            this.loadChannelBannedTokenFiles(channel, bannedTokenFiles)
            return this.channelBannedTokens[channel]
        }

        // load default banned tokens
        this.channelBannedTokens[channel] = utils.load(`./data/bannedTokens/default.badwords`)?.bad_words_ids
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
            const bannedTokens = utils.load(`./data/bannedTokens/${bannedTokenFile}.badwords`)?.bad_words_ids
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