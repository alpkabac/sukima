require('dotenv').config()
const {Client} = require("discord.js");
require("../discord/ExtAPIMessage");
const voices = JSON.parse(JSON.stringify(require('../tts/languages.json')))
const conf = require("../../conf.json")
const aiService = require('../aiService')

const bot = new Client({
    allowedMentions: {
        // set repliedUser value to `false` to turn off the mention by default
        repliedUser: false
    }
});

const botService = require('../botService')
const channelBotTranslationService = require('../channelBotTranslationService')
const commandService = require("../commandService");
const {getInterval} = require("../utils");
const Utils = require("../utils");

const TOKEN = process.env.TOKEN;
bot.login(TOKEN);
const channels = []
let locked = false


let connection
let voiceChannel
let setJSONPersonality
let speak = null


function replaceAsterisksByBackQuotes(text) {
    return text.replace(/\*/g, '`')
}

function replaceBackQuotesByAsterisks(text) {
    return text.replace(/`/g, '*')
}

bot.on('ready', async () => {
    console.info(`Logged in as ${bot.user.tag}!`)

    setJSONPersonality = async function (msg, from, channel) {
        const command = "!setJSONPersonality "

        if (msg.toLowerCase().startsWith(command.toLowerCase())) {
            // TODO: check if user 'from' is allowed to execute that command

            let success = true
            let errorMessages = ""

            if (!process.env.ENABLE_CUSTOM_AI || process.env.ENABLE_CUSTOM_AI.toLowerCase() !== "true") {
                return {message: "# Sorry, but this command is not enabled on this AI.", channel}
            }
            if (conf.changePersonalityChannelBlacklist.includes(channel)) {
                return {message: "# Sorry, but this channel personality is locked.", channel}
            }


            const personalityJSON = msg.replace(command, "")
            let personality
            try {
                personality = JSON.parse(personalityJSON)
            } catch (e) {
                return {message: "# JSON could not be parsed"}
            }

            const aiPersonality = channelBotTranslationService.getChannelBotTranslations(channel)

            if (personality.target !== undefined){
                if (personality.target.toLowerCase() !== process.env.BOTNAME.toLowerCase()){
                    return true
                }
            }

            if (personality.username !== undefined) {
                try {
                    await bot.user.setUsername(personality.username)
                    process.env.BOTNAME = personality.username
                } catch (e) {
                    return {
                        message: `# Personality failed to load: Username already taken by too many people or was changed too recently`,
                        channel
                    }
                }
            }

            if (personality.avatar !== undefined) {
                try {
                    await bot.user.setAvatar(personality.avatar)
                } catch (e) {
                    return {
                        message: `# Personality failed to load: The avatar couldn't be loaded or was changed too recently`,
                        channel
                    }
                }
            }

            if (personality.description !== undefined) {
                aiPersonality.description = personality.description
            }

            if (personality.contextDm !== undefined) {
                aiPersonality.contextDm = personality.contextDm
            }

            if (personality.context !== undefined) {
                aiPersonality.context = personality.context
            }

            if (personality.noContextSentence !== undefined) {
                aiPersonality.noContextSentence = personality.noContextSentence
            }

            if (personality.noContextSentence !== undefined) {
                aiPersonality.noContextSentence = personality.noContextSentence
            }

            if (personality.voice !== undefined) {
                const selectedVoice = voices.voices
                    .find(v => v.name.toLowerCase() === personality.voice.toLowerCase())
                if (selectedVoice) {
                    aiPersonality.voice = selectedVoice
                } else {
                    success = false
                    errorMessages += "The voice isn't recognized\n"
                }
            }

            if (personality.introduction !== undefined) {
                aiPersonality.introduction = personality.introduction.split("\n").map((l) => {
                    return {
                        from: process.env.BOTNAME,
                        msg: l
                    }
                })
            }

            if (personality.introductionDm !== undefined) {
                aiPersonality.introductionDm = personality.introductionDm.split("\n").map((l) => {
                    return {
                        from: process.env.BOTNAME,
                        msg: l
                    }
                })
            }

            const JSONPersonality = JSON.parse(JSON.stringify(aiPersonality))

            if (personality.ENABLE_DM !== undefined) {
                process.env.ENABLE_DM = "" + personality.ENABLE_DM
                JSONPersonality.ENABLE_DM = "" + personality.ENABLE_DM
            }

            if (personality.ENABLE_TTS !== undefined) {
                process.env.ENABLE_TTS = "" + personality.ENABLE_TTS
                JSONPersonality.ENABLE_TTS = "" + personality.ENABLE_TTS
            }

            if (personality.ENABLE_INTRO !== undefined) {
                process.env.ENABLE_INTRO = "" + personality.ENABLE_INTRO
                JSONPersonality.ENABLE_INTRO = "" + personality.ENABLE_INTRO
            }

            if (personality.ENABLE_AUTO_ANSWER !== undefined) {
                process.env.ENABLE_AUTO_ANSWER = "" + personality.ENABLE_AUTO_ANSWER
                JSONPersonality.ENABLE_AUTO_ANSWER = "" + personality.ENABLE_AUTO_ANSWER
            }

            if (personality.voice !== undefined) {
                JSONPersonality.voice = aiPersonality.voice.name
            }

            if (JSONPersonality.introduction) {
                JSONPersonality.introduction = JSONPersonality.introduction.map(e => e.msg).join("\n")
            }

            if (JSONPersonality.introductionDm !== undefined) {
                JSONPersonality.introductionDm = JSONPersonality.introductionDm.map(e => e.msg).join("\n")
            }

            if (success && personality.avatar !== undefined) {
                JSONPersonality.avatar = personality.avatar
            }

            JSONPersonality.ENABLE_INTRO = process.env.ENABLE_INTRO
            JSONPersonality.ENABLE_DM = process.env.ENABLE_DM
            JSONPersonality.ENABLE_TTS = process.env.ENABLE_TTS
            JSONPersonality.ENABLE_AUTO_ANSWER = process.env.ENABLE_AUTO_ANSWER

            let stringJSONPersonality = JSON.stringify(JSONPersonality, null, 2)
            if (stringJSONPersonality.length > 1700) {
                stringJSONPersonality = JSON.stringify(JSONPersonality)
                if (stringJSONPersonality.length > 1700) {
                    stringJSONPersonality = "{ ...JSON was too long to fit into discord's 2000 character limit per message... }"
                }
            }
            return {
                message: "# "+(success ?
                        `Personality successfully loaded! `
                        : `Personality loaded, but there were errors while trying to edit the AI personality:\n${errorMessages}\n`)
                    + `Complete JSON for the loaded personality:\n${stringJSONPersonality}`
                ,
                channel
            }
        } else {
            return false
        }
    }

    speak = async function (msg, channel) {
        if (process.env.ENABLE_TTS && process.env.ENABLE_TTS.toLowerCase() === "true") {

            if (voiceChannel) {
                connection = bot.voice.connections.find((vc) => vc.channel.id === voiceChannel.id)
                if (!connection) {
                    console.log("No connection is present for TTS, getting connection...")
                    connection = await voiceChannel.join()
                    if (connection) {
                        console.log("TTS connection found!")
                    }
                }
                if (connection) {
                    await Utils.tts(connection, msg, channelBotTranslationService.getChannelBotTranslations(channel).voice)
                } else {
                    console.log("Could not establish TTS connection.")
                }
            }
        }
    }

    if (!process.env.ENABLE_INTRO || process.env.ENABLE_INTRO.toLowerCase() !== "true") return

    // TODO: conf for channels to send intro into at startup
    sendIntro("908046238887333888")
    sendIntro("910345920481206273")
    if (process.env.BOTNAME === "Lulune") return

    //sendIntro("853322311268171816")
    sendIntro("852192504862605312")
    sendIntro("883501924954042438")
    sendIntro("883504359739125790")
    sendIntro("892776322932281386")
});

