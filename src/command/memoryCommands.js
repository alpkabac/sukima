import {config} from "dotenv";
import Command from "./Command.js";
import memoryService from "../service/memoryService.js";
import historyService from "../service/historyService.js";
import channelBotTranslationService from "../service/personalityService.js";
import utils from "../utils.js";

config()


function addSquareBrackets(msg) {
    if (msg.startsWith("[ ") && msg.endsWith(" ]")) return msg

    const leftBracket = msg.startsWith("[ ")
    const rightBracket = msg.endsWith(" ]")

    const partialLeftBracket = msg.startsWith("[")
    const partialRightBracket = msg.endsWith("]")

    if (!leftBracket && partialLeftBracket) {
        msg = "[ " + utils.upperCaseFirstLetter(msg.substr(1))
    } else if (!leftBracket && !partialLeftBracket) {
        msg = "[ " + utils.upperCaseFirstLetter(msg)
    }

    if (!rightBracket && partialRightBracket) {
        msg = msg.substr(0, msg.length - 1) + " ]"
    } else if (!rightBracket && !partialRightBracket) {
        msg = msg + " ]"
    }

    return msg
}

const memoryCommands = {
    remember: new Command(
        "Remember",
        [],
        ["!remember "],
        process.env.ALLOW_REMEMBER,
        (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            const newRememberedThing = addSquareBrackets(msg.replace(command, '').trim())
            memoryService.setUserMemoryInChannel(newRememberedThing, from, channel)
            return {
                success: true
            }
        }),
    alsoRemember: new Command(
        "Also Remember",
        [],
        ["!alsoRemember "],
        process.env.ALLOW_REMEMBER,
        (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            const currentRememberedThings = memoryService.getChannelMemoryForUser(channel, from)?.trim()
            const newRememberedThing = addSquareBrackets(parsedMsg)
            if (newRememberedThing) {
                const fullThingToRemember = (currentRememberedThings + "\n" + newRememberedThing).trim()
                memoryService.setUserMemoryInChannel(fullThingToRemember, from, channel)
                return {
                    message: "# Successfully added the memory!\nNew complete memory:\n" + fullThingToRemember,
                    success: true
                }
            }
        }),
    showRemember: new Command(
        "Show Remember",
        ["!showRemember"],
        [],
        process.env.ALLOW_REMEMBER,
        (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            const memory = memoryService.getChannelMemoryForUser(channel, from)
            const message = memory ? "# Your channel memory:\n" + memory :
                "# Your have no memorized message"
            return {
                message,
                success: true
            }
        }),
    showAllRemember: new Command(
        "Show All Remember",
        ["!showAllRemember"],
        [],
        process.env.ALLOW_REMEMBER,
        (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            const memory = JSON.stringify(memoryService.getChannelMemory(channel), null, 4)
            return {
                message: "# Channel memory:\n" + memory,
                success: true
            }
        }),
    forgetRemember: new Command(
        "Forget",
        ["!forget"],
        [],
        process.env.ALLOW_REMEMBER,
        (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            memoryService.forgetUserMemoryInChannel(from, channel)
            return {
                success: true
            }
        }),
    forgetAllRemember: new Command(
        "Forget All",
        ["!forgetAll"],
        [],
        process.env.ALLOW_WIPE_REMEMBER,
        (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            memoryService.forgetAllUserMemoryInChannel(channel)
            return {
                success: true
            }
        }),
    deleteChannelHistory: new Command(
        "Reset",
        ["!reset"],
        [],
        process.env.ALLOW_FORGET,   // TODO: rename to ALLOW_RESET
        (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            historyService.forgetChannelHistory(channel)
            let presentationMessage = ""
            const intro = channel.startsWith("##") ?
                channelBotTranslationService.getChannelPersonality(channel).introductionDm :
                channelBotTranslationService.getChannelPersonality(channel).introduction
            for (let i of intro) {
                if (i.from === process.env.BOTNAME || i.from === "${botName}") {
                    presentationMessage += i.msg + "\n"
                } else {
                    break
                }
            }
            if (presentationMessage) {
                return {
                    message:
                        `${presentationMessage.trim()}`,
                    success: true,
                    reactWith: null, //"💔"
                    deleteUserMsg: true
                }
            } else {
                return {
                    success: true,
                    reactWith: null,
                    deleteUserMsg: true
                }
            }
        }),
}

memoryCommands.all = [
    memoryCommands.remember,
    memoryCommands.alsoRemember,
    memoryCommands.showRemember,
    memoryCommands.showAllRemember,
    memoryCommands.forgetRemember,
    memoryCommands.forgetAllRemember,
    memoryCommands.deleteChannelHistory,
]

export default memoryCommands