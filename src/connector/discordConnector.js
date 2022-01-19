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
import envService from "../util/envService.js";
import pawnService from "../service/rpg/pawnService.js";
import duckHuntService from "../service/rpg/duckHuntService.js";
import muteService from "../service/muteService.js";
import duckHuntCommands from "../command/duckHuntCommands.js";

dotenv.config()

const allowedCommands = []
    .concat(duckHuntCommands.attack.commandsStartsWith)
    .concat(duckHuntCommands.take.commandsStartsWith)
    .concat(duckHuntCommands.drop.commandsStartsWith)
    .concat(duckHuntCommands.look.commandsStartsWith)
    .concat(duckHuntCommands.sell.commandsStartsWith)
    .concat(duckHuntCommands.equipWeapon.commandsStartsWith)
    .concat(duckHuntCommands.equipArmor.commandsStartsWith)
    .concat(duckHuntCommands.equipAccessory.commandsStartsWith)
    .concat(duckHuntCommands.unequipWeapon.commandsStartsWith)
    .concat(duckHuntCommands.unequipArmor.commandsStartsWith)
    .concat(duckHuntCommands.unequipAccessory.commandsStartsWith)
    .concat(duckHuntCommands.showInventory.commandsStartsWith)
    .concat(duckHuntCommands.upgradeBackpack.commandsStartsWith)

const allowedCommandsMap = {
    attack: duckHuntCommands.attack.commandsStartsWith,
    take: duckHuntCommands.take.commandsStartsWith,
    drop: duckHuntCommands.drop.commandsStartsWith,
    look: duckHuntCommands.look.commandsStartsWith,
    sell: duckHuntCommands.sell.commandsStartsWith,
    equipWeapon: duckHuntCommands.equipWeapon.commandsStartsWith,
    equipArmor: duckHuntCommands.equipArmor.commandsStartsWith,
    equipAccessory: duckHuntCommands.equipAccessory.commandsStartsWith,
    unequipWeapon: duckHuntCommands.unequipWeapon.commandsStartsWith,
    unequipArmor: duckHuntCommands.unequipArmor.commandsStartsWith,
    unequipAccessory: duckHuntCommands.unequipAccessory.commandsStartsWith,
    showInventory: duckHuntCommands.showInventory.commandsStartsWith,
    upgradeBackpack: duckHuntCommands.upgradeBackpack.commandsStartsWith,
}
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
                if (envService.isRpgModeEnabled()) {
                    if (c.send) {
                        c.send('https://tenor.com/view/huzzah-adventure-jovel-haver-gif-19701828')
                    }
                } else {
                    if (historyService.getChannelHistory(`#${c.name.toLowerCase()}`).length === 0)
                        if (channelBotTranslationService.getChannelPersonality("#" + c.name.toLowerCase())?.introduction.length > 0)
                            c.send?.(replaceAsterisksByBackQuotes(
                                `${channelBotTranslationService.getChannelPersonality("#" + c.name.toLowerCase()).introduction[0].msg}`
                            ))
                                .catch(() => null)
                }
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

const messageList = []

function appendMessage(msg) {
    messageList.push(msg)
}

function isMessageAnAllowedCommand(msg) {
    if (!msg.startsWith('!')) return false
    return allowedCommands.some(ac => msg.toLowerCase()?.trim()?.startsWith(ac))
}

