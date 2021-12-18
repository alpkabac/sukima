import dotenv from 'dotenv'
import {Client} from 'discord.js'
import '../discord/ExtAPIMessage.js'
import savingService from "../service/savingService.js";
import messageCommands from "../command/messageCommands.js";
import historyService from "../service/historyService.js";
import encoder from "gpt-3-encoder";
import aiService from "../service/aiService.js";
import promptService from "../service/promptService.js";
import updateBotInfo from "../discord/discordUtils.js";
import utils from "../utils.js";
import channelBotTranslationService from "../service/personalityService.js";
import greetingService from "../service/greetingService.js";
import commands from "../command/commands.js";
import discordCommands from "../discord/command/discordCommands.js";

dotenv.config()

const bot = new Client({
    allowedMentions: {
        // set repliedUser value to `false` to turn off the mention by default
        repliedUser: false
    }
});

bot.login(process.env.TOKEN)
const channels = []
let locked = {}


let connection
let voiceChannel
let speak = null


function replaceAsterisksByBackQuotes(text) {
    return text.replace(/\*/g, '`')
}

function replaceBackQuotesByAsterisks(text) {
    return text.replace(/`/g, '*')
}

bot.on('ready', async () => {
    console.info(`Logged in as ${bot.user.tag}!`)

    if (process.env.BOT_DISCORD_USERNAME) {
        await bot.user.setUsername(process.env.BOT_DISCORD_USERNAME)
    } else {
        process.env.BOT_DISCORD_USERNAME = replaceAliases(bot.user.tag.replace(/#.*$/, ""))
    }

    savingService.loadAllChannels()

    if (process.env.DISCORD_ACTIVITY_NAME) {
        const name = process.env.DISCORD_ACTIVITY_NAME
        const type = process.env.DISCORD_ACTIVITY_TYPE || "PLAYING"
        await bot.user.setActivity(name, {type})
    } else {
        await bot.user.setActivity()
    }


    speak = async function (msg, channel) {
        if (!utils.getBoolFromString(process.env.ENABLE_TTS)) return
        if (!channelBotTranslationService.getChannelPersonality(channel)?.voice?.languageCode) return
        if (!voiceChannel) return

        connection = bot.voice.connections.find((vc) => vc.channel.id === voiceChannel.id)
        if (!connection) {
            console.log("No connection is present for TTS, getting connection...")
            connection = await voiceChannel.join()
            if (connection) {
                console.log("TTS connection found!")
            }
        }
        if (connection) {
            await utils.tts(connection, msg, channelBotTranslationService.getChannelPersonality(channel).voice)
        } else {
            console.log("Could not establish TTS connection.")
        }
    }

    if (process.env.LOAD_CHANNEL_PERSONALITIES) {
        const personalityCodes = process.env.LOAD_CHANNEL_PERSONALITIES
            .split(",")
            .map(p => {
                const [channelName, personalityCode] = p.split(':')
                return {channelName, personalityCode}
            })

        personalityCodes.forEach(pc => {
            channelBotTranslationService.changeChannelPersonality(pc.channelName, pc.personalityCode)
        })
    }

    if (utils.getBoolFromString(process.env.ENABLE_INTRO)) {
        if (!process.env.SEND_INTRO_TO_CHANNELS) return
        const introChannels = process.env.SEND_INTRO_TO_CHANNELS
            .split(",")
            .map(v => v.trim())

        bot.channels.cache.forEach(c => {
            if (introChannels.includes(`#${c.name.toLowerCase()}`)) {
                if (historyService.getChannelHistory(`#${c.name.toLowerCase()}`).length === 0)
                    if (channelBotTranslationService.getChannelPersonality("#" + c.name.toLowerCase())?.introduction.length > 0)
                        c.send(replaceAsterisksByBackQuotes(
                            `${channelBotTranslationService.getChannelPersonality("#" + c.name.toLowerCase()).introduction[0].msg}`
                        ))
                            .catch(() => null)
            }
        })

    }

    updateBotInfo(bot)
});

//Greeting feature
bot.on('guildMemberAdd', async (member) => {
    if (!utils.getBoolFromString(process.env.ENABLE_GREET_NEW_USERS)) return
    const channel = member.guild.channels.cache.find(channel => {
        return ("#" + channel.name) === process.env.GREET_NEW_USERS_IN_CHANNEL
    })

    if (!channel) return

    const prompt = greetingService.getPrompt(member.user.username, process.env.BOTNAME)
    const message = await aiService.sendUntilSuccess({prompt}, false, "#" + channel.name)
    const parsedMessage = replaceAsterisksByBackQuotes(message)
    if (parsedMessage)
        channel.send(parsedMessage).catch(() => null)

});

