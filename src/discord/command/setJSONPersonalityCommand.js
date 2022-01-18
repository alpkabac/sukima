import dotenv from 'dotenv'
import Command from "../../command/Command.js";
import channelBotTranslationService from "../../service/personalityService.js";
import updateBotInfo from "../discordUtils.js";
import utils from "../../utils.js";

dotenv.config()

const voices = utils.loadJSONFile('./src/tts/languages.json')

const setJSONPersonalityCommand = new Command(
    "Set JSON Personality",
    [],
    ["!setJSONPersonality "],
    process.env.ALLOW_SET_JSON_PERSONALITY,
    async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
        let success = true
        let errorMessages = ""

        if (!process.env.ENABLE_CUSTOM_AI || process.env.ENABLE_CUSTOM_AI.toLowerCase() !== "true") {
            return {error: "# Sorry, but this command is not enabled on this AI."}
        }

        const personalityJSON = msg.replace(command, "")
        let personality
        try {
            personality = JSON.parse(personalityJSON)
        } catch (e) {
            return {error: "# JSON could not be parsed"}
        }

        if (!personality){
            return {error: "# Err, I have no clue what happened =/"}
        }

        const aiPersonality = channelBotTranslationService.getChannelPersonality(channel)

        if (personality.target !== undefined) {
            if (personality.target.toLowerCase() !== ((process.env.BOTNAME).toLowerCase())) {
                return true
            }
        } else {
            return {
                error: "# The `target` property is mandatory and should be a string containing the name of the target bot"
            }
        }

        if (personality.username !== undefined && !channel.startsWith("##")) {
            try {
                await client.user.setUsername(personality.username)
                process.env.BOT_DISCORD_USERNAME = personality.username
            } catch (e) {
                return {
                    error: `# Personality failed to load: Username already taken by too many people or was changed too recently`
                }
            }
        }

        if (personality.botname !== undefined && !channel.startsWith("##")) {
            process.env.BOTNAME = personality.botname
        }

        if (personality.avatar !== undefined && !channel.startsWith("##")) {
            try {
                await client.user.setAvatar(personality.avatar)
            } catch (e) {
                return {
                    error: `# Personality failed to load: The avatar couldn't be loaded or was changed too recently`
                }
            }
        }

        if (personality.description !== undefined) {
            aiPersonality.description = personality.description
        }

        if (personality.contextDm !== undefined) {
            aiPersonality.contextDm = personality.contextDm
        }

        if (personality.context !== undefined) {
            aiPersonality.context = personality.context
        }

        if (personality.noContextSentence !== undefined) {
            aiPersonality.noContextSentence = personality.noContextSentence
        }

        if (personality.noContextSentence !== undefined) {
            aiPersonality.noContextSentence = personality.noContextSentence
        }

        if (personality.voice !== undefined) {
            const selectedVoice = voices.voices
                .find(v => v?.name?.toLowerCase() === personality?.voice?.toLowerCase())
            if (selectedVoice) {
                aiPersonality.voice = selectedVoice
            } else {
                success = false
                errorMessages += "The voice isn't recognized\n"
            }
        }

        if (personality.introduction !== undefined) {
            aiPersonality.introduction = personality.introduction.split("\n").map((l) => {
                return {
                    from: process.env.BOTNAME,
                    msg: l
                }
            })
        }

        if (personality.introductionDm !== undefined) {
            aiPersonality.introductionDm = personality.introductionDm.split("\n").map((l) => {
                return {
                    from: process.env.BOTNAME,
                    msg: l
                }
            })
        }

        const JSONPersonality = JSON.parse(JSON.stringify(aiPersonality))

        if (personality.ENABLE_DM !== undefined && !channel.startsWith("##")) {
            process.env.ENABLE_DM = "" + personality.ENABLE_DM
            JSONPersonality.ENABLE_DM = "" + personality.ENABLE_DM
        }

        if (personality.ENABLE_TTS !== undefined && !channel.startsWith("##")) {
            process.env.ENABLE_TTS = "" + personality.ENABLE_TTS
            JSONPersonality.ENABLE_TTS = "" + personality.ENABLE_TTS
        }

        if (personality.ENABLE_INTRO !== undefined && !channel.startsWith("##")) {
            process.env.ENABLE_INTRO = "" + personality.ENABLE_INTRO
            JSONPersonality.ENABLE_INTRO = "" + personality.ENABLE_INTRO
        }

        if (personality.ENABLE_AUTO_ANSWER !== undefined && !channel.startsWith("##")) {
            process.env.ENABLE_AUTO_ANSWER = "" + personality.ENABLE_AUTO_ANSWER
            JSONPersonality.ENABLE_AUTO_ANSWER = "" + personality.ENABLE_AUTO_ANSWER
        }


        if (JSONPersonality?.voice?.name) {
            JSONPersonality.voice = JSONPersonality.voice?.name
        }

        if (personality.voice !== undefined) {
            JSONPersonality.voice = aiPersonality.voice?.name
        }

        if (JSONPersonality.introduction) {
            JSONPersonality.introduction = JSONPersonality.introduction.map(e => e.msg).join("\n")
        }

        if (JSONPersonality.introductionDm !== undefined) {
            JSONPersonality.introductionDm = JSONPersonality.introductionDm.map(e => e.msg).join("\n")
        }

        if (success && personality.avatar !== undefined) {
            JSONPersonality.avatar = personality.avatar
        }

        JSONPersonality.ENABLE_INTRO = process.env.ENABLE_INTRO
        JSONPersonality.ENABLE_DM = process.env.ENABLE_DM
        JSONPersonality.ENABLE_TTS = process.env.ENABLE_TTS
        JSONPersonality.ENABLE_AUTO_ANSWER = process.env.ENABLE_AUTO_ANSWER

        JSONPersonality.target = personality.target
        JSONPersonality.botname = process.env.BOTNAME
        JSONPersonality.username = process.env.BOT_DISCORD_USERNAME || process.env.BOTNAME

        let stringJSONPersonality = JSON.stringify(JSONPersonality, null, 2)
        if (stringJSONPersonality.length > 1700) {
            stringJSONPersonality = JSON.stringify(JSONPersonality)
            if (stringJSONPersonality.length > 1700) {
                stringJSONPersonality = "{ ...JSON was too long to fit into discord's 2000 character limit per message... }"
            }
        }

        updateBotInfo(client)
        return {
            message: "# " + (success ?
                    `Personality successfully loaded! `
                    : `Personality loaded, but there were errors while trying to edit the AI personality:\n${errorMessages}\n`)
                + `Complete JSON for the loaded personality:\n${stringJSONPersonality}`,
            instantReply: true
        }
    },
    true
)

export default setJSONPersonalityCommand
