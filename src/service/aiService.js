import {config} from "dotenv";
import axios from "axios";
import utils from '../utils.js'
import messageService from "./messageService.js";
import lmiService from "./lmiService.js";
import phraseBiasService from "./phraseBiasService.js";
import bannedTokensService from "./bannedTokensService.js";
import aiParametersService from "./aiParametersService.js";

config()


const conf = utils.load("./conf.json")
let lastGenerationTimestamp = Date.now()

const getAccessToken = async (access_key) => {
    return new Promise((resolve, reject) => {
        axios.post("https://api.novelai.net/user/login", {key: access_key}, {
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(r => {
                resolve(r.data.accessToken)
            })
            .catch(err => {
                reject(err)
            })
    })
}

let ACCESS_TOKEN

const DEFAULT_PARAMETERS = utils.load("./data/aiParameters/personality_default.json")
const DEFAULT_PARAMETERS_EVALBOT = utils.load("./data/aiParameters/evalbot_default.json")

const generateUnthrottled = async (accessToken, input, params) => {
    let res
    try {
        res = await axios.post(
            "https://api.novelai.net/ai/generate",
            {
                input,
                model: process.env.AI_MODEL || "6B-v4",
                parameters: params
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': "Bearer " + ACCESS_TOKEN
                }
            }
        )
    } catch {
        res = null
    }

    return res?.data?.output
}


const generateUnthrottledCustom = async (input, parameters, model) => {
    let res
    try {
        res = await axios.post(
            "https://api.novelai.net/ai/generate",
            {
                input,
                model,
                parameters
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': "Bearer " + ACCESS_TOKEN
                }
            }
        )
    } catch {
        res = null
    }

    return res?.data?.output
}


let isProcessing = false
// throttles generation at one request per second
const generate = async function (input, params, lowPriority = false) {
    if (!ACCESS_TOKEN) ACCESS_TOKEN = await getAccessToken(process.env.NOVEL_AI_API_KEY)
    const timeStep = parseInt(conf.minTimeBetweenApiRequestsInSeconds) * 1000

    if (lowPriority && isProcessing) {
        return null
    } else {
        isProcessing = true
        const timeDiff = Date.now() - lastGenerationTimestamp
        lastGenerationTimestamp = Date.now()
        await utils.sleep(timeDiff < timeStep ? timeStep - timeDiff : 0)
        const res = await generateUnthrottled(ACCESS_TOKEN, input, params)
        isProcessing = false
        return res
    }
}

const generateCustom = async function (input, parameters, model) {
    if (!ACCESS_TOKEN) ACCESS_TOKEN = await getAccessToken(process.env.NOVEL_AI_API_KEY)
    const timeStep = parseInt(conf.minTimeBetweenApiRequestsInSeconds) * 1000

    isProcessing = true
    const timeDiff = Date.now() - lastGenerationTimestamp
    lastGenerationTimestamp = Date.now()
    await utils.sleep(timeDiff < timeStep ? timeStep - timeDiff : 0)
    const res = await generateUnthrottledCustom(input, parameters, model)
    isProcessing = false
    return res
}


class AiService {
    static async sendUntilSuccess(prompt, preventLMI, channel) {
        let answer
        let parsedAnswer
        let nbTry = 0
        let params = JSON.parse(JSON.stringify(DEFAULT_PARAMETERS))

        params.repetition_penalty_range = prompt.repetition_penalty_range

        if (channel) {
            const aiParameters = aiParametersService.getAiParameters(channel)
            if (aiParameters){
                params = aiParameters
            }

            const bannedTokens = bannedTokensService.getBannedTokens(channel)
            if (bannedTokens && bannedTokens.length > 0)
                params.bad_words_ids = bannedTokens

            const phraseBiases = phraseBiasService.getPhraseBiases(channel)
            if (phraseBiases && phraseBiases.length > 0)
                params.logit_bias_exp = phraseBiases
        }

        while (!parsedAnswer && ++nbTry <= 3) {
            answer = await this.sendPromptDefault(prompt.prompt, params)
            parsedAnswer = messageService.parse(answer)
        }

        if (!preventLMI) {
            lmiService.updateLmi(prompt.prompt, answer, parsedAnswer)
        }

        return parsedAnswer
    }

    static async sendPromptDefault(prompt, params = DEFAULT_PARAMETERS, lowPriority = false) {
        return await generate(prompt, params, lowPriority)
    }

    static async executePrompt(prompt, params, model) {
        return await generateCustom(prompt, params, model)
    }

    /**
     * Generates an answer given a prompt
     * Retries until fulfillment
     * @param prompt
     * @param tokensToGenerate
     * @param preventLMI
     * @param eos_token_id
     */
    static async simpleEvalbot(prompt, tokensToGenerate = 1, preventLMI = false, eos_token_id = 198) {
        const params = JSON.parse(JSON.stringify(DEFAULT_PARAMETERS_EVALBOT))

        params.max_length = tokensToGenerate
        params.eos_token_id = eos_token_id

        const result = await this.sendPromptDefault(prompt, params)
        const parsedResult = result
        if (!preventLMI) {
            lmiService.updateLmi(prompt, result, parsedResult)
        }
        return parsedResult
    }
}

export default AiService