function sendIntro(id) {
    bot.channels.fetch(id)
        .then(channel => {
            // TODO: move bot personality setup elsewhere
            if (id === "883501924954042438") {
                channelBotTranslationService.changeChannelBotTranslations("#" + channel.name, "en-EVIL")
            } else if (id === "883504359739125790") {
                channelBotTranslationService.changeChannelBotTranslations("#" + channel.name, "en-NSFW")
            } else if (id === "910345920481206273") {
                channelBotTranslationService.changeChannelBotTranslations("#" + channel.name, "en-NSFW-DOM")
            } else if (id === "892776322932281386") {
                channelBotTranslationService.changeChannelBotTranslations("#" + channel.name, "en-ROCK")
            } else if (id === "908046238887333888") {
                channelBotTranslationService.changeChannelBotTranslations("#" + channel.name, "en-RPG")
            }
            if (process.env.LMI && id !== "908046238887333888") {
                channel.send(replaceAsterisksByBackQuotes(`Bot started. Current LMI: ${process.env.LMI}\n${channelBotTranslationService.getChannelBotTranslations("#" + channel.name).introduction[0].msg}`))
            } else {
                if (channelBotTranslationService.getChannelBotTranslations("#" + channel.name).introduction.length > 0) {
                    channel.send(replaceAsterisksByBackQuotes(`${channelBotTranslationService.getChannelBotTranslations("#" + channel.name).introduction[0].msg}`))
                }
            }
        })
}

