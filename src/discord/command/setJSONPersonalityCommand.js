const Command = require("../../command/Command");
const channelBotTranslationService = require("../../service/personalityService");
const updateBotInfo = require("../discordUtils");

const setJSONPersonalityCommand = new Command(
    "Set JSON Personality",
    [],
    ["!setJSONPersonality "],
    process.env.ALLOW_SET_JSON_PERSONALITY,
    async (msg, from, channel, command, roles) => {
        let success = true
        let errorMessages = ""

        if (!process.env.ENABLE_CUSTOM_AI || process.env.ENABLE_CUSTOM_AI.toLowerCase() !== "true") {
            return {message: "# Sorry, but this command is not enabled on this AI.", channel}
        }

        const personalityJSON = msg.replace(command, "")
        let personality
        try {
            personality = JSON.parse(personalityJSON)
        } catch (e) {
            return {message: "# JSON could not be parsed", channel}
        }

        const aiPersonality = channelBotTranslationService.getChannelPersonality(channel)

        if (personality.target !== undefined) {
            if (personality.target.toLowerCase() !== process.env.BOTNAME.toLowerCase()) {
                return true
            }
        } else {
            return {
                message: "# The `target` property is mandatory and should be a string containing the name of the target bot",
                channel
            }
        }

        if (personality.username !== undefined && !channel.startsWith("##")) {
            try {
                await bot.user.setUsername(personality.username)
                process.env.BOTNAME = personality.username
            } catch (e) {
                return {
                    message: `# Personality failed to load: Username already taken by too many people or was changed too recently`,
                    channel
                }
            }
        }

        if (personality.avatar !== undefined && !channel.startsWith("##")) {
            try {
                await bot.user.setAvatar(personality.avatar)
            } catch (e) {
                return {
                    message: `# Personality failed to load: The avatar couldn't be loaded or was changed too recently`,
                    channel
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
                .find(v => v.name.toLowerCase() === personality.voice.toLowerCase())
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
            JSONPersonality.voice = JSONPersonality.voice.name
        }

        if (personality.voice !== undefined) {
            JSONPersonality.voice = aiPersonality.voice.name
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
        JSONPersonality.username = process.env.BOTNAME

        let stringJSONPersonality = JSON.stringify(JSONPersonality, null, 2)
        if (stringJSONPersonality.length > 1700) {
            stringJSONPersonality = JSON.stringify(JSONPersonality)
            if (stringJSONPersonality.length > 1700) {
                stringJSONPersonality = "{ ...JSON was too long to fit into discord's 2000 character limit per message... }"
            }
        }

        updateBotInfo(bot)
        return {
            message: "# " + (success ?
                    `Personality successfully loaded! `
                    : `Personality loaded, but there were errors while trying to edit the AI personality:\n${errorMessages}\n`)
                + `Complete JSON for the loaded personality:\n${stringJSONPersonality}`
        }
    },
    true
)