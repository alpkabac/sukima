require('dotenv').config()
const utils = require('./utils')
const commandService = require('./commandService')
const translationsService = require('./translationService')
const muteCommands = require('./command/muteCommands')
const memoryCommands = require("./command/memoryCommands");
const languageCommands = require("./command/languageCommands");
const messageCommands = require("./command/messageCommands");
const promptCommands = require("./command/promptCommands");
const voiceCommands = require("./command/voiceCommands");
const injectionCommands = require("./command/injectionCommands");
const wikiCommands = require("./command/wikiCommands");
const danbooruCommands = require("./command/danbooruCommands");
const epornerCommands = require("./command/epornerCommands");
const personalityCommands = require("./command/personalityCommands");

function prepareIncomingMessage(message, botName, nick) {
    return utils.replaceNickByBotName(botName, nick, message).trim()
}

class BotService {

    static async onChannelMessage(from, channel, message, botNick = process.env.BOTNAME, roles = []) {
        if (!utils.isMessageFromAllowedChannel(channel)) {
            return
        }

        const msg = prepareIncomingMessage(message, process.env.BOTNAME, botNick)

        const allCommands = []
            .concat(muteCommands.all)
            .concat(memoryCommands.all)
            .concat(languageCommands.all)
            .concat(promptCommands.all)
            .concat(voiceCommands.all)
            .concat(injectionCommands.all)
            .concat(wikiCommands.all)
            .concat(danbooruCommands.all)
            .concat(epornerCommands.all)
            .concat(personalityCommands.all)
            .concat(messageCommands.all)    // Should always be last

        for (let command of allCommands) {
            const commandResult = await command.call(msg, from, channel, roles)
            if (commandResult) {
                return commandResult
            }
        }
    }

    static onPrivateMessage() {

    }

    static async onJoin(channel, nick) {
        if (nick !== process.env.BOTNAME) {
            return messageCommands.reactToAction.call(translationsService.translations.onJoin, nick, channel, []);
        }
        return false
    }

    static async onPart(channel, nick) {
        return await commandService.reactToAction(translationsService.translations.onPart, nick, channel)
    }

    static async onQuit(channel, nick) {
        return await commandService.reactToAction(translationsService.translations.onQuit, nick, channel)
    }

    static async onKick(channel, nick, by, reason) {
        return await commandService.reactToAction(
            translationsService.translations.onKick
                .replace("${by}", by)
                .replace("${reason}", reason),
            nick,
            channel)
    }

    static async onAction(channel, nick, action) {
        if (utils.isMessageFromAllowedChannel(channel)) {
            return await commandService.reactToAction(
                action,
                nick,
                channel)
        }
        return false
    }
}

module.exports = BotService