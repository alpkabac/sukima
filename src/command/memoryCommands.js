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
            if (channelBotTranslationService.getChannelBotTranslations(channel).introduction.length > 0) {
                return {
                    message:
                        `${channelBotTranslationService.getChannelBotTranslations(channel).introduction[0].msg}`
                }
            }
            // TODO: send all the introduction lines
        }),
}

memoryCommands.all = [
    memoryCommands.remember,
    memoryCommands.forgetRemember,
    memoryCommands.forgetAllRemember,
    memoryCommands.deleteChannelHistory,
]

module.exports = memoryCommands