function clearRpgBotTextOutput(text) {
    const isCommand = text.startsWith('!')
    let cleanContent = (isCommand ? '!' : '')
        + text.substr(isCommand ? 1 : 0)
            .replace(/![a-zA-Z0-9*'\]].*$/, '')

    if (isCommand) {
        // removes commands if they are not the first word
        cleanContent = '!' + cleanContent.substr(1)
            .replace(/!.*$/, '')
            .replace(/\[.*$/, '')
            .replace(/;.*$/, '')
            .replace(/>.*$/, '')
            .replace(/:.*$/, '')
        cleanContent = cleanContent.replace(/\*.*$/, '')

        // removes arguments from commands
        cleanContent = cleanContent.replace(/ .*$/, '')


        if (isMessageAnAllowedCommand(cleanContent)) {
            let command = null
            for (let c in allowedCommandsMap) {
                if (allowedCommandsMap[c].some(ac => cleanContent.toLowerCase()?.trim()?.startsWith(ac))) {
                    command = c
                    break
                }
            }

            if (command) {
                return allowedCommandsMap[command][0]
            }
        }
    }

    return cleanContent
}

async function processMessage(msg) {
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

    const file = msg.attachments.first()?.url;

    if (!utils.isMessageFromAllowedChannel(channelName)) return

    const originalMsg = msg

    if (!channels[channelName])
        channels[channelName] = originalMsg.channel

    let cleanContent = replaceAliasesInMessage(replaceBackQuotesByAsterisks(originalMsg.cleanContent), process.env.BOTNAME)

    // Prevents messages from the bot itself
    // Also cache the last bot message for later retries
    if (originalMsg.author.username === bot.user.username) {
        channels[channelName].lastBotMessage = originalMsg

        if (!envService.isRpgModeEnabled()) return

        cleanContent = clearRpgBotTextOutput(cleanContent)

        const isCommandAllowed = isMessageAnAllowedCommand(cleanContent)

        if (cleanContent.startsWith('!') &&!isCommandAllowed) {
            await originalMsg?.delete().catch(e => console.error(e))
            return
        }
        if (!cleanContent.startsWith('!')){
            return
        }
    }

    if (originalMsg.content === ";ai me") return    // Prevents commands from @Patos bots

    const userRoles = originalMsg.member?.roles?.cache.map(r => {
        return {id: r.id, name: r.name}
    }) || []


    locked[channelName] = true

    let message
    if (utils.isMessageFromAllowedChannel(channelName)) {
        const allCommands = discordCommands.getOnMessageCommands()
            .concat(commands.getOnMessageCommands())
        for (let command of allCommands) {
            const commandResult = await command.call(utils.replaceNickByBotName(cleanContent).trim(), replaceAliases(originalMsg.author.username), channelName, userRoles, originalMsg.id, bot, file)
            if (commandResult) {
                message = commandResult
                break
            }
        }
    }

    if (!message && utils.getBoolFromString(process.env.ENABLE_SMART_ANSWER) && originalMsg.author.username !== bot.user.username) {
        if (await isNextMessageFromBot(channelName)) {
            await forceTalk(channelName)
        }
    }

    savingService.save(channelName)

    if (!message) {
        locked[channelName] = false
        return
    }

    if (message && message.permissionError) {
        await originalMsg.react("⛔").catch(() => null)
        return
    }


    if (message && message.error) {
        await originalMsg.react("❌").catch(() => null)
        const newMessage = await originalMsg.inlineReply(message.error).catch(() => null)
        if (newMessage && message.deleteNewMessage) {
            setTimeout(
                () => newMessage.delete().catch(() => null),
                5000
            )
        }
    }
    if (message && message.success) {
        await originalMsg.react("✅").catch(() => null)
    }

    if (message && message.reactWith) {
        if (message.reactWith instanceof Array && message.reactWith.length > 1) {
            for (let i = 0; i < message.reactWith.length; i++) {
                setTimeout(() => {
                    originalMsg.react(message.reactWith[i]).catch(() => null)
                }, i * 250)
            }
        } else {
            await originalMsg.react(message.reactWith).catch(() => null)
        }
    }

    if (message && message.setActivityType && message.setActivityName) {
        await bot.user.setActivity(message.setActivityName, {type: message.setActivityType})
    } else if (message && message.setActivityName) {
        await bot.user.setActivity(message.setActivityName)
    }

    if (message && message.message) {
        let parsedMessage
        let messageLength
        let embedMessage = false
        try {
            messageLength = encoder.encode(message.message).length
            parsedMessage = replaceAsterisksByBackQuotes(message.message)
        } catch (e) {
            messageLength = 1
            parsedMessage = message.message
            embedMessage = true
        }

        voiceChannel = msg.member?.voice?.channel
        const timeToWait = message.instantReply ? 0 : messageLength * (message.fastTyping ? 10 : 50)
        if (timeToWait > 0) {
            channels[channelName].startTyping().then()
        }

        setTimeout(async () => {
            let newMessage = originalMsg

            if (message.editMessage) {
                await (await channels[channelName].messages.fetch(message.editMessage))?.edit(parsedMessage)?.catch(() => null)
            } else if (message.editLastMessage) {
                await channels[channelName].lastBotMessage?.edit(parsedMessage)?.catch(() => null)
            } else if (message.appendToLastMessage) {
                await channels[channelName].lastBotMessage?.edit(channels[channelName].lastBotMessage.cleanContent + parsedMessage)?.catch(() => null)
            } else {
                if (message.image) {
                    newMessage = await originalMsg.inlineReply({
                        message: parsedMessage, files: [{
                            attachment: message.image,
                            name: "SPOILER_FILE.jpg"
                        }]
                    }).catch((e) => console.error(e))
                } else {
                    if (embedMessage) {
                        newMessage = await channels[channelName].send(parsedMessage).catch(() => null)
                    } else {
                        await originalMsg.inlineReply(parsedMessage).catch(() => null)
                    }
                }
            }

            if (!newMessage) {
                console.warn("New message couldn't be retrieved when it should have been...")
            }

            if (message && message.pushIntoHistory) {
                historyService.pushIntoHistory(message.pushIntoHistory[0], message.pushIntoHistory[1], message.pushIntoHistory[2], newMessage.id)
            }

            if (newMessage && message.deleteNewMessage) {
                setTimeout(async () => {
                    await newMessage.delete().catch(() => null)
                }, 5000)
            }

            channels[channelName].stopTyping(true)
            locked[channelName] = false
            savingService.save(channelName)

            if (message.alsoSend) {
                if (Array.isArray(message.alsoSend)) {
                    for (let alsoSend of message.alsoSend) {
                        await channels[channelName].send(alsoSend)
                    }
                } else {
                    await channels[channelName].send(message.alsoSend)
                }
            }
        }, timeToWait)

        if (!embedMessage && speak && !message.message.startsWith("#")) {
            await speak(parsedMessage, channelName)
        }
    } else {
        locked[channelName] = false
    }

    if (message && message.deleteMessage) {
        const m = await originalMsg?.channel?.messages?.fetch(message.deleteMessage).catch(() => null)
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

                if (originalMsg.channel?.bulkDelete) {
                    await originalMsg.channel?.bulkDelete(messagesToDelete).catch(() => null)
                }
            }, 2000)
        }
    }

    if (message && message.deleteUserMsg) {
        setTimeout(() => {
            originalMsg.delete().catch(() => null)
        }, 2000)
    }
}

