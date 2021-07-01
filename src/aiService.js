const axios = require("axios");
const conf = require("../conf.json");
const messageService = require("./messageService");
const lmiService = require("./lmiService");
const LmiService = require("./lmiService");

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

    static async sendPrompt(prompt, nbToken) {
        const data = {
            prompt,
            nb_answer: 1,
            number_generated_tokens: nbToken,
            temp: 0.6,
            top_k: 60,
            top_p: 0.9,
            repetition_penalty: 1.2,
            repetition_penalty_range: 512,
            banned_strings: ["[", "{", "«"]
        }

        return await this.sendPromptDefault(data)
    }

    static async sendPromptDefault(data) {
        return new Promise((resolve, reject) => {
            axios.post(conf.apiUrl + "/prompt", data)
                .then((result) => {
                    const answer = result.data.results[0].content
                    if (answer) {
                        resolve(answer)
                    } else {
                        reject()
                    }
                })
                .catch((err) => {
                    console.warn(err)
                    reject()
                })
        })
    }

    /**
     * Generates an answer given a prompt
     * Retries until fulfillment
     * @param prompt
     * @param tokensToGenerate
     * @param callback
     */
    static async simpleEvalbot(prompt, tokensToGenerate = 1) {
        const data = {
            prompt,
            nb_answer: 1,
            number_generated_tokens: tokensToGenerate,
            temp: 0.8,
            top_k: 60,
            top_p: 0.9,
            repetition_penalty: 2.5,
            repetition_penalty_range: 32,
            banned_strings: []
        }

        const result = await this.sendPromptDefault(data)
        const parsedResult = result.split("\n")[0]
        LmiService.updateLmi(prompt, result, parsedResult)
        return parsedResult
    }
}

module.exports = AiService