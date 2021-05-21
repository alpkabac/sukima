const axios = require("axios");
const conf = require("../conf.json");
const messageService = require("./messageService");
const lmiService = require("./lmiService");

class AiService {

    static async sendUntilSuccess(prompt, nbToken = conf.generate_num, temp = 0.65, callback = (answer) => null) {
        let answer
        let parsedAnswer
        while (!parsedAnswer) {
            answer = await this.sendPrompt(prompt, nbToken, temp)
            parsedAnswer = messageService.parse(answer)
        }
        lmiService.updateLmi(prompt, answer, parsedAnswer)
        callback(parsedAnswer)
    }

    static async sendPrompt(prompt, nbToken, temp = 0.65) {
        return new Promise((resolve, reject) => {
            const data = {
                prompt,
                nb_answer: 1,           // Keep at 1
                raw: false,             // Keep at false
                generate_num: nbToken,  // Number of token to generate
                temp                    // Temperature
            }

            axios.post(conf.apiUrl, data)
                .then((result) => {
                    const answer = result.data[0]
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