async function isNextMessageFromBot(channel) {
    const tokenCount = Math.min(150, encoder.encode(process.env.BOTNAME).length)
    const promptLines = promptService.getPrompt(channel).prompt.split('\n')
    const prompt = promptLines.slice(0, -1).join('\n') + "\n"
    const result = await aiService.simpleEvalbot(prompt, tokenCount, channel.startsWith("##"))
    return !!(result && result.toLowerCase().trim() === process.env.BOTNAME.toLowerCase().trim())
}

async function forceTalk(channel) {
    const msg = await messageCommands.forceTalk.call('!talk', null, channel, [], undefined, bot)
    // If normal answer
    if (msg && msg.message?.trim()) {
        await parseForceMessage(channel, msg)
    }
}

async function parseForceMessage(channel, msg){
    const parsedMessage = replaceAsterisksByBackQuotes(msg.message)
    const timeToWait = encoder.encode(parsedMessage).length * 50
    channels[channel].startTyping().then()
    setTimeout(async () => {
        const m = await channels[channel].send(clearRpgBotTextOutput(parsedMessage)).catch((e) => console.error(e))
        if (msg.pushIntoHistory && (!msg.pushIntoHistory[0].startsWith('!') || isMessageAnAllowedCommand(msg.pushIntoHistory[0]))) {
            historyService.pushIntoHistory(clearRpgBotTextOutput(msg.pushIntoHistory[0]), msg.pushIntoHistory[1], msg.pushIntoHistory[2], m?.id)
            savingService.save(channel)
        }
        channels[channel].stopTyping(true)
        locked[channel] = false
    }, timeToWait)
    if (!channel.startsWith("##")) {
        await speak(parsedMessage, channel)
    }
}

