require('dotenv').config()
const Command = require("./Command");
const translationsService = require("../translationService");
const channelBotTranslationService = require("../channelBotTranslationService");

const languageCommands = {
    changeLanguage: new Command(
        "Change Language",
        [],
        ["!lang "],
        process.env.ALLOW_CHANGE_LANGUAGE,
        (msg, from, channel, command) => {
            const language = msg.replace(command, "")
            let message = ""
            translationsService.changeLanguage(language)
            if (channelBotTranslationService.changeChannelBotTranslations(channel, language, process.env.BOTNAME)) {
                message += `Loaded bot personality file: ${process.env.BOTNAME}/${language}.json`
            } else {
                message += `Couldn't load bot personality for ${process.env.BOTNAME}/${language}.json`
            }
            if (message) {
                const privateMessage = channel.startsWith("##")
                const botTranslations = channelBotTranslationService.getChannelBotTranslations(channel)
                message = `${message}\n${(privateMessage ? botTranslations.introductionDm : botTranslations.introduction)[0].msg}`
                return {message}
            }
        }
    ),
}

languageCommands.all = [
    languageCommands.changeLanguage
]

module.exports = languageCommands