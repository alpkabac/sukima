require('dotenv').config()
const axios = require('axios')
const options = require('./conf.json')
const http = require('http')
const fs = require('fs')
const {Server} = require("socket.io");
const server = http.createServer((req, res) => {
    res.writeHead(200, {'content-type': 'text/html'})
    fs.createReadStream('index.html').pipe(res)
})
const io = new Server(server);

let story = "Alice"
let choices = {}
let suggestions = []

async function main() {
    suggestions = await getSuggestions()

    setInterval(async () => {
        if (choices) {
            const counts = [0, 0, 0, 0, 0]
            for (const [key, value] of Object.entries(choices)) {
                if (value === -1) {
                    counts[4]++
                } else {
                    counts[value]++
                }
            }

            //If there are votes
            if (counts.reduce((a, b) => a + b, 0)) {

                const best = counts.indexOf(Math.max(...counts));
                if (best !== 4) {         // If suggestion
                    story += " " + suggestions[best]
                } else if (best === 4) {  // If retry
                    suggestions = await getSuggestions()
                }

                io.emit('suggestions', suggestions)
                io.emit('story', story)
            }

            choices = {}
        }

    }, 10000)
}


io.on('connection', (socket) => {
    console.log('a user connected');

    socket.emit('story', story)
    socket.emit('suggestions', suggestions)

    let choice = -1
    socket.on('upvote', (sentChoice) => {
        choice = sentChoice
        choices[socket.id] = choice
    });
    socket.on('reroll', () => {
        choice = -1
        choices[socket.id] = choice
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(process.env.PORT || 3000)
main()

async function getSuggestions() {
    const answer = await getPromptAsync(story, 20, 4)
    const answerTokenCount = []
    for (let a of answer) {
        answerTokenCount.push((await getTokens(a)).length)
    }

    return answer
}

//main()

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