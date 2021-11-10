const axios = require("axios");
const conf = require("../conf.json");
const messageService = require("./messageService");
const lmiService = require("./lmiService");

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
    max_length: 2048,
    temperature: 0.75,
    logit_bias_exp: [
        {
            sequence: [
                1635
            ],
            bias: 0.3,
            ensure_sequence_finish: false,
            generate_once: true
        },
        {
            sequence: [
                9
            ],
            bias: 0.1,
            ensure_sequence_finish: false,
            generate_once: true
        }
    ],
    top_k: 140,
    top_p: 0.9,
    eos_token_id: 198,
    repetition_penalty: 1.1875,
    repetition_penalty_range: 512,
    repetition_penalty_slope: 6.57,
    tail_free_sampling: 1,
    prefix: "vanilla",

    bad_words_ids: [
        [
            27,
            91,
            437,
            1659,
            5239,
            91,
            29
        ],
        [
            1279,
            91,
            437,
            1659,
            5239,
            91,
            29
        ],
        [
            27,
            91,
            10619,
            46,
            9792,
            13918,
            91,
            29
        ],
        [
            1279,
            91,
            10619,
            46,
            9792,
            13918,
            91,
            29
        ],
        [
            58
        ],
        [
            60
        ],
        [
            90
        ],
        [
            92
        ],
        [
            685
        ],
        [
            1391
        ],
        [
            1782
        ],
        [
            2361
        ],
        [
            3693
        ],
        [
            4083
        ],
        [
            4357
        ],
        [
            4895
        ],
        [
            5512
        ],
        [
            5974
        ],
        [
            7131
        ],
        [
            8183
        ],
        [
            8351
        ],
        [
            8762
        ],
        [
            8964
        ],
        [
            8973
        ],
        [
            9063
        ],
        [
            11208
        ],
        [
            11709
        ],
        [
            11907
        ],
        [
            11919
        ],
        [
            12878
        ],
        [
            12962
        ],
        [
            13018
        ],
        [
            13412
        ],
        [
            14631
        ],
        [
            14692
        ],
        [
            14980
        ],
        [
            15090
        ],
        [
            15437
        ],
        [
            16151
        ],
        [
            16410
        ],
        [
            16589
        ],
        [
            17241
        ],
        [
            17414
        ],
        [
            17635
        ],
        [
            17816
        ],
        [
            17912
        ],
        [
            18083
        ],
        [
            18161
        ],
        [
            18477
        ],
        [
            19629
        ],
        [
            19779
        ],
        [
            19953
        ],
        [
            20520
        ],
        [
            20598
        ],
        [
            20662
        ],
        [
            20740
        ],
        [
            21476
        ],
        [
            21737
        ],
        [
            22133
        ],
        [
            22241
        ],
        [
            22345
        ],
        [
            22935
        ],
        [
            23330
        ],
        [
            23785
        ],
        [
            23834
        ],
        [
            23884
        ],
        [
            25295
        ],
        [
            25597
        ],
        [
            25719
        ],
        [
            25787
        ],
        [
            25915
        ],
        [
            26076
        ],
        [
            26358
        ],
        [
            26398
        ],
        [
            26894
        ],
        [
            26933
        ],
        [
            27007
        ],
        [
            27422
        ],
        [
            28013
        ],
        [
            29164
        ],
        [
            29225
        ],
        [
            29342
        ],
        [
            29565
        ],
        [
            29795
        ],
        [
            30072
        ],
        [
            30109
        ],
        [
            30138
        ],
        [
            30866
        ],
        [
            31161
        ],
        [
            31478
        ],
        [
            32092
        ],
        [
            32239
        ],
        [
            32509
        ],
        [
            33116
        ],
        [
            33250
        ],
        [
            33761
        ],
        [
            34171
        ],
        [
            34758
        ],
        [
            34949
        ],
        [
            35944
        ],
        [
            36338
        ],
        [
            36463
        ],
        [
            36563
        ],
        [
            36786
        ],
        [
            36796
        ],
        [
            36937
        ],
        [
            37250
        ],
        [
            37913
        ],
        [
            37981
        ],
        [
            38165
        ],
        [
            38362
        ],
        [
            38381
        ],
        [
            38430
        ],
        [
            38892
        ],
        [
            39850
        ],
        [
            39893
        ],
        [
            41832
        ],
        [
            41888
        ],
        [
            42535
        ],
        [
            42669
        ],
        [
            42785
        ],
        [
            42924
        ],
        [
            43839
        ],
        [
            44438
        ],
        [
            44587
        ],
        [
            44926
        ],
        [
            45144
        ],
        [
            45297
        ],
        [
            46110
        ],
        [
            46570
        ],
        [
            46581
        ],
        [
            46956
        ],
        [
            47175
        ],
        [
            47182
        ],
        [
            47527
        ],
        [
            47715
        ],
        [
            48600
        ],
        [
            48683
        ],
        [
            48688
        ],
        [
            48874
        ],
        [
            48999
        ],
        [
            49074
        ],
        [
            49082
        ],
        [
            49146
        ],
        [
            49946
        ],
        [
            10221
        ],
        [
            4841
        ],
        [
            1427
        ],
        [
            2602,
            834
        ],
        [
            29343
        ],
        [
            37405
        ],
        [
            35780
        ],
        [
            2602
        ],
        [
            17202
        ],
        [
            8162
        ],
        [
            50256
        ]
    ]
}

