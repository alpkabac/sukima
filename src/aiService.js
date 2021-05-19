/**
 * Sends message using history and bot introduction as a prompt to generate the message
 * Retries until fulfillment
 * @param to the channel or nick
 * @param history of the conversation
 * @param botTranslations
 * @param options
 * @param usesIntroduction if it should use the introduction of the bot
 * @param continuation
 */
function generateAndSendMessage(to, history, botTranslations, options, usesIntroduction = false, continuation = false) {
    if (options.isMuted) return

    // Preparing memory by replacing placeholders
    const introduction = botTranslations.introduction.map((e) => {
        return {
            from: e.from.replace("${botName}", options.botName),
            msg: e.msg
        }
    })

    // Preparing context
    const intro = (usesIntroduction ? introduction : [])
    const memory = !usesIntroduction || !botTranslations.memory ?
        []
        : Object.keys(botTranslations.memory).map((key) => {
            return {from: key, msg: botTranslations.memory[key]}
        })


    // Preparing the prompt
    let filter = false
    const prompt = intro
            .concat(memory)
            .concat(
                history.slice(-options.maxHistory)                  // Concat the last X messages from history
            )
            .reverse()
            .filter((msg) => {
                if (!continuation) return true
                if (msg.from === options.botName && !filter) {
                    filter = true
                }
                return filter
            })
            .reverse()
            .map((msg) => `${msg.from}: ${msg.msg}`)        // Formatting the line

            .join("\n")                                     // Concat the array into multiline string
        + (continuation ? "" : ("\n" + options.botName + ":"))                              // Add the options.botName so the AI knows it's its turn to speak

    // Tries to generate a message until it works
    sendRawPrompt(prompt, (message, err) => {
        if (err) {
            return generateAndSendMessage(to, history, usesIntroduction, continuation)
        }

        const answer = message.startsWith(options.botName + ": ") ?  // Remove starting bot name if present
            message.slice((options.botName + ": ").length)
            : message

        // Remove everything from the output that is not something that the bot says itself
        const parsedMessage = answer
            .split(`${options.botName} :`)
            .join("\n")
            .split(`${options.botName}:`)
            .join("\n")
            .split(/([ a-zA-Z0-9-_'`\[\]]+ :)/)[0]           // Remove text after first "nick: "
            .split(/([ a-zA-Z0-9-_'`\[\]]+:)/)[0]           // Remove text after first "nick:"
            .split("\n")
            .map((str) => str.trim())
            .join("\n")
            .replace(/  +/g, ' ')      // Remove double spaces
            .replace(/\n /g, ' ')
            .replace(",\n", ". ")
            .replace(".\n", ". ")
            .replace("?\n", "? ")
            .replace("!\n", "! ")
            .replace("\n", ". ")


        if (!parsedMessage) {
            return generateAndSendMessage(to, history, usesIntroduction, continuation)
        }

        // Update history
        if (!continuation) {
            history.push({
                from: options.botName,
                msg: parsedMessage
            })
        } else {
            history.reverse()
            for (let h of history) {
                if (h.from === options.botName) {
                    if (h.msg.substr(h.msg.length - 1).match(/[,.;?!:]/)) {
                        h.msg += " "
                    }
                    h.msg += parsedMessage
                    break
                }
            }
            history.reverse()
        }

        if (parsedMessage.length > 200) {
            const words = parsedMessage.split(". ")
            let accumulator = words[0]

            for (let i = 1; i < words.length; i++) {
                const word = words[i]

                if ((accumulator.length + word.length) < 200) {
                    accumulator += ". " + word
                } else {
                    ircClient.say(to, accumulator);
                    accumulator = word
                }
            }
            if (accumulator) ircClient.say(to, accumulator);
        } else {
            ircClient.say(to, parsedMessage);
        }

        io.emit("LMI", prompt, message, parsedMessage)
        lastPrompt = prompt
        lastMessage = message
        lastParsedMessage = parsedMessage
        console.log(`<PROMPT>\n${prompt}\n</PROMPT>`.grey.bgBlack)
        console.log(`<ANSWER>\n${message}\n</ANSWER>`.cyan.bgBlack)
        console.log(`<MESSAGE>\n${parsedMessage}\n</MESSAGE>`.green.bgBlack)
        restartInterval()
    })
}

function horniBot(message) {
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

/**
 * Generates an answer given a prompt
 * Retries until fulfillment
 * @param prompt
 * @param tokensToGenerate
 * @param callback
 */
function simpleEvalbot(prompt, tokensToGenerate = 1, callback = (answer) => null) {
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
}

/**
 * Tries to generate a an answer with the AI API
 * @param prompt to feed to the AI
 * @param callback (aiMessage, err) => null either aiMessage or err if the message was null or empty after processing
 * @param conf {generate_num, temp}
 */
async function sendRawPrompt(prompt, callback = (aiMessage, err) => null, conf = options) {
    const data = {
        prompt,
        nb_answer: 1,   // Keep at 1, AI API allows to generate multiple answers per prompt but we only use the first
        raw: false,     // Keep at false
        generate_num: conf.generate_num, // Number of token to generate
        temp: conf.temp                  // Temperature
    }

    axios.post(options.apiUrl, data)
        .then((result) => {
            const answer = result.data[0]
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
