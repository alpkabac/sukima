const axios = require("axios");
const conf = require("../conf.json");
const messageService = require("./messageService");
const lmiService = require("./lmiService");

class AiService {

    static async sendUntilSuccess(prompt, nbToken = conf.generate_num, temp = 0.65, callback = (answer) => null) {
        let answer
        let parsedAnswer
        let nbTry = 0
        while (!parsedAnswer && ++nbTry <= 5) {
            answer = await this.sendPrompt(prompt, nbToken)
            parsedAnswer = messageService.parse(answer)
        }
        lmiService.updateLmi(prompt, answer, parsedAnswer)
        callback(parsedAnswer)
    }

    static async sendPrompt(prompt, nbToken) {
        return new Promise((resolve, reject) => {
            const data = {
                prompt,
                nb_answer: 1,
                number_generated_tokens: nbToken,
                temp: 0.6,
                top_k: 60,
                top_p: 0.9,
                repetition_penalty: 1.3,
                repetition_penalty_range: 128,
                banned_strings: ["(", "[","{", "<", "«"]
            }

            axios.post(conf.apiUrl+"/prompt", data)
                .then((result) => {
                    const answer = result.data.results[0].content
                    if (answer) {
                        resolve(answer)
                    } else {
                        reject()
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject()
                })
        })
    }

    /*
    static horniBot(message) {
        const prompt = (
                evalbotHorni.shuffle ? (evalbotHorni.examples
                        .map((e) => e)                      // copy
                        .sort(() => Math.random() - 0.5)    // Shuffle
                ) : evalbotHorni.examples
            )
                .map((e) => `${evalbotHorni.inputLabel}${e.input}${evalbotHorni.outputLabel} ${e.output}`)
                .join("\n\n")
            + `\n\n${evalbotHorni.inputLabel}${message}${evalbotHorni.outputLabel}`


        simpleEvalbot(prompt, evalbotHorni.tokensToGenerate, (message) => {
            console.log("<prompt>")
            console.log(prompt)
            console.log("</prompt>")

            console.log("<message>")
            console.log(message)
            console.log("</message>")
        })
    }
     */

    /**
     * Generates an answer given a prompt
     * Retries until fulfillment
     * @param prompt
     * @param tokensToGenerate
     * @param callback
     */
    /*static simpleEvalbot(prompt, tokensToGenerate = 1, callback = (answer) => null) {
        // Tries to generate a message until it works
        sendRawPrompt(prompt, (message, err) => {
            message = message.trim()
            if (message && !err) {
                callback(message)
            } else {
                simpleEvalbot(prompt, tokensToGenerate, callback)
            }
        }, {
            generate_num: tokensToGenerate,
            temp: 0.7
        })
    }*/
}

module.exports = AiService