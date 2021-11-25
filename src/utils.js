const conf = require('../conf.json')
const textToSpeech = require('@google-cloud/text-to-speech')
const Duplex = require('stream').Duplex

const client = new textToSpeech.TextToSpeechClient()

class Utils {
    /**
     * Replaces the nick of the bot by the bot name
     * Helps the bot AI to keep track of who it is
     * @param botName
     * @param nick
     * @param msg
     * @return message where nick is replaced by bot name
     */
    static replaceNickByBotName(botName, nick, msg) {
        return msg.replace(nick, botName)
    }

    static upperCaseFirstLetter(str) {
        return str.substr(0, 1).toUpperCase() + str.substr(1)
    }

    static caseInsensitiveStringEquals(str1, str2) {
        return str1.toLowerCase() === str2.toLowerCase()
    }

    static getInterval() {
        return 1000 *
            (
                Math.random()
                * (conf.maxBotMessageIntervalInSeconds - conf.minBotMessageIntervalInSeconds)
                + conf.minBotMessageIntervalInSeconds
            )
    }

    static async synthesizeText(text, voiceConfig) {
        const request = {
            input: {text},
            voice: voiceConfig,
            audioConfig: {audioEncoding: 'OGG_OPUS'},
        };

        const [response] = await client.synthesizeSpeech(request);
        return response.audioContent;
    };

    static async tts(connection, text, voiceConfig) {
        const buffer = await Utils.synthesizeText(text, voiceConfig)
        const stream = new Duplex()
        stream.push(buffer)
        stream.push(null)
        connection.play(stream)
    }

    static isMessageFromChannel(to, channels) {
        if (to.startsWith("##")) return true
        if (process.env.UNIQUE_CHANNEL) return to === "#" + process.env.UNIQUE_CHANNEL
        return channels.some((channel) => Utils.caseInsensitiveStringEquals(to, channel))
    }

    static getBoolFromString(value) {
        return value && value.toLowerCase() === "true"
    }

    static hasRole(roles, roleName) {
        return roles.some(r => r.name === roleName)
    }

    static checkPermissions(roles, roleName) {
        if (!roleName) return true
        if (roleName === "false") return false
        if (roleName === "true") return true

        let roleNames = roleName.split(",")
        if (roleNames.length > 1) {
            roleNames = roleNames.map(r => r.trim())
            return roles.some(r => roleNames.some(r_ => r_ === r))
        } else {
            return this.hasRole(roles, roleName)
        }
    }
}

module.exports = Utils