import {config} from "dotenv";
import Command from "./Command.js";
import channelBotTranslationService from "../service/personalityService.js";
import {MessageEmbed} from "discord.js";

config()


const personalityCommands = {
    setPersonality: new Command(
        "Set Personality",
        [],
        ["!setPersonality "],
        process.env.ALLOW_SET_PERSONALITY,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            const aiPersonality = channelBotTranslationService.getChannelPersonality(channel)

            if (parsedMsg && parsedMsg.length > 0) {
                const lines = parsedMsg.split("\n")

                aiPersonality.description = lines[0]
                let message = "# Custom AI Personality " + aiPersonality.description + " loaded!\n"

                if (lines.length > 1) {
                    for (let i = 1; i < lines.length; i++) {
                        if (!aiPersonality.introduction[i - 1]) {
                            aiPersonality.introduction[i - 1] = {
                                from: process.env.BOTNAME,
                                msg: lines[i]
                            }
                        } else {
                            aiPersonality.introduction[i - 1].msg = lines[i]
                        }
                        message += aiPersonality.introduction[i - 1].msg
                    }
                }

                return {message, success: true}
            } else {
                return {error: "# Wrong usage of the command. Example: ```!setPersonality [ Character: Alice; gender: female ]\nHello!```"}
            }

        }
    ), displayPersonality: new Command(
        "Display Personality",
        ["!displayPersonality", "!showPersonality"],
        [],
        process.env.ALLOW_DISPLAY_PERSONALITY,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            const aiPersonality = channelBotTranslationService.getChannelPersonality(channel)
            const JSONPersonality = JSON.parse(JSON.stringify(aiPersonality))

            if (JSONPersonality?.voice?.name) {
                JSONPersonality.voice = JSONPersonality.voice.name
            }
            if (JSONPersonality.introduction) {
                JSONPersonality.introduction = JSONPersonality.introduction.map(e => e.msg).join("\n")
            }

            if (JSONPersonality.introductionDm !== undefined) {
                JSONPersonality.introductionDm = JSONPersonality.introductionDm.map(e => e.msg).join("\n")
            }

            JSONPersonality.ENABLE_INTRO = process.env.ENABLE_INTRO
            JSONPersonality.ENABLE_DM = process.env.ENABLE_DM
            JSONPersonality.ENABLE_TTS = process.env.ENABLE_TTS
            JSONPersonality.ENABLE_AUTO_ANSWER = process.env.ENABLE_AUTO_ANSWER
            JSONPersonality.ENABLE_CUSTOM_AI = process.env.ENABLE_CUSTOM_AI
            JSONPersonality.MIN_BOT_MESSAGE_INTERVAL = process.env.MIN_BOT_MESSAGE_INTERVAL
            JSONPersonality.MAX_BOT_MESSAGE_INTERVAL = process.env.MAX_BOT_MESSAGE_INTERVAL
            JSONPersonality.INTERVAL_AUTO_MESSAGE_CHECK = process.env.INTERVAL_AUTO_MESSAGE_CHECK
            JSONPersonality.username = process.env.BOT_DISCORD_USERNAME || process.env.BOTNAME
            JSONPersonality.botname = process.env.BOTNAME


            let chunks = []
            let lines = JSON.stringify(JSONPersonality, null, 2).split('\n')
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]
                const messageWillBeTooLong = chunks.length === 0 || chunks[chunks.length - 1].length + line.length + 2 > 4000
                if (i % 50 === 0 || messageWillBeTooLong) {
                    chunks.push(line)
                } else {
                    chunks[chunks.length - 1] += "\n" + line
                }
            }

            const messages = chunks.map((c, i) => new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`Complete JSON Personality for AI ${process.env.BOTNAME} (page ${i + 1}/${chunks.length})`)
                .setDescription(c))

            return {
                message: messages[0],
                success: true,
                instantReply: true,
                alsoSend: messages && messages?.length > 1 ? messages.slice(1) : null
            }
        }
    ),
}

personalityCommands.all = [
    personalityCommands.setPersonality,
    personalityCommands.displayPersonality,
]

export default personalityCommands