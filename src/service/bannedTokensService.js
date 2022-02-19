import {config} from "dotenv";
import utils from "../utils.js";
import personalityService from "./personalityService.js";
import fs from "fs";
import encoder from "gpt-3-encoder";

config()

class BannedTokensService {
    static channelBannedTokens = {}

    static getBannedTokens(channel) {
        if (!channel) throw new Error("Channel argument is mandatory")

        if (this.channelBannedTokens[channel]) {
            return this.channelBannedTokens[channel]
        }

        if (fs.existsSync(`./bot/${process.env.BOT_ID}/default.badwords`)) {
            this.channelBannedTokens[channel] = BannedTokensService.loadBannedTokenFile(`./bot/${process.env.BOT_ID}/default.badwords`)
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

    static loadBannedTokenFile(filePath) {
        const file = utils.loadJSONFile(filePath)
        const bannedSequenceGroups = file?.bannedSequenceGroups || file?.banned_sequence_groups || []
        const allBannedTokens = []

        for (let bannedSequenceGroup of bannedSequenceGroups) {
            if (!bannedSequenceGroup.enabled) continue
            for (let sequence of bannedSequenceGroup.sequences) {

                if (sequence.type === 1) {
                    if (sequence.sequence) {
                        const tokens = sequence.sequence
                            .split(',')
                            .map(s => parseInt(s.trim()))
                        allBannedTokens.push(tokens)
                    }

                    if (sequence.sequences?.length > 0) {
                        for (let sequenceBan of sequence.sequences) {
                            allBannedTokens.push(sequenceBan)
                        }
                    }
                }

                if (sequence.type === 2 && sequence.sequence) {
                    const seq = sequence.sequence
                    allBannedTokens.push(encoder.encode(seq.trim()))
                    allBannedTokens.push(encoder.encode(seq.trim().toLowerCase()))
                    allBannedTokens.push(encoder.encode(seq.trim().toUpperCase()))
                    allBannedTokens.push(encoder.encode(' ' + seq.trim()))
                    allBannedTokens.push(encoder.encode(' ' + seq.trim().toLowerCase()))
                    allBannedTokens.push(encoder.encode(' ' + seq.trim().toUpperCase()))
                }
            }
        }

        return allBannedTokens
    }

    static loadChannelBannedTokenFiles(channel, bannedTokenFiles) {
        let allBannedTokens = []
        for (let bannedTokenFile of bannedTokenFiles) {
            allBannedTokens = allBannedTokens.concat(BannedTokensService.loadBannedTokenFile(`./data/bannedTokens/${bannedTokenFile}.badwords`))
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