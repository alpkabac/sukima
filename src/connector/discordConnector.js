require('dotenv').config()
const {Client} = require("discord.js");
require("../discord/ExtAPIMessage");
const bot = new Client({
    allowedMentions: {
        // set repliedUser value to `false` to turn off the mention by default
        repliedUser: false
    }
});
const botService = require('../botService')
const conf = require('../../conf.json')
const commandService = require("../commandService");
const {getInterval} = require("../utils");

const TOKEN = process.env.TOKEN;
bot.login(TOKEN);
const channels = []
let locked = false

bot.on('ready', () => {
    console.info(`Logged in as ${bot.user.tag}!`)

    bot.channels.fetch("852192504862605312")
        .then(channel => {
            channel.send(`I'm back! Here is the link to my LMI: ${process.env.LMI}`)
        })
});

bot.on('message', async msg => {
    const originalMsg = msg
    if (!channels["#" + originalMsg.channel.name])
        channels["#" + originalMsg.channel.name] = originalMsg.channel

    // Prevents messages from the bot itself
    // Also cache the last bot message for later retries
    if (originalMsg.author.username === bot.user.username) {
        channels["#" + originalMsg.channel.name].lastBotMessage = originalMsg
        return
    }
    if (originalMsg.content === ";ai me") return                        // Prevents commands from other bots

    const cleanContent = originalMsg.cleanContent

    if (cleanContent.startsWith("²") && cleanContent.length === 1) {
        msg = await originalMsg.edit("`²` command found, retrying...")
    } else if (cleanContent.startsWith(",") && cleanContent.length === 1) {
        msg = await originalMsg.edit("`,` command found, continuing...")
    } else if (cleanContent.startsWith("?") && cleanContent.length === 1) {
        msg = await originalMsg.edit("`?` command found, replying...")
    }

    locked = true
    const message = await botService.onChannelMessage(
        originalMsg.author.username,
        "#" + originalMsg.channel.name,
        cleanContent,
        process.env.BOTNAME)
    locked = false
    if (message && message.message && message.message.trim().length > 0) {
        if (cleanContent.startsWith("²") && cleanContent.length === 1) {
            channels["#" + originalMsg.channel.name].lastBotMessage.edit(message.message)
            msg.delete()
        } else if (cleanContent.startsWith(",") && cleanContent.length === 1) {
            channels["#" + originalMsg.channel.name].lastBotMessage.edit(channels["#" + originalMsg.channel.name].lastBotMessage.cleanContent + message.message)
            msg.delete()
        } else if (cleanContent.startsWith("?") && cleanContent.length === 1) {
            await originalMsg.channel.send(message.message)
            msg.delete()
        } else {
            await originalMsg.inlineReply(message.message)
        }
    }
});

async function loop() {
    if (locked) return setTimeout(loop, getInterval())

    for (let channel in channels) {
        const msg = await commandService.talk("#" + channels[channel]?.name)
        if (msg.message && msg.message.trim()) {
            channels[channel].send(msg.message)
        }
    }
    setTimeout(loop, getInterval())
}

setTimeout(loop, getInterval())

module.exports = {}