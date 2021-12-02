require('dotenv').config()
const utils = require('./utils')
const conf = require('../conf.json')
const commandService = require('./commandService')
const translationsService = require('./translationService')

function prepareIncomingMessage(message, botName, nick) {
    return utils.replaceNickByBotName(botName, nick, message).trim()
}

class BotService {
    static async onChannelMessage(from, channel, message, botNick = process.env.BOTNAME, roles=[]) {

        if (!utils.isMessageFromAllowedChannel(channel)) {
            return
        }

        const msg = prepareIncomingMessage(message, process.env.BOTNAME, botNick)

        return commandService.comment(msg, from, channel, roles)
            || commandService.remember(msg, from, channel, roles)
            || commandService.setJSONPersonality(msg, from, channel, roles)
            || await commandService.r34(msg, from, channel, roles)
            || await commandService.danbooru(msg, from, channel, roles)
            || await commandService.eporner(msg, from, channel, roles)
            || await commandService.wiki(msg, from, channel, roles)
            || await commandService.retryMessage(msg, from, channel, roles)
            || commandService.forgetRemember(msg, from, channel, roles)
            || await commandService.setPersonality(msg, from, channel, roles)
            || await commandService.setVoice(msg, from, channel, roles)
            || await commandService.changeLanguage(msg, from, channel, roles)
            || await commandService.prompt(msg, from, channel, roles)
            || commandService.rpgPutEvent(msg, from, channel, roles)
            || commandService.rpgContext(msg, from, channel, roles)
            || commandService.forgetAllRemember(msg, from, channel, roles)
            || commandService.deleteChannelHistory(msg, from, channel, roles)
            || commandService.mute(msg, from, channel, roles)
            || commandService.unmute(msg, from, channel, roles)
            || await commandService.noContextMessage(msg, from, channel, roles)
            || await commandService.continueMessage(msg, from, channel, roles)
            || await commandService.answerMessage(msg, from, channel, roles)
            || await commandService.answerToName(msg, from, channel, roles)
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