async function messageLoop() {
    let msg = messageList.shift()
    while (msg) {
        await processMessage(msg)
        msg = messageList.shift()
    }

    // Auto answer
    if (utils.getBoolFromString(process.env.ENABLE_AUTO_ANSWER)) {
        for (let channel in channels) {
            // Present sending double messages
            if (locked[channel]) continue
            if (muteService.isChannelMuted(channel)) continue

            locked[channel] = true
            const msg = await messageCommands.talk.call(null, null, channel, [], undefined, bot)
            // If normal answer
            if (msg && msg.message?.trim()) {
                await parseForceMessage(channel, msg)
            } else {
                locked[channel] = false
            }
        }
    }

    // Auto message
    if (utils.getBoolFromString(process.env.ENABLE_AUTO_MESSAGE)) {
        for (let channel in channels) {

            // Prevents auto messages in DMs (temporary, hopefully)
            if (channel.startsWith("##")) continue
            if (muteService.isChannelMuted(channel)) continue
            if (locked[channel]) continue

            const history = historyService.getChannelHistory(channel)

            // Checks if the conditions for new message are met
            const historyIsEmpty = history.length === 0
            const lastMessage = historyIsEmpty ? null : history[history.length - 1]
            const timePassed = Date.now() - (parseInt(process.env.INTERVAL_AUTO_MESSAGE_CHECK || "60") * 1000)
            const enoughPassedTime = timePassed > lastMessage?.timestamp
            const isLastMessageFromBot = lastMessage?.from?.toLowerCase() === process.env.BOTNAME.toLowerCase()

            if (historyIsEmpty || !enoughPassedTime || !isLastMessageFromBot) {
                continue
            }

            locked[channel] = true
            if (await isNextMessageFromBot(channel)) {
                await forceTalk(channel)
            }
            locked[channel] = false
        }
    }

    setTimeout(messageLoop, 2000)
}

messageLoop()

bot.on('message', appendMessage);

bot.on('messageReactionAdd', async (reaction, user) => {
    if (!reaction.me) {
        const privateMessage = reaction.message?.channel?.type === "dm"
        const channelName = privateMessage ? '##' + reaction.message?.channel?.id : `#` + reaction.message?.channel?.name

        if (reaction._emoji.name === '❌') {
            await messageCommands.deleteMessage.call(`!delete #${reaction.message.id}`, null, channelName, [], reaction.message?.id, bot, null)
            setTimeout(async () => {
                await reaction.message?.delete().catch(() => null)
            }, 1000)
        } else if (reaction._emoji.name === '🚮') {
            await messageCommands.pruneMessages.call(`!prune #${reaction.message?.id}`, null, channelName, [], reaction.message?.id, bot, null)

            const allMessages = await reaction.message.channel.messages.fetch()
            const targetMessage = allMessages.find((m) => m.id === reaction.message?.id)
            if (targetMessage) {
                setTimeout(async () => {
                    const messagesToDelete = allMessages
                        .filter(m =>
                            (m.createdTimestamp >= targetMessage.createdTimestamp)
                            || (m.id === targetMessage.id)
                        )

                    // Synchronize history by removing newer messages
                    historyService.channelHistories[channelName] = historyService.channelHistories[channelName]
                        ?.filter?.(m => {
                            const fetchedMessage = allMessages.find(_ => _.id === m.messageId)
                            return (fetchedMessage?.createdTimestamp < targetMessage.createdTimestamp)
                                || (m.id === targetMessage.id)
                        })

                    if (reaction.message.channel?.bulkDelete) {
                        await reaction.message.channel?.bulkDelete(messagesToDelete).catch(() => null)
                    }
                }, 1000)
            }

        }
    }
});

setInterval(async () => {
    if (envService.isRpgModeEnabled()) {
        for (let channel in channels) {
            // Prevents auto messages in DMs (temporary, hopefully)
            if (channel.startsWith("##")) continue
            if (muteService.isChannelMuted(channel)) continue

            const pawn = pawnService.getActivePawn(channel)
            if (pawn && (Date.now() - pawn.createdAt < 1000 * envService.getRpgRespawnCoolDown())) continue
            if (pawnService.lastPawnKilledAt[channel] && (Date.now() - pawnService.lastPawnKilledAt[channel] < 1000 * envService.getRpgSpawnCoolDown())) continue

            let difficulty = "easy"
            if (Math.random() < 0.4) {
                difficulty = "medium"
                if (Math.random() < 0.25) {
                    difficulty = "hard"
                    if (Math.random() < 0.1) {
                        difficulty = "legendary"
                    }
                }
            }
            const spawnMessage = await duckHuntService.spawn(channel, difficulty, null)

            const m = await channels[channel].send(spawnMessage?.message).catch((e) => console.error(e))

            if (m && spawnMessage && spawnMessage.pushIntoHistory) {
                historyService.pushIntoHistory(spawnMessage.pushIntoHistory[0], spawnMessage.pushIntoHistory[1], spawnMessage.pushIntoHistory[2], m?.id)
            }

            savingService.save(channel)
        }
    }
}, 30000)

export default {}