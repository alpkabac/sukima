import personalityService from "./personalityService.js";

class AiParametersService {
    static aiParameters = {}

    static getAiParameters(channel) {
        if (!channel) throw new Error("Channel argument is mandatory")

        if (this.aiParameters[channel]) {
            return this.aiParameters[channel]
        }

        const personality = personalityService.getChannelPersonality(channel)

        if (personality && personality.aiParameters) {
            this.aiParameters[channel] = personality.aiParameters
            return this.aiParameters[channel]
        }
    }
}

export default AiParametersService