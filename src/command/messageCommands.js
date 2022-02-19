import {config} from "dotenv";
import Command from "./Command.js";
import historyService from "../service/historyService.js";
import utils from "../utils.js";
import promptService from "../service/promptService.js";
import aiService from "../service/aiService.js";
import translationsService from "../service/translationService.js";

config()


const messageCommands = {
    noContextMessage: new Command(
        "No Context Message",
        [],
        ["!!"],
        process.env.ALLOW_NO_CONTEXT_MESSAGE,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            historyService.pushIntoHistory(parsedMsg, from, channel, messageId)
            const prompt = promptService.getNoContextPrompt(parsedMsg, from, channel)
            const answer = await aiService.sendUntilSuccess({
                prompt,
                repetition_penalty_range: 1024
            }, channel.startsWith("##"), channel)
            return {
                message: answer, success: true,
                pushIntoHistory: [answer, process.env.BOTNAME, channel]
            }
        },
        false
    ),
    continueMessage: new Command(
        "Continue Message",
        [",", "!continue"],
        [],
        process.env.ALLOW_CONTINUE_MESSAGE,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            const prompt = promptService.getPrompt(channel, true, false)
            const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"), channel)
            historyService.getChannelHistory(channel).reverse()
            for (let h of historyService.getChannelHistory(channel)) {
                if (h.from === process.env.BOTNAME) {
                    h.msg += answer
                    break
                }
            }
            historyService.getChannelHistory(channel).reverse()
            return {message: answer, success: true, deleteUserMsg: true, appendToLastMessage: true, instantReply: true}
        },
        false
    ),
    retryFinish: new Command(
        "Retry and finish message from text input",
        [],
        ["!retryF ", "!retryFinish "],
        process.env.ALLOW_RETRY_MESSAGE,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            let prompt = promptService.getPrompt(channel, false, true)
            if (targetMessageId) {
                prompt = promptService.getPrompt(channel, false, true, true, targetMessageId)
            }
            prompt.prompt += ' ' + parsedMsg.trim()
            let answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"), channel)
            answer = parsedMsg.trim() + answer
            historyService.getChannelHistory(channel).reverse()
            for (let h of historyService.getChannelHistory(channel)) {
                if (targetMessageId ? h.messageId === targetMessageId : h.from === process.env.BOTNAME) {
                    h.msg = answer
                    break
                }
            }
            historyService.getChannelHistory(channel).reverse()
            return {
                message: answer, success: true, deleteUserMsg: true, editLastMessage: !targetMessageId,
                editMessage: targetMessageId, reactWith: null /*🔄*/, instantReply: true
            }
        },
        false
    ),
    retryMessage: new Command(
        "Retry Message",
        ["²", "○", "!retry"],
        ["!retry "],
        process.env.ALLOW_RETRY_MESSAGE,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            let prompt = promptService.getPrompt(channel, false, true)
            if (targetMessageId) {
                prompt = promptService.getPrompt(channel, false, true, true, targetMessageId)
            }
            const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"), channel)
            historyService.getChannelHistory(channel).reverse()
            for (let h of historyService.getChannelHistory(channel)) {
                if (targetMessageId ? h.messageId === targetMessageId : h.from === process.env.BOTNAME) {
                    h.msg = answer
                    break
                }
            }
            historyService.getChannelHistory(channel).reverse()
            return {
                message: answer, success: true, deleteUserMsg: true, editLastMessage: !targetMessageId,
                editMessage: targetMessageId, reactWith: null /*🔄*/, instantReply: true
            }
        },
        false
    ),
    deleteMessage: new Command(
        "Delete Message",
        [],
        ["!delete "],
        process.env.ALLOW_DELETE_MESSAGE,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            historyService.delete(channel, targetMessageId)
            return {success: true, deleteUserMsg: true, deleteMessage: targetMessageId}
        },
        true
    ),
    pruneMessages: new Command(
        "Prune Messages",
        [],
        ["!prune "],
        process.env.ALLOW_PRUNE_MESSAGES,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            if (!targetMessageId) return {
                error: `# You need to provide a messageID for this command`,
                deleteUserMsg: true
            }
            historyService.prune(channel, targetMessageId)
            return {success: true, deleteUserMsg: true, deleteMessagesUpTo: targetMessageId}
        },
        true
    ),
    editMessage: new Command(
        "Edit Message",
        [],
        ["!edit "],
        process.env.ALLOW_EDIT_MESSAGE,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            if (historyService.editByMessageId(parsedMsg, channel, targetMessageId)) {
                return {
                    message: parsedMsg,
                    success: true,
                    deleteUserMsg: true,
                    editLastMessage: !targetMessageId,
                    editMessage: targetMessageId,
                    instantReply: true
                }
            } else {
                return {error: `# No message was found for ID #${targetMessageId}`, deleteUserMsg: true}
            }
        },
        false
    ),
    finishMessage: new Command(
        "Finish Message",
        [],
        ["!finish "],
        process.env.ALLOW_ANSWER_MESSAGE,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            if (!parsedMsg) return {
                message: "# This command requires text as argument. Example: `!finish My name is`",
                instantReply: true
            }

            const prompt = promptService.getPrompt(channel)
            prompt.prompt += ' ' + parsedMsg.trim()
            const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"), channel)
            const result = parsedMsg.trim() + answer
            return {
                message: result,
                success: true,
                deleteUserMsg: false,
                pushIntoHistory: [result.trim(), process.env.BOTNAME, channel]
            }
        },
        false
    ),
    impersonate: new Command(
        "Impersonate the AI",
        [],
        ["!impersonate ", "!imp "],
        process.env.ALLOW_ANSWER_MESSAGE,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            if (!parsedMsg) return {
                message: "# This command requires text as argument. Example: `!impersonate My name is Alice`",
                instantReply: true
            }

            const result = parsedMsg.trim()
            return {
                message: result,
                success: true,
                deleteUserMsg: false,
                pushIntoHistory: [result, process.env.BOTNAME, channel]
            }
        },
        false
    ),
    answerMessage: new Command(
        "Answer Message",
        [],
        ["?", "!talk"],
        process.env.ALLOW_ANSWER_MESSAGE,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            if (parsedMsg) {
                historyService.pushIntoHistory(parsedMsg, from, channel, messageId)
            }
            const prompt = promptService.getPrompt(channel)
            const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"), channel)
            return {
                message: answer, success: true,
                pushIntoHistory: [answer, process.env.BOTNAME, channel]
            }
        },
        false
    ),
    forceTalk: new Command(
        "Force Message",
        ["?", "!talk"],
        [],
        process.env.ALLOW_ANSWER_MESSAGE,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            if (parsedMsg) {
                historyService.pushIntoHistory(parsedMsg, from, channel, messageId)
            }
            const prompt = promptService.getPrompt(channel)
            const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"), channel)
            return {
                message: answer, success: true, deleteUserMsg: true,
                pushIntoHistory: [answer, process.env.BOTNAME, channel]
            }
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
        },
        true
    ),

    talk: new Command(
        "Talk",
        [],
        [],
        null,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            if (!utils.getBoolFromString(process.env.ENABLE_AUTO_ANSWER)) return false

            const history = historyService.getChannelHistory(channel)
            const lastMessageFromChannel = history && history.length > 0 ?
                history[history.length - 1]
                : null
            const lastAuthorIsBot = lastMessageFromChannel?.from === process.env.BOTNAME

            if (!lastMessageFromChannel) return
            if (lastAuthorIsBot) return

            const timeStep = 1000
            const lastMessageIsOldEnough = (Date.now() - lastMessageFromChannel.timestamp) > (parseInt(process.env.MIN_BOT_MESSAGE_INTERVAL) * timeStep)

            if (lastMessageIsOldEnough) {
                const prompt = promptService.getPrompt(channel)
                const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"), channel)
                if (answer) {
                    return {
                        message: answer,
                        pushIntoHistory: [answer, process.env.BOTNAME, channel]
                    }
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
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            const action = translationsService.translations.onAction
                .replace("${text}", utils.upperCaseFirstLetter(msg.trim()))
            historyService.pushIntoHistory(action, from, channel, messageId)
            const prompt = promptService.getPrompt(channel)
            const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"), channel)
            return {
                message: answer,
                pushIntoHistory: [answer, process.env.BOTNAME, channel]
            }
        },
        false
    ),
}

messageCommands.all = [
    messageCommands.impersonate,
    messageCommands.finishMessage,
    messageCommands.deleteMessage,
    messageCommands.pruneMessages,
    messageCommands.forceTalk,
    messageCommands.comment,
    messageCommands.noContextMessage,
    messageCommands.continueMessage,
    messageCommands.retryFinish,
    messageCommands.retryMessage,
    messageCommands.editMessage,
    messageCommands.answerMessage,
    // messageCommands.talk,
    // messageCommands.reactToAction,
]

export default messageCommands