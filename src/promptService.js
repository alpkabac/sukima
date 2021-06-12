const conf = require("../conf.json")
const translationService = require("./translationService")
const historyService = require("./historyService")
const memoryService = require("./memoryService")

class PromptService {
    static getIntroduction(usesIntroduction = true) {
        if (!usesIntroduction) return []
        return translationService.botTranslations.introduction.map((e) => {
            return {
                from: e.from.replace("${botName}", conf.botName),
                msg: e.msg.replace("${botName}", conf.botName)
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

    static getPrompt(msg, from, channel, usesIntroduction = true, usesHistory = true, isContinuation = false) {
        // Preparing the prompt
        let filter = false

        const channelContext = translationService.botTranslations.context
        const botDescription = translationService.botTranslations.description

        const channelMemory = this.getChannelMemory(channel)
            .map(m => m.msg).join("\n")         // Insert channel `!remember`s

        return channelContext + "\n" + botDescription + "\n"
            + (channelMemory ? channelMemory + `\n` : '') +
            (this.getIntroduction(usesIntroduction)
                    .concat(
                        !usesHistory ?
                            [{from: conf.botName, msg: translationService.botTranslations.noContextSentence}, {
                                from,
                                msg
                            }]
                            : historyService
                                .getChannelHistory(channel)
                                .slice(-conf.maxHistory)   // Concat the last X messages from history
                    )
                    .reverse()  // If continuation, reverse and remove messages until the last message from the bot
                    .filter((msg) => {
                        if (!isContinuation) return true
                        if (msg.from === conf.botName && !filter) {
                            filter = true
                        }
                        return filter
                    })
                    .reverse()  // Unreverse
                    .map((msg) => `${msg.from}: ${msg.msg}`)        // Formatting the line
                    .join("\n")         // Concat the array into multiline string
            )
            + (isContinuation ? "" : ("\n" + conf.botName + ":")) // Add the conf.botName so the AI knows it's its turn to speak
    }
}

module.exports = PromptService