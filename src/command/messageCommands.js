require('dotenv').config()
const Command = require("./Command");
const historyService = require("../historyService");
const utils = require("../utils");
const promptService = require("../promptService");
const aiService = require("../aiService");
const translationsService = require("../translationService");

const messageCommands = {
    noContextMessage: new Command(
        "No Context Message",
        [],
        ["!"],
        process.env.ALLOW_NO_CONTEXT_MESSAGE,
        async (msg, from, channel, command) => {
            const message = utils.upperCaseFirstLetter(msg.slice(1))
            historyService.pushIntoHistory(message, from, channel)
            const prompt = promptService.getNoContextPrompt(message, from, channel)
            const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"))
            historyService.pushIntoHistory(answer, process.env.BOTNAME, channel)
            return {message: answer}
        },
        false
    ),
    continueMessage: new Command(
        "Continue Message",
        [","],
        [],
        process.env.ALLOW_CONTINUE_MESSAGE,
        async (msg, from, channel, command) => {
            const prompt = promptService.getPrompt(msg, from, channel, true, false)
            const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"))
            historyService.getChannelHistory(channel).reverse()
            for (let h of historyService.getChannelHistory(channel)) {
                if (h.from === process.env.BOTNAME) {
                    h.msg += answer
                    break
                }
            }
            historyService.getChannelHistory(channel).reverse()
            return {message: answer}
        },
        false
    ),
    retryMessage: new Command(
        "Retry Message",
        ["²", "○"],
        [],
        process.env.ALLOW_RETRY_MESSAGE,
        async (msg, from, channel, command) => {
            const prompt = promptService.getPrompt(msg, from, channel, false, true)
            const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"))
            historyService.getChannelHistory(channel).reverse()
            for (let h of historyService.getChannelHistory(channel)) {
                if (h.from === process.env.BOTNAME) {
                    h.msg = answer
                    break
                }
            }
            historyService.getChannelHistory(channel).reverse()
            return {message: answer}
        },
        false
    ),
    answerMessage: new Command(
        "Answer Message",
        [],
        ["?"],
        process.env.ALLOW_ANSWER_MESSAGE,
        async (msg, from, channel, command) => {
            const message = utils.upperCaseFirstLetter(msg.slice(1)).trim()
            if (message) {
                historyService.pushIntoHistory(message, from, channel)
            }
            const prompt = promptService.getPrompt(msg, from, channel)
            const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"))
            historyService.pushIntoHistory(answer, process.env.BOTNAME, channel)
            return {message: answer}
        },
        false
    ),
    comment: new Command(
        "Comment Message",
        [],
        ["#"],
        process.env.ALLOW_COMMENT_MESSAGE,
        (msg, from, channel, command) => {
            // Do nothing (ignore the comment message)
        }),
    answerToName: new Command(
        "Answer to Name",
        [],
        [],
        null,
        async (msg, from, channel, command) => {
            historyService.pushIntoHistory(msg, from, channel)
            if (msg.toLowerCase().includes(process.env.BOTNAME.toLowerCase())) {
                const prompt = promptService.getPrompt(msg, from, channel)
                const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"))
                historyService.pushIntoHistory(answer, process.env.BOTNAME, channel)
                return {message: answer}
            }
        },
        false
    ),
    talk: new Command(
        "Talk",
        [],
        [],
        null,
        async (msg, from, channel, command) => {
            if (!utils.getBoolFromString(process.env.ENABLE_AUTO_ANSWER)) return false

            const history = historyService.getChannelHistory(channel)
            const lastMessageFromChannel = history && history.length > 0 ?
                history[history.length - 1]
                : null
            if (lastMessageFromChannel && lastMessageFromChannel.from !== process.env.BOTNAME) {
                const prompt = promptService.getPrompt(null, null, channel)
                const answer = await aiService.sendLowPriority(prompt, channel.startsWith("##"))
                if (answer) {
                    historyService.pushIntoHistory(answer, process.env.BOTNAME, channel)
                    return {message: answer}
                }
            }
        },
        false
    ),
    reactToAction: new Command(
        "React to Action",
        [],
        [],
        process.env.ALLOW_REACTIONS,
        async (msg, from, channel, command) => {
            const action = translationsService.translations.onAction
                .replace("${text}", utils.upperCaseFirstLetter(msg.trim()))
            historyService.pushIntoHistory(action, from, channel)
            const prompt = promptService.getPrompt(msg, from, channel)
            const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"))
            historyService.pushIntoHistory(answer, process.env.BOTNAME, channel)
            return {message: answer}
        },
        false
    ),
}

messageCommands.all = [
    messageCommands.noContextMessage,
    messageCommands.continueMessage,
    messageCommands.retryMessage,
    messageCommands.answerMessage,
    messageCommands.answerToName,
    messageCommands.answerToName,
    messageCommands.comment,
    // messageCommands.talk,
    // messageCommands.reactToAction,
]

module.exports = messageCommands