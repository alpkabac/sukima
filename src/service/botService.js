import {config} from "dotenv";

config()
import utils from "../utils.js";
import translationsService from "./translationService.js";
import messageCommands from "../command/messageCommands.js";
import commands from "../command/commands.js";


class BotService {

    static async onChannelMessage(from, channel, message, botNick = process.env.BOTNAME, roles = [], messageId, client) {
        if (!utils.isMessageFromAllowedChannel(channel)) {
            return
        }

        const msg = utils.replaceNickByBotName(message).trim()

        for (let command of commands.getOnMessageCommands()) {
            const commandResult = await command.call(msg, from, channel, roles, messageId, client)
            if (commandResult) {
                return commandResult
            }
        }
    }

    static onPrivateMessage() {

    }

    static async onJoin(channel, nick) {
        if (nick !== process.env.BOTNAME) {
            return messageCommands.reactToAction.call(translationsService.translations.onJoin, nick, channel, [])
        }
        return false
    }

    static async onPart(channel, nick) {
        return messageCommands.reactToAction.call(translationsService.translations.onPart, nick, channel, [])
    }

    static async onQuit(channel, nick) {
        return messageCommands.reactToAction.call(translationsService.translations.onQuit, nick, channel, [])
    }

    static async onKick(channel, nick, by, reason) {
        return messageCommands.reactToAction.call(
            translationsService.translations.onKick
                .replace("${by}", by)
                .replace("${reason}", reason),
            nick,
            channel,
            []
        )
    }

    static async onAction(channel, nick, action) {
        if (utils.isMessageFromAllowedChannel(channel)) {
            return messageCommands.reactToAction.call(action, nick, channel, [])
        }
        return false
    }
}

export default BotService