const utils = require('./utils')
const commandService = require('./commandService')

function isMessageFromChannel(to, channels) {
    return channels.some((channel) => utils.caseInsensitiveStringEquals(to, channel))
}

function prepareIncomingMessage(message, botName, nick) {
    return utils.replaceNickByBotName(botName, nick, message).trim()
}

class BotService {
    static onChannelMessage(from, to, message, botNick, conf) {
        // Prevents PM
        if (!isMessageFromChannel(to, conf.channels)) return

        const msg = prepareIncomingMessage(message, conf.botName, botNick)

        // Remember a sentence, one per nick allowed
        commandService.remember(msg, from, botTranslations)
        commandService.forgetRemember(msg, from, botTranslations)
        commandService.forgetAllRemember(msg, from, botTranslations)

        // Change language of the bot on the fly
        if (msg.startsWith("!lang ")) {
            const language = msg.replace("!lang ", "")
            let message = ""
            try {
                translations = require(`./translations/${language}.json`)
                //message += `Loaded translations: ${language}`
            } catch (e) {
                //message += `Couldn't load translations for ${language}`
            }

            try {
                botTranslations = require(`./translations/aiPersonality/${options.botName}/${language}.json`)
                message += `\nLoaded bot personality file: ${options.botName}/${language}.json`
            } catch (e) {
                message += (message ? "\n" : "") + `Couldn't load bot personality for ${options.botName}/${language}.json`
            }

            if (message) {
                ircClient.say(options.channel, message)
            }
        }

        // Forget the whole conversation, keeps introduction and memory
        else if (msg.startsWith("!forget")) {
            channelHistory.splice(0, channelHistory.length)
        }

        // Mute/unmute, stops message generation and conversation memory
        else if (msg.startsWith("!mute")) {
            options.isMuted = true
        } else if (msg.startsWith("!unmute")) {
            options.isMuted = false
        }

        // Only use a simple sentence from the bot as a context, nothing more
        else if (msg.startsWith("!")) {
            const message = upperCaseFirstLetter(msg.slice(1))
            pushIntoHistory(channelHistory, {from, msg: message})
            generateAndSendMessage(options.channel, [{
                from: options.botName,
                msg: botTranslations.noContextSentence
            }, {from: from, msg: message}], false)
        } else if (msg.startsWith(",") && msg.length === 1) {
            generateAndSendMessage(options.channel, channelHistory, true, true)
        } else if (msg.startsWith("?")) {
            const m = upperCaseFirstLetter(msg.slice(1))
            if (m) {
                pushIntoHistory(channelHistory, {from, msg: m})
            }
            generateAndSendMessage(options.channel, channelHistory, true)
        }

        // Normal message, triggers the bot to speak if its name is included
        else {
            pushIntoHistory(channelHistory, {from, msg: msg.replace(":", "")})

            // Detects if the bot name has been mentioned, reacts if it's the case
            if (msg.toLowerCase().includes(options.botName.toLowerCase())) {
                generateAndSendMessage(options.channel, channelHistory, true)
            }
        }
    }

    static onPrivateMessage() {
    }

    static onJoin() {
    }

    static onPart() {
    }

    static onQuit() {
    }

    static onKick() {
    }

    static onAction() {
    }
}