require('dotenv').config()
const axios = require('axios')
const options = require('./conf.json')


async function main() {
    const prompt = ``
    const promptTokenCount = (await getTokens(prompt)).length
    const answer = await getPromptAsync(prompt, 20, 5)
    const answerTokenCount = []
    for (let a of answer) {
        answerTokenCount.push((await getTokens(a)).length)
    }

    console.log(`########################################################################################################################`)
    console.log(`Prompt tokens: ${promptTokenCount}, answer tokens: ${answerTokenCount.join("/")}`)
    console.log("\x1b[93m", prompt)
    for (let i = 0; i < answer.length; i++) {
        console.log(i % 2 ? "\x1b[37m" : "\x1b[90m", answer[i])
    }

    console.log("\x1b[0m")
}

main()

/**
 * Returns an AI generated text continuing your prompt
 * Retries until fulfillment
 * @param prompt
 * @param nbToken
 * @param nbResult
 */
function getPromptAsync(prompt, nbToken = 1, nbResult = 1) {
    return new Promise((accept) => {
        getPrompt(prompt, nbToken, (answer) => {
            accept(answer)
        }, nbResult)
    })
}

/**
 * Returns an AI generated text continuing your prompt
 * Retries until fulfillment
 * @param prompt
 * @param nbToken
 * @param callback
 * @param nbResult
 */
function getPrompt(prompt, nbToken = 1, callback = (answer) => {
}, nbResult = 1) {
    // Tries to generate a message until it works
    sendPrompt(prompt, nbToken, (message, err) => {
        if (message && !err) {
            callback(message)
        } else {
            getPrompt(prompt, nbToken, callback, nbResult)
        }
    }, nbResult)
}

/**
 * Tries to generate a message with the AI API
 * @param prompt to feed to the AI
 */
function getTokens(prompt) {
    return new Promise((accept, reject) => {
        const data = {
            prompt,
        }

        axios.post(options.apiUrlToken, data)
            .then((result) => {
                const answer = result.data
                if (answer) {
                    accept(answer)
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

/**
 * Tries to generate a message with the AI API
 * @param prompt to feed to the AI
 * @param nbToken
 * @param callback (aiMessage, err) => null either aiMessage or err if the message was null or empty after processing
 * @param nbResult
 */
async function sendPrompt(prompt, nbToken, callback = (aiMessage, err) => null, nbResult = 1) {
    const data = {
        prompt,
        nb_answer: nbResult,
        raw: false,     // Keep at false
        generate_num: nbToken, // Number of token to generate
        temp: options.temp                  // Temperature
    }

    axios.post(options.apiUrl, data)
        .then((result) => {
            const answer = result.data
            if (answer) {
                callback(answer)
            } else {
                callback(null, true)
            }
        })
        .catch((err) => {
            console.log(err)
            callback(null, true)
        })
}