function replaceAliases(nick) {
    if (nick === process.env.BOT_DISCORD_USERNAME) {
        return process.env.BOTNAME
    }
    return nick
}

// TODO: move into config
function replaceAliasesInMessage(message, nick) {
    if (nick === "AliceBot") {
        return message
            .replace("AliceBot", nick)
            .replace("Alicebot", nick)
            .replace("alicebot", nick)
    }

    if (nick === "GLaDOS") {
        return message
            .replace("glados", nick)
            .replace("Glados", nick)
    }

    return message
}

bot.on('message', async msg => {
    const privateMessage = msg.channel.type === "dm"
    if (privateMessage && (!process.env.ENABLE_DM || process.env.ENABLE_DM.toLowerCase() !== "true")) return
    if (privateMessage && msg.author.username !== bot.user.username) {
        const date = new Date()
        console.log(`[${((date.getHours() < 10) ? "0" : "") + date.getHours() + ":" + ((date.getMinutes() < 10) ? "0" : "") + date.getMinutes() + ":" + ((date.getSeconds() < 10) ? "0" : "") + date.getSeconds()}]`
            + ` User ${msg.author.id} sent a DM to ${process.env.BOTNAME}`)
    }


    const channelName = privateMessage ?
        "##" + msg.channel.id
        : "#" + msg.channel.name

    if (!utils.isMessageFromAllowedChannel(channelName)) return

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

    const userRoles = originalMsg.member?.roles?.cache.map(r => {
        return {id: r.id, name: r.name}
    }) || []

    const cleanContent = replaceAliasesInMessage(replaceBackQuotesByAsterisks(originalMsg.cleanContent), process.env.BOTNAME)

    locked[channelName] = true

    let message
    if (utils.isMessageFromAllowedChannel(channelName)) {
        const allCommands = discordCommands.getOnMessageCommands()
            .concat(commands.getOnMessageCommands())
        for (let command of allCommands) {
            const commandResult = await command.call(utils.replaceNickByBotName(cleanContent).trim(), replaceAliases(originalMsg.author.username), channelName, userRoles, originalMsg.id, bot)
            if (commandResult) {
                message = commandResult
                break
            }
        }
    }

    savingService.save(channelName)

    if (!message) {
        locked[channelName] = false
    }

    if (message && message.permissionError) {
        await originalMsg.react("⛔").catch(() => null)
        return
    }


    if (message && message.error) {
        await originalMsg.react("❌").catch(() => null)
        await originalMsg.inlineReply(message.error).catch(() => null)
    }
    if (message && message.success) {
        await originalMsg.react("✅").catch(() => null)
    }

    if (message && message.reactWith) {
        if (message.reactWith.length > 1) {
            for (let emoji of message.reactWith) {
                await originalMsg.react(emoji).catch(() => null)
            }
        } else {
            await originalMsg.react(message.reactWith).catch(() => null)
        }
    }

    if (message && message.deleteMessage) {
        const m = await originalMsg.channel.messages.fetch(message.deleteMessage)
        if (m) {
            setTimeout(() => {
                m.delete().catch(() => null)
            }, 2000)
        } else {
            console.log("Weird...")
        }
    }

    if (message && message.deleteMessagesUpTo) {
        const allMessages = await originalMsg.channel.messages.fetch()
        const targetMessage = allMessages.find((m) => m.id === message.deleteMessagesUpTo)
        if (targetMessage) {
            setTimeout(async () => {
                const messagesToDelete = allMessages.filter(m => m.createdTimestamp >= targetMessage.createdTimestamp)

                // Synchronize history by removing newer messages
                historyService.channelHistories[channelName] = historyService.channelHistories[channelName].filter(m => {
                    const fetchedMessage = allMessages.find(_ => _.id === m.messageId)
                    return !(fetchedMessage && fetchedMessage.createdTimestamp >= targetMessage.createdTimestamp);
                })

                await originalMsg.channel?.bulkDelete(messagesToDelete).catch(() => null)
            }, 2000)
        }
    }

    if (message?.message?.trim().length > 0) {
        const parsedMessage = replaceAsterisksByBackQuotes(message.message)

        voiceChannel = msg.member?.voice?.channel
        const timeToWait = message.instantReply ? 0 : encoder.encode(message.message).length * (message.fastTyping ? 10 : 50)
        channels[channelName].startTyping().then()

        setTimeout(async () => {
            let newMessage = null

            if (message.editMessage) {
                newMessage = await (await channels[channelName].messages.fetch(message.editMessage))?.edit(parsedMessage)
            } else if (message.editLastMessage) {
                newMessage = await channels[channelName].lastBotMessage?.edit(parsedMessage)
            } else if (message.appendToLastMessage) {
                newMessage = await channels[channelName].lastBotMessage?.edit(channels[channelName].lastBotMessage.cleanContent + parsedMessage)
            } else {
                if (message.image) {
                    newMessage = await originalMsg.inlineReply({
                        message: parsedMessage, files: [{
                            attachment: message.image,
                            name: "SPOILER_FILE.jpg"
                        }]
                    }).catch((e) => console.error(e))
                } else {
                    newMessage = await originalMsg.inlineReply(parsedMessage).catch(() => null)
                }
            }

            if (!newMessage) {
                console.warn("New message couldn't be retrieved when it should have been...")
            }

            if (message && message.pushIntoHistory) {
                historyService.pushIntoHistory(message.pushIntoHistory[0], message.pushIntoHistory[1], message.pushIntoHistory[2], newMessage?.id)
            }

            channels[channelName].stopTyping(true)
            locked[channelName] = false
            savingService.save(channelName)
        }, timeToWait)

        if (speak && !message.message.startsWith("#")) {
            await speak(parsedMessage, channelName)
        }
    } else {
        locked[channelName] = false
    }

    if (message && message.deleteUserMsg) {
        setTimeout(() => {
            originalMsg.delete().catch(() => null)
        }, 2000)
    }

});

