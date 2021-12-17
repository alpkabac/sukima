import {config} from "dotenv";

config()
import Command from "./Command.js";
import translationsService from "../service/translationService.js";
import channelBotTranslationService from "../service/personalityService.js";


const languageCommands = {
    changeLanguage: new Command(
        "Change Language",
        [],
        ["!lang "],
        process.env.ALLOW_CHANGE_LANGUAGE,
        (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            let message = ""
            parsedMsg = parsedMsg.replace('.json', '')
            translationsService.changeLanguage(parsedMsg)
            if (channelBotTranslationService.changeChannelPersonality(channel, parsedMsg, process.env.BOTNAME)) {
                message += `Loaded bot personality file: ${process.env.BOTNAME}/${parsedMsg}.json`
            } else {
                return {error: `# Couldn't load bot personality for ${process.env.BOTNAME}/${parsedMsg}.json`}
            }
            if (message) {
                const privateMessage = channel.startsWith("##")
                const botTranslations = channelBotTranslationService.getChannelPersonality(channel)
                message = `${message}\n${(privateMessage ? botTranslations?.introductionDm : botTranslations?.introduction)?.[0]?.msg}`
                return {message, success: true}
            }
        }
    ),
}

languageCommands.all = [
    languageCommands.changeLanguage
]

export default languageCommands