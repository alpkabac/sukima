require('dotenv').config()
const axios = require('axios')
const irc = require('irc');
const options = require('./conf.json')

const ircClient = new irc.Client(options.ircServer, options.botName, {
    channels: [options.channel],
    username: process.env.USERNAME,
    realName: process.env.REALNAME,
    password: process.env.PASSWORD
});

const channelHistory = []
const individualHistories = {}

/**
 * Load translations, you can use the different files for different languages
 */
let translations = require(`./translations/${options.translationFile}.json`)
let botTranslations = require(`./translations/aiPersonality/${options.botName}/${options.translationFile}.json`)

/**
 * Makes the bot send a message randomly if nobody talks
 * Is limited to
 * @return {number} id of the setTimeout
 */
const minBotMessageInterval = 1000 * 60 * options.minBotMessageIntervalInMinutes
const maxBotMessageInterval = 1000 * 60 * options.maxBotMessageIntervalInMinutes
let botConsecutiveMessages = 0

function startTimer() {
    return setTimeout(() => {
        if (botConsecutiveMessages < options.botMaxConsecutiveMessages) {
            generateAndSendMessage(options.channel, channelHistory, true)
            botConsecutiveMessages++
        }
        startTimer()
    }, Math.random() * (maxBotMessageInterval - minBotMessageInterval) + minBotMessageInterval)
}

let timer = startTimer()

function restartInterval() {
    clearTimeout(timer)
    timer = startTimer()
}

/**
 * Replaces the nick of the bot by the bot name
 * Helps the bot AI to keep track of who it is
 * @param msg
 * @return {*}
 */
function replaceNickByBotName(msg) {
    return msg.replace(ircClient.nick, options.botName)
}

/**
 * Updates a given history
 */
function pushIntoHistory(history, entry, isMuted = options.isMuted) {
    if (isMuted) return
    history.push(entry)
    while (history.length > options.maxHistory) history.shift()
}

function upperCaseFirstLetter(str) {
    return str.substr(0, 1).toUpperCase() + str.substr(1)
}

/**
 * Makes the bot react to messages if its name is mentioned
 * FIXME: split code
 */
ircClient.addListener('message', function (from, to, message) {
    // Prevents PM
    if (!to.toLowerCase().includes(options.channel.toLowerCase())) return

    const msg = replaceNickByBotName(
        (upperCaseFirstLetter(message)) // Uppercase the first letter
            .trim()
    )
    console.log(from + ' => ' + to + ': ' + msg);
    botConsecutiveMessages = 0    // Reset consecutive message counter
    restartInterval()

    // Remember a sentence, one per nick allowed
    if (msg.startsWith("!remember ")) {
        if (!botTranslations.memory) botTranslations.memory = {}
        botTranslations.memory[from] = msg.replace("!remember ", "")
    }

    // Forget the sentence associated with your nick
    else if (msg.startsWith("!remember")) {
        if (!botTranslations.memory) botTranslations.memory = {}
        delete botTranslations.memory[from]
    }

    // Change language of the bot on the fly
    else if (msg.startsWith("!lang ")) {
        const language = msg.replace("!lang ", "")
        let message = ""
        try {
            translations = require(`./translations/${language}.json`)
            //message += `Loaded translations: ${language}`
        } catch (e) {
            //message += `Couldn't load translations for ${language}`
        }

        try {
            botTranslations = require(`./translations/aiPersonality/${options.botName}/${language}.json`)
            //message += `\nLoaded bot personality: ${options.botName}/${language}`
        } catch (e) {
            message += (message ? "\n" : "") + `Couldn't load bot personality for ${options.botName}/${language}`
        }

        if (message) {
            ircClient.say(options.channel, message)
        }
    }

    // Forget the whole conversation, keeps introduction and memory
    else if (msg.startsWith("!forget")) {
        channelHistory.splice(0, channelHistory.length)
    }

    // Mute/unmute, stops message generation and conversation memory
    else if (msg.startsWith("!mute")) {
        options.isMuted = true
    } else if (msg.startsWith("!unmute")) {
        options.isMuted = false
    }

    // Only use a simple sentence from the bot as a context, nothing more
    else if (msg.startsWith("!")) {
        const message = upperCaseFirstLetter(msg.slice(1))
        pushIntoHistory(channelHistory, {from, msg: message})
        generateAndSendMessage(options.channel, [{
            from: options.botName,
            msg: botTranslations.noContextSentence
        }, {from: from, msg: message}], false)
    }

    // Only use a simple sentence from the bot as a context, nothing more
    else if (msg.startsWith("?")) {
        const m = upperCaseFirstLetter(msg.slice(1))
        if (m) {
            pushIntoHistory(channelHistory, {from, msg: m})
        }
        generateAndSendMessage(options.channel, channelHistory, true)
    }

    // Normal message, triggers the bot to speak if its name is included
    else {
        pushIntoHistory(channelHistory, {from, msg: msg.replace(":", "")})

        // Detects if the bot name has been mentioned, reacts if it's the case
        if (msg.toLowerCase().includes(options.botName.toLowerCase())) {
            generateAndSendMessage(options.channel, channelHistory, true)
        }
    }
});

