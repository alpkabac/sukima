require('dotenv').config()
const Command = require("./Command");
const memoryService = require("../memoryService");
const historyService = require("../historyService");
const channelBotTranslationService = require("../channelBotTranslationService");

const memoryCommands = {
    remember: new Command(
        "Remember",
        [],
        ["!remember "],
        process.env.ALLOW_REMEMBER,
        (msg, from, channel, command) => {
            memoryService.setUserMemoryInChannel(msg.replace(command, ''), from, channel)
        }),
    forgetRemember: new Command(
        "Forget",
        ["!forget"],
        [],
        process.env.ALLOW_REMEMBER,
        (msg, from, channel, command) => {
            memoryService.forgetUserMemoryInChannel(from, channel)
        }),
    forgetAllRemember: new Command(
        "Forget All",
        ["!forgetAll"],
        [],
        process.env.ALLOW_WIPE_REMEMBER,
        (msg, from, channel, command) => {
            memoryService.forgetUserMemoryInChannel(from, channel)
        }),
    deleteChannelHistory: new Command(
        "Reset",
        ["!reset"],
        [],
        process.env.ALLOW_FORGET,   // TODO: rename to ALLOW_RESET
        (msg, from, channel, command) => {
            historyService.forgetChannelHistory(channel)
            let presentationMessage = ""
            const intro = channel.startsWith("##") ?
                channelBotTranslationService.getChannelBotTranslations(channel).introductionDm:
                channelBotTranslationService.getChannelBotTranslations(channel).introduction
            for (let i of intro) {
                if (i.from === process.env.BOTNAME) {
                    presentationMessage += i.msg + "\n"
                }else{
                    break
                }
            }
            if (presentationMessage) {
                return {
                    message:
                        `${presentationMessage.trim()}`
                }
            }
        }),
}

memoryCommands.all = [
    memoryCommands.remember,
    memoryCommands.forgetRemember,
    memoryCommands.forgetAllRemember,
    memoryCommands.deleteChannelHistory,
]

module.exports = memoryCommands