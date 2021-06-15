require('dotenv').config()
const {Client} = require("discord.js");
const bot = new Client();
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

    for (let {snowflake, channel} of bot.channels.cache){
        channel.send(`I'm back! Here is the link to my LMI: ${process.env.LMI}`)
    }
});

bot.on('message', async msg => {
    if (msg.author.username === bot.user.username) return       // Prevents messages from the bot itself
    if (msg.content === ";ai me") return                        // Prevents commands from other bots

    // Set API URL dynamically
    if (msg.cleanContent.startsWith("!apiurl ")) {
        conf.apiUrl = msg.cleanContent.replace("!apiurl ", "")
        await msg.channel.send("API URL correctly changed")
        return
    }

    if (!channels["#" + msg.channel.name])
        channels["#" + msg.channel.name] = msg.channel

    locked = true
    const message = await botService.onChannelMessage(
        msg.author.username,
        "#" + msg.channel.name,
        msg.cleanContent,
        process.env.BOTNAME)
    locked = false
    if (message && message.message && message.message.trim().length > 0) {
        await msg.reply(message.message)
    }
});

async function loop() {
    if (locked) return setTimeout(loop, getInterval())

    for (let channel in channels){
        const msg = await commandService.talk("#" + channels[channel]?.name)
        if (msg.message && msg.message.trim()) {
            channels[channel].send(msg.message)
        }
    }
    setTimeout(loop, getInterval())
}

setTimeout(loop, getInterval())

module.exports = {}