/**
 * Makes the bot react when someone joins the channel
 * Also triggered when the bot joins at the start
 */
ircClient.addListener('join', function (channel, nick, message) {
    console.log(`${nick} joined the channel ${options.channel}`)
    if (nick !== ircClient.nick) {
        pushIntoHistory(channelHistory, {from: nick, msg: translations.onJoin})
        generateAndSendMessage(options.channel, channelHistory, true)
    }
});

/**
 * Makes the bot react when someone leaves the channel
 */
ircClient.addListener('part', function (channel, nick) {
    console.log(`${nick} left the channel ${options.channel}`)
    pushIntoHistory(channelHistory, {from: nick, msg: translations.onPart})
    generateAndSendMessage(options.channel, channelHistory, true)
});

/**
 * Makes the bot react when someone quits the channel
 */
ircClient.addListener('quit', function (nick) {
    console.log(`${nick} quit the channel ${options.channel}`)
    pushIntoHistory(channelHistory, {from: nick, msg: translations.onQuit})
    generateAndSendMessage(options.channel, channelHistory, true)
});

/**
 * Makes the bot react when someone is kicked from the channel
 */
ircClient.addListener('kick', function (channel, nick, by, reason) {
    console.log(`${nick} was kicked from the channel ${options.channel} by ${by}, reason: ${reason}`)
    pushIntoHistory(channelHistory, {
        from: nick,
        msg: translations.onKick.replace("${by}", by).replace("${reason}", reason)
    })
    generateAndSendMessage(options.channel, channelHistory, true)
});

/**
 * Makes the bot react when someone makes an action on the channel
 */
ircClient.addListener('action', function (from, channel, text) {
    const msg = replaceNickByBotName((upperCaseFirstLetter(text)).trim())
    console.log(`${from} performed an action on ${options.channel}: ${msg}`)
    if (options.channel === ircClient.nick) {
        pushIntoHistory(individualHistories[from], {from, msg: translations.onAction.replace("${text}", msg)})
        generateAndSendMessage(from, individualHistories[from], true)
    } else {
        pushIntoHistory(channelHistory, {from, msg: translations.onAction.replace("${text}", msg)})
        generateAndSendMessage(options.channel, channelHistory, true)
    }
});

/**
 * Makes the bot react to every PM
 */
ircClient.addListener('pm', function (from, message) {
    if (!individualHistories[from]) individualHistories[from] = []  // Init individual history
    const msg = replaceNickByBotName((upperCaseFirstLetter(message)).trim())
    console.log(from + ' => ' + options.botName + ': ' + msg);
    pushIntoHistory(individualHistories[from], {from, msg}, false)
    generateAndSendMessage(from, individualHistories[from], true)
});

