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
    if (!channels["#" + msg.channel.name])
        channels["#" + msg.channel.name] = msg.channel

    // Prevents messages from the bot itself
    // Also cache the last bot message for later retries
    if (msg.author.username === bot.user.username) {
        channels["#" + msg.channel.name].lastBotMessage = msg
        return
    }
    if (msg.content === ";ai me") return                        // Prevents commands from other bots

    // Set API URL dynamically
    if (msg.cleanContent.startsWith("!apiurl ")) {
        conf.apiUrl = msg.cleanContent.replace("!apiurl ", "")
        await msg.channel.send("API URL correctly changed")
        return
    }

    const msgContent = msg.cleanContent

    if (msgContent.startsWith("²") && msgContent.length === 1) {
        await msg.edit("`²` command found, retrying...")
    } else if (msgContent.startsWith(",") && msgContent.length === 1) {
        await msg.edit("`,` command found, continuing...")
    } else if (msgContent.startsWith("?") && msgContent.length === 1) {
        await msg.edit("`?` command found, replying...")
    }

    locked = true
    const message = await botService.onChannelMessage(
        msg.author.username,
        "#" + msg.channel.name,
        msgContent,
        process.env.BOTNAME)
    locked = false
    if (message && message.message && message.message.trim().length > 0) {
        if (msgContent.startsWith("²") && msgContent.length === 1) {
            channels["#" + msg.channel.name].lastBotMessage.edit(message.message)
            msg.delete()
        } else if (msgContent.startsWith(",") && msgContent.length === 1) {
            channels["#" + msg.channel.name].lastBotMessage.edit(channels["#" + msg.channel.name].lastBotMessage.cleanContent + message.message)
            msg.delete()
        } else if (msgContent.startsWith("?") && msgContent.length === 1) {
            await msg.channel.send(message.message)
            msg.delete()
        } else {
            await msg.inlineReply(message.message)
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