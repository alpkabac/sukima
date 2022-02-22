import {config} from "dotenv";
import personalityService from "./personalityService.js";
import fs from "fs";
import utils from "../utils.js";
import envService from "../util/envService.js";

config()

class AiParametersService {
    static aiParameters = {}

    static getAiParameters(channel) {
        if (!channel) throw new Error("Channel argument is mandatory")

        if (this.aiParameters[channel]) {
            return this.aiParameters[channel]
        }

        if (fs.existsSync(`./bot/${process.env.BOT_ID}/default.preset`)) {
            this.aiParameters[channel] = AiParametersService.loadPresetFile(`./bot/${process.env.BOT_ID}/default.preset`)
            if (this.aiParameters[channel]) return this.aiParameters[channel]
        }

        const personality = personalityService.getChannelPersonality(channel)

        if (personality && personality.aiParameters) {
            this.aiParameters[channel] = personality.aiParameters
            return this.aiParameters[channel]
        }
    }

    static loadPresetFile(filePath) {
        const file = utils.loadJSONFile(filePath)
        if (!file?.parameters) return null
        const parameters = file.parameters
        parameters.prefix = envService.getAiModule()
        parameters.use_string = true
        parameters.min_length = 1
        parameters.max_length = process.env.TOKEN_LIMIT === "2048" ? 150 : 100
        parameters.eos_token_id = 198

        if (parameters.repetition_penalty) {
            const oldRange = 1 - 8
            const newRange = 1 - 1.525
            parameters.repetition_penalty = ((parameters.repetition_penalty - 1) * newRange) / oldRange + 1
        }

        if (parameters.order) {
            parameters.order = parameters.order.map(o =>
                ["temperature", "top_k", "top_p", "tfs", "top_a", "typical_p"].indexOf(o.id)
            )
        }
        return parameters
    }
}

export default AiParametersService