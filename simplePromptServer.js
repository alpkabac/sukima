require('dotenv').config()
const axios = require('axios')
const options = require('./conf.json')
const vocabIndexed = require('./vocabIndexed.json')
const http = require('http')
const fs = require('fs')
const {Server} = require("socket.io");
const server = http.createServer((req, res) => {
    if (req.url === "/") {
        res.writeHead(200, {'content-type': 'text/html'})
        fs.createReadStream('simplePrompt.html').pipe(res)
    }else if (req.url === "/vocab"){
        res.writeHead(200, {'content-type': 'application/json'})
        fs.createReadStream('vocab.json').pipe(res)
    }
})
const io = new Server(server);

io.on('connection', (socket) => {
    socket.on('prompt', async (prompt, nbTokenToGenerate = 20, temperature = 0.65, top_k = 50, top_p = 0.5, repetitionPenalty = 1.5, repetitionPenaltyRange = 512, repetitionPenaltySlope = 3.33) => {
        nbTokenToGenerate = Math.min(100, nbTokenToGenerate)
        const tokensPrompt = (await getTokens(prompt))
        const clampedPrompt = tokensPrompt
            .slice(-2048)
            .map((token)=> vocabIndexed[token].replace('Ġ',' ').replace('Ċ', '\n'))
            .join('')
            .trim()
        const answer = (await getPromptAsync(clampedPrompt, nbTokenToGenerate, temperature, 1, top_k, top_p, repetitionPenalty, repetitionPenaltyRange, repetitionPenaltySlope))[0]
        const tokensAnswer = (await getTokens(answer))

        socket.emit('prompt', clampedPrompt, answer, tokensPrompt, tokensAnswer)
    });

    socket.on('tokens', async (prompt, id) => {
        const tokensPrompt = (await getTokens(prompt)).map((token)=> vocabIndexed[token])
        socket.emit('tokens', tokensPrompt, id)
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
 * @param top_k
 * @param top_p
 * @param repetitionPenalty
 * @param repetitionPenaltyRange
 * @param repetitionPenaltySlope
 */
function getPromptAsync(prompt, nbToken = 1, temperature = 0.65, nbResult = 1, top_k = 50, top_p = 0.5, repetitionPenalty = 1.5, repetitionPenaltyRange = 512, repetitionPenaltySlope = 3.33) {
    return new Promise((accept) => {
        getPrompt(prompt, nbToken, (answer) => {
            accept(answer)
        }, temperature, nbResult, top_k, top_p, repetitionPenalty, repetitionPenaltyRange, repetitionPenaltySlope)
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
 * @param top_k
 * @param top_p
 * @param repetitionPenalty
 * @param repetitionPenaltyRange
 * @param repetitionPenaltySlope
 * @param nbFail
 */
function getPrompt(prompt, nbToken = 1, callback = (answer) => {
}, temperature = 0.65, nbResult = 1, top_k = 50, top_p = 0.5, repetitionPenalty = 1.5, repetitionPenaltyRange = 512, repetitionPenaltySlope = 3.33, nbFail = 0) {
    // Tries to generate a message until it works
    sendPrompt(prompt, nbToken, (message, err) => {
        if (message && !err) {
            callback(message)
        } else if (nbFail < 3) {
            getPrompt(prompt, nbToken, callback, temperature, nbResult, top_k, top_p, repetitionPenalty, repetitionPenaltyRange, repetitionPenaltySlope, ++nbFail)
        }
    }, temperature, nbResult, top_k, top_p, repetitionPenalty, repetitionPenaltyRange, repetitionPenaltySlope)
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
 * @param top_k
 * @param top_p
 * @param repetitionPenalty
 * @param repetitionPenaltyRange
 * @param repetitionPenaltySlope
 */
async function sendPrompt(prompt, nbToken, callback = (aiMessage, err) => null, temperature = 0.65, nbResult = 1, top_k = 50, top_p = 0.5, repetitionPenalty = 1.5, repetitionPenaltyRange = 512, repetitionPenaltySlope = 3.33) {
    const data = {
        prompt,
        nb_answer: nbResult,
        generate_num: nbToken,
        temp: temperature,
        top_k,
        top_p,
        repetition_penalty: repetitionPenalty,
        repetition_penalty_range: repetitionPenaltyRange,
        repetition_penalty_slope: repetitionPenaltySlope
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