import {config} from "dotenv";
import Command from "./Command.js";
import historyService from "../service/historyService.js";
import utils from "../utils.js";
import promptService from "../service/promptService.js";
import aiService from "../service/aiService.js";
import translationsService from "../service/translationService.js";

config()

const messageCommands = {
    answerToName: new Command(
        "Answer to Name",
        [],
        [],
        null,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            historyService.pushIntoHistory(msg, from, channel, messageId)

            if (!utils.checkPermissions(roles, process.env.ALLOW_REPLY_TO_NAME, channel.startsWith("##"))) {
                return
            }

            if (msg.toLowerCase().includes(process.env.BOTNAME.toLowerCase())) {
                const prompt = promptService.getPrompt(channel)
                const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"), channel)
                return {
                    message: answer,
                    pushIntoHistory: [answer, process.env.BOTNAME, channel]
                }
            }
        },
        false
    )
}

messageCommands.all = [
    messageCommands.answerToName
]

export default messageCommands