async function loop() {

    if (utils.getBoolFromString(process.env.ENABLE_AUTO_ANSWER)) {
        for (let channel in channels) {
            // Present sending double messages
            if (locked[channel]) continue

            locked[channel] = true
            const msg = await messageCommands.talk.call(null, null, channel, [])
            // If normal answer
            if (msg && msg.message?.trim()) {
                const parsedMessage = replaceAsterisksByBackQuotes(msg.message)
                const timeToWait = encoder.encode(parsedMessage).length * 50
                channels[channel].startTyping().then()
                setTimeout(async () => {
                    const m = await channels[channel].send(parsedMessage).catch(() => null)
                    if (msg.pushIntoHistory) {
                        historyService.pushIntoHistory(msg.message, process.env.BOTNAME, channel, m.id)
                    }
                    channels[channel].stopTyping(true)
                    locked[channel] = false
                }, timeToWait)
                if (!channel.startsWith("##")) {
                    await speak(parsedMessage, channel)
                }
            } else {
                locked[channel] = false
            }
        }
    }

    setTimeout(loop, 1000)
}

setInterval(async () => {
// Waits two seconds if an answer is still generating
    if (locked) return setTimeout(loop, 2000)

    if (utils.getBoolFromString(process.env.ENABLE_AUTO_MESSAGE)) {
        for (let channel in channels) {
            if (channel.startsWith("##")) continue

            // TODO: put into a command
            const history = historyService.getChannelHistory(channel)

            // Checks if the conditions for new message are met
            const historyIsntEmpty = history.length > 0
            const lastMessage = historyIsntEmpty ? history[history.length - 1] : null
            const timePassed = Date.now() - (parseInt(process.env.INTERVAL_AUTO_MESSAGE_CHECK || "60") * 1000)
            const enoughPassedTime = lastMessage?.timestamp > timePassed
            const isLastMessageFromUser = lastMessage?.from !== process.env.BOTNAME && !!lastMessage?.from
            if (!historyIsntEmpty || !enoughPassedTime || isLastMessageFromUser) {
                continue
            }

            const tokenCount = Math.min(150, encoder.encode(process.env.BOTNAME).length)
            const prompt = promptService.getPrompt(channel, true).prompt + "\n"
            const result = await aiService.simpleEvalbot(prompt, tokenCount, channel.startsWith("##"))
            // If next message is from the AI
            if (result === process.env.BOTNAME) {
                const prompt = promptService.getPrompt(channel)
                const answer = await aiService.sendUntilSuccess(prompt, channel.startsWith("##"), channel)
                if (answer) {
                    const parsedMessage = replaceAsterisksByBackQuotes(answer)
                    const timeToWait = encoder.encode(parsedMessage).length * 50
                    channels[channel].startTyping().then()
                    setTimeout(async () => {
                        const m = await channels[channel].send(parsedMessage).catch(() => null)
                        historyService.pushIntoHistory(answer, process.env.BOTNAME, channel, m.id)

                        channels[channel].stopTyping(true)
                    }, timeToWait)
                }
            }
        }
    }
}, parseInt(process.env.INTERVAL_AUTO_MESSAGE_CHECK || "60") * 1000)

setTimeout(loop, 5000)

export default {}