/**
 * Sends message using history and bot introduction as a prompt to generate the message
 * Retries until fulfillment
 * @param to the channel or nick
 * @param history of the conversation
 * @param usesIntroduction if it should use the introduction of the bot
 */
function generateAndSendMessage(to, history, usesIntroduction = false) {
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
    const prompt = intro
            .concat(memory)
            .concat(
                history.slice(-options.maxHistory)                  // Concat the last X messages from history
            )
            .map((msg) => `${msg.from}: ${msg.msg}`)        // Formatting the line
            .join("\n")                                     // Concat the array into multiline string
        + "\n" + options.botName + ":"                              // Add the options.botName so the AI knows it's its turn to speak

    // Tries to generate a message until it works
    generateMessage(prompt, (message, err) => {
        message = (message ? message.trim() : message)
        if (message && !err) {
            const messages = message.split("\n")
            const parsedMessage = message
                .replace(".\n", ". ")
                .replace(". \n", ". ")
                .replace("?\n", "? ")
                .replace("? \n", "? ")
                .replace("!\n", "! ")
                .replace("! \n", "! ")
                .replace(" \n", ". ")
                .replace("\n", ". ")

            history.push({
                from: options.botName,
                msg: parsedMessage
            })

            if (parsedMessage.length > 500){
                ircClient.say(to, parsedMessage.substr(0,500));
                ircClient.say(to, parsedMessage.substr(500));
            }else{
                ircClient.say(to, parsedMessage);
            }

            /*
            for (let m of messages) {
                console.log(options.botName + ' => ' + to + ': ' + m);
                if (m.startsWith("*") && m.endsWith("*")) {
                    ircClient.action(to, m.substr(1, m.length - 2));
                } else {
                    ircClient.say(to, m);
                }
            }
            */
            console.log("<PROMPT>##################################################################")
            console.log(prompt)
            console.log("<ANSWER>>################################################################")
            console.log(messages)
            restartInterval()
        } else {
            generateAndSendMessage(to, history, usesIntroduction)
        }
    })
}

/**
 * Tries to generate a message with the AI API
 * @param prompt to feed to the AI
 * @param callback (aiMessage, err) => null either aiMessage or err if the message was null or empty after processing
 * @param conf {generate_num, temp}
 */
async function generateMessage(prompt, callback = (aiMessage, err) => null, conf = options) {
    const data = {
        prompt,
        nb_answer: 1,   // Keep at 1, AI API allows to generate multiple answers per prompt but we only use the first
        raw: false,     // Keep at false
        generate_num: conf.generate_num, // Number of token to generate
        temp: conf.temp                  // Temperature
    }

    axios.post(options.apiUrl, data)
        .then((result) => {
            const answer = result.data[0].startsWith(options.botName + ": ") ?  // Remove starting bot name if present
                result.data[0].slice((options.botName + ": ").length)
                : result.data[0]

            // Remove everything from the output that is not something that the bot says itself
            const parsedAnswer = answer
                .split(`${options.botName} :`)
                .join("\n")
                .split(`${options.botName}:`)
                .join("\n")
                .split(/([a-zA-Z0-9-_'`\[\]]+ :)/)[0]           // Remove text after first "nick: "
                .split(/([a-zA-Z0-9-_'`\[\]]+:)/)[0]           // Remove text after first "nick:"
                .replace(/  +/g, ' ')      // Remove double spaces
                .replace(/\n /g, '\n')      // Remove double spaces
                .split("\n")
                .slice(0, 10)                                    // Keep only first lines
                .join("\n")
                .trim()
            if (parsedAnswer) {
                callback(parsedAnswer)
            } else {
                callback(null, true)
            }
        })
        .catch((err) => {
            console.log(err)
            callback(null, true)
        })
}