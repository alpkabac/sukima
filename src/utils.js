const conf = require('../conf.json')

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
                * (conf.maxBotMessageIntervalInMinutes - conf.minBotMessageIntervalInMinutes)
                + conf.minBotMessageIntervalInMinutes
            )
    }
}

module.exports = Utils