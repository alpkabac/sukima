require('dotenv').config()
const axios = require('axios')
const options = require('./conf.json')
const http = require('http')
const fs = require('fs')
const {Server} = require("socket.io");
const server = http.createServer((req, res) => {
    res.writeHead(200, {'content-type': 'text/html'})
    fs.createReadStream('indexSimplePrompt.html').pipe(res)
})
const io = new Server(server);

io.on('connection', (socket) => {
    socket.on('prompt', async (prompt, nbTokenToGenerate = 20, temperature = 0.65) => {
        nbTokenToGenerate = Math.min(100, nbTokenToGenerate)
        const answer = (await getPromptAsync(prompt, nbTokenToGenerate, temperature))[0]
        const tokensPrompt = (await getTokens(prompt))
        const tokensAnswer = (await getTokens(answer))

        socket.emit('prompt', prompt, answer, tokensPrompt, tokensAnswer)
    });
});

server.listen(process.env.PORT || 3003)

/**
 * Returns an AI generated text continuing your prompt
 * Retries until fulfillment
 * @param prompt
 * @param nbToken
 * @param temperature
 * @param nbResult
 */
function getPromptAsync(prompt, nbToken = 1, temperature = 0.65, nbResult = 1) {
    return new Promise((accept) => {
        getPrompt(prompt, nbToken, (answer) => {
            accept(answer)
        }, temperature, nbResult)
    })
}

/**
 * Returns an AI generated text continuing your prompt
 * Retries until fulfillment
 * @param prompt
 * @param nbToken
 * @param callback
 * @param temperature
 * @param nbResult
 */
function getPrompt(prompt, nbToken = 1, callback = (answer) => {
}, temperature = 0.65, nbResult = 1) {
    // Tries to generate a message until it works
    sendPrompt(prompt, nbToken, (message, err) => {
        if (message && !err) {
            callback(message)
        } else {
            getPrompt(prompt, nbToken, callback, temperature, nbResult)
        }
    }, temperature, nbResult)
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
 * @param temperature
 * @param nbResult
 */
async function sendPrompt(prompt, nbToken, callback = (aiMessage, err) => null, temperature = 0.65, nbResult = 1) {
    const data = {
        prompt,
        nb_answer: nbResult,
        raw: false,     // Keep at false
        generate_num: nbToken,
        temp: temperature
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