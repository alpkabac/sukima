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
            this.loadChannelBannedTokenFiles(channel, this.parseBannedTokenFilesString(process.env.BANNED_TOKENS_FILE))
            return this.channelBannedTokens[channel]
        }

        // load banned token files from personality
        if (personality && personality.bannedTokenFiles && typeof personality.bannedTokenFiles === "string") {
            const bannedTokenFiles = this.parseBannedTokenFilesString(personality.bannedTokenFiles)
            this.loadChannelBannedTokenFiles(channel, bannedTokenFiles)
            return this.channelBannedTokens[channel]
        }

        // load default banned tokens
        this.loadChannelBannedTokenFiles(channel, this.parseBannedTokenFilesString('default'))
        return this.channelBannedTokens[channel]
    }

    static parseBannedTokenFilesString(bannedTokenFilesString) {
        return bannedTokenFilesString   // "end_of_text + nsfw"
            .split("+")                 // ["end_of_text ", " nsfw"]
            .map(f => f.trim())         // ["end_of_text", "nsfw"]
    }

    static loadChannelBannedTokenFiles(channel, bannedTokenFiles) {
        let allBannedTokens = []
        for (let bannedTokenFile of bannedTokenFiles) {
            const badWords = utils.loadJSONFile(`./data/bannedTokens/${bannedTokenFile}.badwords`)
            const bannedSequenceGroups = badWords?.bannedSequenceGroups
            if (bannedSequenceGroups && bannedSequenceGroups.length > 0) {
                for (let group of bannedSequenceGroups) {
                    for (let sequence of group?.sequences) {
                        for (let tokens of sequence?.tokens) {
                            allBannedTokens = allBannedTokens.concat(tokens)
                        }
                    }
                }
            }
            const bannedTokens = badWords?.bad_words_ids
            if (bannedTokens && bannedTokens.length > 0) {
                allBannedTokens = allBannedTokens.concat(bannedTokens)
            }
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
                        let [channelName, bannedTokenFileNames] = e     // "#alice-sfw: end_of_text + nsfw"
                            .split(":")                     // ["#alice-sfw", " end_of_text + nsfw"]
                            .map(f => f.trim())                     // ["#alice-sfw", "end_of_text + nsfw"]

                        bannedTokenFileNames = this.parseBannedTokenFilesString(bannedTokenFileNames)
                        return {channel: channelName, bannedTokenFiles: bannedTokenFileNames} // {channel: "#alice-sfw", bannedTokenFiles: ["end_of_text", "nsfw"]}
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