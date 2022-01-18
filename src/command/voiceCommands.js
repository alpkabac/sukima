import {config} from "dotenv";

config()
import Command from "./Command.js";
import personalityService from "../service/personalityService.js";
import utils from '../utils.js'

const voices = utils.loadJSONFile("./src/tts/languages.json")


const voiceCommands = {
    setVoice: new Command(
        "Set Voice",
        [],
        ["!setVoice "],
        process.env.ALLOW_SET_VOICE,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {

            const aiPersonality = personalityService.getChannelPersonality(channel)

            if (parsedMsg && parsedMsg.length > 0) {

                const params = parsedMsg.split(" ")

                if (params.length === 1) {
                    const selectedVoice = voices.voices
                        .find(v => v.name.toLowerCase() === params[0].toLowerCase())
                    if (selectedVoice) {
                        aiPersonality.voice = selectedVoice
                        return {
                            message: "# AI Personality voice set to " + JSON.stringify(selectedVoice),
                            success: true
                        }
                    } else {
                        return {error: "# Voice not found, check out https://cloud.google.com/text-to-speech/docs/voices for available voices"}
                    }
                }
            }
            return {
                error: "# Wrong usage. Command for default voice: simpler: \"!setVoice en-US-Wavenet-F\"",
            }
        }
    ),
}

voiceCommands.all = [
    voiceCommands.setVoice,
]

export default voiceCommands