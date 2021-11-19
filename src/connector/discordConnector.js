require('dotenv').config()
const {Client} = require("discord.js");
require("../discord/ExtAPIMessage");
const voices = JSON.parse(JSON.stringify(require('../tts/languages.json')))
const conf = require("../../conf.json")

const bot = new Client({
    allowedMentions: {
        // set repliedUser value to `false` to turn off the mention by default
        repliedUser: false
    }
});

const botService = require('../botService')
const channelBotTranslationService = require('../channelBotTranslationService')
const commandService = require("../commandService");
const {tts} = require("../utils");
const {getInterval} = require("../utils");
const Utils = require("../utils");

const TOKEN = process.env.TOKEN;
bot.login(TOKEN);
const channels = []
let locked = false


let connection
let voiceChannel
let setJSONPersonality
let speak = () => null


function replaceAsterisksByBackQuotes(text) {
    return text.replace(/\*/g, '`')
}

function replaceBackQuotesByAsterisks(text) {
    return text.replace(/`/g, '*')
}

bot.on('ready', async () => {
    console.info(`Logged in as ${bot.user.tag}!`)

    if (process.env.ENABLE_CUSTOM_AI && process.env.ENABLE_CUSTOM_AI.toLowerCase() === "true") {
        await bot.user.setUsername(process.env.BOTNAME)
        await bot.user.setAvatar("https://cdn.discordapp.com/embed/avatars/0.png")
    }

    setJSONPersonality = async function (msg, from, channel) {
        const command = "!setJSONPersonality "

        if (msg.toLowerCase().startsWith(command.toLowerCase())) {
            // TODO: check if user 'from' is allowed to execute that command

            if (!process.env.ENABLE_CUSTOM_AI && process.env.ENABLE_CUSTOM_AI.toLowerCase() === "true") {
                return {message: "Sorry, but this command is not enabled on this AI.", channel}
            }
            if (conf.changePersonalityChannelBlacklist.includes(channel)) {
                return {message: "Sorry, but this channel personality is locked.", channel}
            }
            const personalityJSON = msg.replace(command, "")
            let personality
            try {
                personality = JSON.parse(personalityJSON)
            } catch (e) {
                return {message: "JSON could not be parsed"}
            }

            const aiPersonality = channelBotTranslationService.getChannelBotTranslations(channel)

            if (personality.username !== undefined) {
                await bot.user.setUsername(personality.username)
                process.env.BOTNAME = personality.username
            }

            if (personality.avatar !== undefined) {
                await bot.user.setAvatar(personality.avatar)
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
            JSONPersonality.voice = aiPersonality.voice.name
            return {
                message: `Personality successfully loaded! Complete JSON for the new personality:\n${JSON.stringify(JSONPersonality)}`,
                channel
            }
        } else {
            return false
        }
    }


    if (!process.env.DISABLE_TTS && process.env.DISABLE_TTS.toLowerCase() === "true") {
        speak = async function (msg, channel) {
            if (voiceChannel) {
                connection = bot.voice.connections.find((vc) => vc.channel.id === voiceChannel.id)
                if (!connection) {
                    connection = await voiceChannel.join()
                }
                if (connection) {
                    await tts(connection, msg, channelBotTranslationService.getChannelBotTranslations(channel).voice)
                }
            }
        }
    }

    if (process.env.DISABLE_INTRO && process.env.DISABLE_INTRO.toLowerCase() === "true") return

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
    if (privateMessage && process.env.DISABLE_DM && process.env.DISABLE_DM.toLowerCase() === "true") {
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
        if (!setJSONPersonality) throw new Error("Shit happened")

        const r = await setJSONPersonality(originalMsg.cleanContent, replaceAliases(originalMsg.author.username), channelName)
        if (r && r.message) {
            await originalMsg.inlineReply(r.message)
        }
        return
    }

    locked = true
    const message = await botService.onChannelMessage(
        replaceAliases(originalMsg.author.username),
        channelName,
        cleanContent,
        process.env.BOTNAME)
    locked = false
    if (message && message.message && message.message.trim().length > 0) {
        voiceChannel = msg.member?.voice?.channel
        const parsedMessage = replaceAsterisksByBackQuotes(message.message)
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
            await speak(message.message.split("\n")[2], channelName)
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

if (!process.env.DISABLE_AUTO_ANSWER && process.env.DISABLE_AUTO_ANSWER.toLowerCase() === "true") {
    setTimeout(loop, getInterval())
}

module.exports = {}