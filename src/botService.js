require('dotenv').config()
const utils = require('./utils')
const conf = require('../conf.json')
const commandService = require('./commandService')
const translationsService = require('./translationService')

function prepareIncomingMessage(message, botName, nick) {
    return utils.replaceNickByBotName(botName, nick, message).trim()
}

class BotService {
    static async onChannelMessage(from, channel, message, botNick = process.env.BOTNAME) {
        if (!utils.isMessageFromChannel(channel, conf.channels)) {
            return
        }

        const msg = prepareIncomingMessage(message, process.env.BOTNAME, botNick)

        return commandService.comment(msg, from, channel)
            || commandService.remember(msg, from, channel)
            || commandService.setJSONPersonality(msg, from, channel)
            || await commandService.r34(msg, from, channel)
            || await commandService.retryMessage(msg, from, channel)
            || commandService.forgetRemember(msg, from, channel)
            || await commandService.setPersonality(msg, from, channel)
            || await commandService.setVoice(msg, from, channel)
            || await commandService.changeLanguage(msg, from, channel)
            || await commandService.prompt(msg, from, channel)
            || commandService.rpgPutEvent(msg, from, channel)
            || commandService.rpgContext(msg, from, channel)
            || commandService.forgetAllRemember(msg, from, channel)
            || commandService.deleteChannelHistory(msg, from, channel)
            || commandService.mute(msg, from, channel)
            || commandService.unmute(msg, from, channel)
            || await commandService.noContextMessage(msg, from, channel)
            || await commandService.continueMessage(msg, from, channel)
            || await commandService.answerMessage(msg, from, channel)
            || await commandService.answerToName(msg, from, channel)
    }

    static onPrivateMessage() {

    }

    static async onJoin(channel, nick) {
        if (nick !== process.env.BOTNAME) {
            return await commandService.reactToAction(translationsService.translations.onJoin, nick, channel)
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
        if (utils.isMessageFromChannel(channel, conf.channels)) {
            return await commandService.reactToAction(
                action,
                nick,
                channel)
        }
        return false
    }
}

module.exports = BotService