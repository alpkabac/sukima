class CommandService {
    static remember(msg, from, botTranslations) {
        if (msg.startsWith("!remember ")) {
            if (!botTranslations.memory) botTranslations.memory = {}
            botTranslations.memory[from] = msg.replace("!remember ", "")
            return true
        }
        return false
    }

    static forgetRemember(msg, from, botTranslations) {
        if (msg.startsWith("!remember")) {
            if (!botTranslations.memory) botTranslations.memory = {}
            delete botTranslations.memory[from]
            return true
        }
        return false
    }

    static forgetAllRemember(msg, from, botTranslations) {
        if (msg.startsWith("!forgetAllRemember")) {
            botTranslations.memory = {}
            return true
        }
        return false
    }

    static changeLanguage(msg, from, botTranslations, translations){
        if (msg.startsWith("!lang ")) {
            const language = msg.replace("!lang ", "")
            let message = ""
            try {
                translations = require(`./translations/${language}.json`)
            } catch (e) {

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
    }
}

module.exports = CommandService