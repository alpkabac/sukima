require('dotenv').config()
const Command = require("./Command");
const channelBotTranslationService = require("../channelBotTranslationService");

const personalityCommands = {
    setPersonality: new Command(
        "Set Personality",
        [],
        ["!setPersonality "],
        process.env.ALLOW_SET_PERSONALITY,
        async (msg, from, channel, command) => {
            const personality = msg.replace(command, "")

            const aiPersonality = channelBotTranslationService.getChannelBotTranslations(channel)

            if (personality && personality.length > 0) {
                const lines = personality.split("\n")
                let message = ""

                aiPersonality.description = lines[0]
                message += "# Custom AI Personality " + aiPersonality.description + " loaded!\n"

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

                return {message}
            } else {
                return {message: "# Wrong usage of the command. Example: ```!setPersonality [ Character: Alice; gender: female ]\nHello!```"}
            }

        }
    ),
    setJSONPersonality: new Command(
        "Set Personality",
        [],
        ["!setJSONPersonality "],
        process.env.ALLOW_SET_JSON_PERSONALITY,
        async (msg, from, channel, command) => {

        }
    ),
}

personalityCommands.all = [
    personalityCommands.setPersonality,
    personalityCommands.setJSONPersonality,
]

module.exports = personalityCommands