const utils = require('./utils')
const conf = require('../conf.json')
const commandService = require('./commandService')
const translationsService = require('./translationService')

function isMessageFromChannel(to, channels) {
    return channels.some((channel) => utils.caseInsensitiveStringEquals(to, channel))
}

function prepareIncomingMessage(message, botName, nick) {
    return utils.replaceNickByBotName(botName, nick, message).trim()
}

class BotService {
    static async onChannelMessage(from, channel, message, botNick = conf.botName) {
        if (!isMessageFromChannel(channel, conf.channels)) {
            return
        }

        const msg = prepareIncomingMessage(message, conf.botName, botNick)

        return commandService.remember(msg, from, channel)
            || await commandService.r34(msg, from, channel)
            || commandService.forgetRemember(msg, from, channel)
            || await commandService.changeLanguage(msg, from, channel)
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
        if (nick !== conf.botName) {
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
        if (isMessageFromChannel(channel, conf.channels)) {
            return await commandService.reactToAction(
                action,
                nick,
                channel)
        }
        return false
    }
}

module.exports = BotService