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

    static isMessageFromAllowedChannel(to) {
        if (to.startsWith("##")) return true
        const allowedChannels = process.env.ALLOWED_CHANNEL_NAMES
            .split(',')
            .map(c => c.trim())
        return allowedChannels.some((channel) => Utils.caseInsensitiveStringEquals(to, channel))
    }

    static getBoolFromString(value) {
        return value && value.toLowerCase() === "true"
    }

    static hasRole(roles, roleName) {

        return roles.some(r => {
            console.log(`hasRole("${r.name.toLowerCase()}", "${roleName.toLowerCase()}") (${r.name.toLowerCase() === roleName.toLowerCase()})`)
            return r.name.toLowerCase() === roleName.toLowerCase()
        })
    }

    static checkPermissions(roles, roleName) {
        if (!roleName) return true
        if (roleName === "false") return false
        if (roleName === "true") return true

        let roleNames = roleName.split(",").map(r => r.trim())
        console.log("roleName", roleName)
        if (roleNames.length > 1) {
            roleNames = roleNames.map(r => r.trim())
            console.log("roleNames", roleNames)
            return roleNames.some(r => this.hasRole(roles, r))
        } else {
            return this.hasRole(roles, roleName)
        }
    }
}

module.exports = Utils