const generateUnthrottled = async (accessToken, input, params) => {
    let res
    try {
        res = await axios.post(
            "https://api.novelai.net/ai/generate",
            {
                input,
                model: "6B-v4",
                parameters: params
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': "Bearer " + ACCESS_TOKEN
                }
            }
        )
    }catch{
        res = null
    }

    return res?.data?.output
}

let isProcessing = false
// throttles generation at one request per second
const generate = async function (input, params, lowPriority = false) {
    if (!ACCESS_TOKEN) ACCESS_TOKEN = await getAccessToken(process.env.NOVEL_AI_API_KEY)
    const timeStep = conf.minTimeBetweenApiRequestsInSeconds * 1000

    return new Promise((resolve, reject) => {
        if (lowPriority && isProcessing) {
            resolve(null)
        } else {
            isProcessing = true
            const timeDiff = Date.now() - lastGenerationTimestamp
            lastGenerationTimestamp = Date.now()
            setTimeout(async () => {
                try {
                    const res = await generateUnthrottled(ACCESS_TOKEN, input, params)
                    isProcessing = false
                    resolve(res)
                }catch{
                    reject(null)
                }
            }, timeDiff < timeStep ? timeStep - timeDiff : 0)
        }
    })
}

class AiService {

    static async sendUntilSuccess(prompt, nbToken = conf.generate_num, preventLMI = false, callback = (answer) => null) {
        let answer
        let parsedAnswer
        let nbTry = 0
        while (!parsedAnswer && ++nbTry <= 5) {
            answer = await this.sendPrompt(prompt, nbToken)
            parsedAnswer = messageService.parse(answer)
        }
        if (!preventLMI) {
            lmiService.updateLmi(prompt, answer, parsedAnswer)
        }
        callback(parsedAnswer)
    }

    static async sendLowPriority(prompt, nbToken = conf.generate_num, preventLMI = false) {
        let answer = await this.sendPrompt(prompt, nbToken, true)

        if (answer) {
            const parsedAnswer = messageService.parse(answer)
            if (!preventLMI) {
                lmiService.updateLmi(prompt, answer, parsedAnswer)
            }
            return parsedAnswer
        }
    }

    static async sendPrompt(prompt, nbToken, lowPriority = false) {
        return await this.sendPromptDefault(prompt, undefined, lowPriority)
    }

    static async sendPromptDefault(prompt, params = DEFAULT_PARAMETERS, lowPriority = false) {
        return new Promise((resolve, reject) => {
            generate(prompt, params, lowPriority)
                .then(r => resolve(r))
                .catch(err => reject(err))
        })
    }

    /**
     * Generates an answer given a prompt
     * Retries until fulfillment
     * @param prompt
     * @param tokensToGenerate
     */
    static async simpleEvalbot(prompt, tokensToGenerate = 1) {
        const params = JSON.parse(JSON.stringify(DEFAULT_PARAMETERS))

        params.max_length = tokensToGenerate
        params.bad_words_ids = undefined
        delete params.bad_words_ids

        const result = await this.sendPromptDefault(prompt, params)
        const parsedResult = result.split("\n")[0]
        lmiService.updateLmi(prompt, result, parsedResult)
        return parsedResult
    }
}

module.exports = AiService