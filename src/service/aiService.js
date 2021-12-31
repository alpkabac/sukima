import {config} from "dotenv";

config()
import axios from "axios";
import utils from '../utils.js'
import messageService from "./messageService.js";
import lmiService from "./lmiService.js";
import bannedTokensService from "./bannedTokensService.js";
import phraseBiasService from "./phraseBiasService.js";


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

const DEFAULT_PARAMETERS = {
    use_string: true,
    min_length: 1,
    max_length: 150,
    temperature: 0.8,
    top_k: 0,
    top_p: 0.725,
    eos_token_id: 198,
    repetition_penalty: 1.1875,
    repetition_penalty_range: 1024,
    repetition_penalty_slope: 6.66,
    tail_free_sampling: 1,
    prefix: "vanilla",
}

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

class AiService {
    static async sendUntilSuccess(prompt, preventLMI, channel) {
        let answer
        let parsedAnswer
        let nbTry = 0
        const params = JSON.parse(JSON.stringify(DEFAULT_PARAMETERS))

        params.repetition_penalty_range = prompt.repetition_penalty_range

        if (channel) {
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

    /**
     * Generates an answer given a prompt
     * Retries until fulfillment
     * @param prompt
     * @param tokensToGenerate
     * @param preventLMI
     * @param eos_token_id
     */
    static async simpleEvalbot(prompt, tokensToGenerate = 1, preventLMI = false, eos_token_id = 198) {
        const params = JSON.parse(JSON.stringify(DEFAULT_PARAMETERS))

        params.max_length = tokensToGenerate
        params.bad_words_ids = undefined
        delete params.bad_words_ids
        params.logit_bias_exp = undefined
        delete params.logit_bias_exp
        params.repetition_penalty = 1.16
        params.repetition_penalty_range = 1024
        params.repetition_penalty_slope = 5
        params.tail_free_sampling = 0.422
        params.temperature = 0.55
        params.top_p = 1
        params.top_k = 0
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