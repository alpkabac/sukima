require('dotenv').config()
const conf = require("../conf.json")
const translationService = require("./translationService")
const historyService = require("./historyService")
const memoryService = require("./memoryService")

class PromptService {
    static getIntroduction(usesIntroduction = true) {
        if (!usesIntroduction) return []
        return translationService.botTranslations.introduction.map((e) => {
            return {
                from: e.from.replace("${botName}", process.env.BOTNAME),
                msg: e.msg.replace("${botName}", process.env.BOTNAME)
            }
        })
    }

    static getChannelMemory(channel, usesMemory = true) {
        if (!usesMemory) return []
        return Object.keys(memoryService.getChannelMemory(channel))
            .map((key) => {
                return {from: key, msg: memoryService.getChannelMemory(channel)[key]}
            })
    }

    static getPrompt(msg, from, channel, usesIntroduction = true, usesHistory = true, isContinuation = false, isRetry = false) {
        // Preparing the prompt
        let filter = false

        const channelContext = translationService.botTranslations.context
        const botDescription = translationService.botTranslations.description

        const channelMemory = this.getChannelMemory(channel)
            .map(m => m.msg).join("\n")         // Insert channel `!remember`s

        return (
                usesHistory ?
                    (
                        channelContext + "\n" + botDescription + "\n"
                        + (channelMemory ? channelMemory + `\n` : '')
                    )
                    : ""
            ) +
            (this.getIntroduction(usesIntroduction)
                    .concat(
                        !usesHistory ?
                            [{from: process.env.BOTNAME, msg: translationService.botTranslations.noContextSentence}, {
                                from,
                                msg
                            }]
                            : historyService
                                .getChannelHistory(channel)
                                .slice(-conf.maxHistory)   // Concat the last X messages from history
                    )
                    .reverse()  // If continuation, reverse and remove messages until the last message from the bot
                    .filter((msg) => {
                        if (!isContinuation && !isRetry) return true
                        if (isContinuation) {
                            if (msg.from === process.env.BOTNAME && !filter) {
                                filter = true
                            }
                            return filter
                        }else if (isRetry){
                            if (msg.from === process.env.BOTNAME && !filter) {
                                filter = true
                                return false
                            }
                            return filter
                        }
                    })
                    .reverse()  // Unreverse
                    .map((msg) => `${msg.from}: ${msg.msg}`)        // Formatting the line
                    .join("\n")         // Concat the array into multiline string
            )
            + (isContinuation ? "" : ("\n" + process.env.BOTNAME + ":")) // Add the process.env.BOTNAME so the AI knows it's its turn to speak
    }
}

module.exports = PromptService