import {config} from "dotenv";

config()
import Command from "./Command.js";
import channelBotTranslationService from "../personalityService.js";
import utils from '../utils.js'
const voices = utils.load("./src/tts/languages.json")


const voiceCommands = {
    setVoice: new Command(
        "Set Voice",
        [],
        ["!setVoice "],
        process.env.ALLOW_SET_VOICE,
        async (msg, from, channel, command) => {
            const voice = msg.replace(command, "")

            const aiPersonality = channelBotTranslationService.getChannelPersonality(channel)

            if (voice && voice.length > 0) {
                let message = ""

                const params = voice.split(" ")

                if (params.length === 1) {
                    const selectedVoice = voices.voices
                        .find(v => v.name.toLowerCase() === params[0].toLowerCase())
                    if (selectedVoice) {
                        aiPersonality.voice = selectedVoice
                        message = "AI Personality voice set to " + JSON.stringify(selectedVoice)
                    } else {
                        message = "Voice not found, check out https://cloud.google.com/text-to-speech/docs/voices for available voices"
                    }
                    return {message}
                }
            }
            return {
                message: "# Wrong usage. Command for default voice: simpler: \"!setVoice en-US-Wavenet-F\"",
                success: true
            }
        }
    ),
}

voiceCommands.all = [
    voiceCommands.setVoice,
]

export default voiceCommands