// TODO: add configurations for aliases
function replaceAliases(nick) {
    if (nick === "AliceBot") {
        return "Alice"
    }
    return nick
}

function replaceAliasesInMessage(message, nick) {
    if (nick === "AliceBot") {
        return message
            .replace("AliceBot", nick)
            .replace("Alicebot", nick)
            .replace("alicebot", nick)
    } else if (nick === "GLaDOS") {
        return message
            .replace("glados", nick)
            .replace("Glados", nick)
    } else {
        return message
    }
}

bot.on('message', async msg => {
    const privateMessage = msg.channel.type === "dm"
    if (privateMessage && (!process.env.ENABLE_DM || process.env.ENABLE_DM.toLowerCase() !== "true")) {
        return
    }
    const channelName = privateMessage ?
        "##" + replaceAliases(msg.channel.id)
        : "#" + msg.channel.name

    if (!Utils.isMessageFromChannel(channelName, conf.channels)) {
        return
    }

    const originalMsg = msg
    if (!channels[channelName])
        channels[channelName] = originalMsg.channel

    // Prevents messages from the bot itself
    // Also cache the last bot message for later retries
    if (originalMsg.author.username === bot.user.username) {
        channels[channelName].lastBotMessage = originalMsg
        return
    }
    if (originalMsg.content === ";ai me") return                        // Prevents commands from other bots

    const cleanContent = replaceAliasesInMessage(replaceBackQuotesByAsterisks(originalMsg.cleanContent), process.env.BOTNAME)

    if (cleanContent.startsWith("²") && cleanContent.length === 1) {
        await originalMsg.react("🔄")
    } else if (cleanContent.startsWith(",") && cleanContent.length === 1) {
        await originalMsg.react("▶")
    } else if (cleanContent.startsWith("?") && cleanContent.length === 1) {
        await originalMsg.react("⏩")
    } else if (cleanContent === "!forget") {
        await originalMsg.react("💔")
        setTimeout(() => {
            if (!privateMessage) {
                originalMsg.delete()
            }
        }, 3000)
    } else if (cleanContent.startsWith("!setJSONPersonality ")) {
        if (!setJSONPersonality) {
            await originalMsg.inlineReply("Sorry, but this command is not fully loaded. Please try again later!")
            return
        }

        const r = await setJSONPersonality(originalMsg.cleanContent, replaceAliases(originalMsg.author.username), channelName)
        if (r && r.message) {
            await originalMsg.inlineReply(r.message)
        }
    }

    locked = true
    const message = await botService.onChannelMessage(
        replaceAliases(originalMsg.author.username),
        channelName,
        cleanContent,
        process.env.BOTNAME)
    locked = false
    if (message && message.message && message.message.trim().length > 0) {
        const parsedMessage = replaceAsterisksByBackQuotes(message.message)
        voiceChannel = msg.member?.voice?.channel

        if (cleanContent.startsWith("²") && cleanContent.length === 1) {
            channels[channelName].lastBotMessage?.edit(parsedMessage)
            if (!privateMessage) {
                originalMsg.delete()
            }
        } else if (cleanContent.startsWith(",") && cleanContent.length === 1) {
            channels[channelName].lastBotMessage?.edit(channels[channelName].lastBotMessage.cleanContent + parsedMessage)
            if (!privateMessage) {
                originalMsg.delete()
            }
        } else if (cleanContent.startsWith("?") && cleanContent.length === 1) {
            await originalMsg.channel.send(parsedMessage)
            if (!privateMessage) {
                originalMsg.delete()
            }
        } else if (message.message.startsWith("\nLoaded bot")) {
            await originalMsg.inlineReply(parsedMessage)
            if (speak) await speak(message.message.split("\n")[2], channelName)
            return
        } else if (cleanContent.startsWith("!rpg") || cleanContent.startsWith("!event")) {
            if (!privateMessage) {
                await originalMsg.react("✅")
            }
        } else {
            await originalMsg.inlineReply(parsedMessage)
        }

        if (speak) {
            await speak(message.message, channelName)
        }
    }
});

async function loop() {
    if (locked) return setTimeout(loop, 2000)

    for (let channel in channels) {
        const msg = await commandService.talk(channel)
        if (msg && msg.message && msg.message.trim()) {
            const parsedMessage = replaceAsterisksByBackQuotes(msg.message)
            channels[channel].send(parsedMessage)
            if (!channel.startsWith("##")) {
                await speak(parsedMessage, channel)
            }
        }
    }
    setTimeout(loop, getInterval())
}

if (process.env.ENABLE_AUTO_ANSWER && process.env.ENABLE_AUTO_ANSWER.toLowerCase() === "true") {
    setTimeout(loop, getInterval())
}

module.exports = {}