const axios = require("axios");
const conf = require("../conf.json");
const messageService = require("./messageService");
const lmiService = require("./lmiService");
const {sleep} = require("./utils");

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
    logit_bias_exp: [
        {
            sequence: [
                1635
            ],
            bias: 0.25,
            ensure_sequence_finish: false,
            generate_once: true
        },
        {
            sequence: [
                9
            ],
            bias: 0.05,
            ensure_sequence_finish: false,
            generate_once: true
        },
        {
            sequence: [3740, 1378],
            bias: 0.45,
            ensure_sequence_finish: true,
            generate_once: true
        }
    ],
    top_k: 0,
    top_p: 0.725,
    eos_token_id: 198,
    repetition_penalty: 1.1875,
    repetition_penalty_range: 1024,
    repetition_penalty_slope: 6.66,
    tail_free_sampling: 1,
    prefix: "vanilla",
    bad_words_ids: null,
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
    const timeStep = conf.minTimeBetweenApiRequestsInSeconds * 1000

    if (lowPriority && isProcessing) {
        return null
    } else {
        isProcessing = true
        const timeDiff = Date.now() - lastGenerationTimestamp
        lastGenerationTimestamp = Date.now()
        await sleep(timeDiff < timeStep ? timeStep - timeDiff : 0)
        const res = await generateUnthrottled(ACCESS_TOKEN, input, params)
        isProcessing = false
        return res
    }
}

class AiService {

    static async sendUntilSuccess(prompt, preventLMI = false) {
        let answer
        let parsedAnswer
        let nbTry = 0
        while (!parsedAnswer && ++nbTry <= 5) {
            answer = await this.sendPrompt(prompt)
            parsedAnswer = messageService.parse(answer)
        }
        if (!preventLMI) {
            lmiService.updateLmi(prompt.prompt, answer, parsedAnswer)
        }

        return parsedAnswer
    }

    static async sendLowPriority(prompt, preventLMI = false) {
        let answer = await this.sendPrompt(prompt, true)

        if (answer) {
            const parsedAnswer = messageService.parse(answer)
            if (!preventLMI) {
                lmiService.updateLmi(prompt.prompt, answer, parsedAnswer)
            }
            return parsedAnswer
        }
    }

    static async sendPrompt(prompt, lowPriority = false) {
        const params = JSON.parse(JSON.stringify(DEFAULT_PARAMETERS))
        params.repetition_penalty_range = prompt.repetition_penalty_range
        return await this.sendPromptDefault(prompt.prompt, params, lowPriority)
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
     */
    static async simpleEvalbot(prompt, tokensToGenerate = 1, preventLMI = false) {
        const params = JSON.parse(JSON.stringify(DEFAULT_PARAMETERS))

        params.max_length = tokensToGenerate
        params.bad_words_ids = undefined
        delete params.bad_words_ids
        params.logit_bias_exp = undefined
        delete params.logit_bias_exp
        params.repetition_penalty = 1.135
        params.repetition_penalty_range = 1024
        params.repetition_penalty_slope = 3.6
        params.tail_free_sampling = 0.422
        params.temperature = 0.48
        params.top_p = 1
        params.top_k = 0

        const result = await this.sendPromptDefault(prompt, params)
        const parsedResult = result
        if (!preventLMI) {
            lmiService.updateLmi(prompt, result, parsedResult)
        }
        return parsedResult
    }
}

module.exports = AiService