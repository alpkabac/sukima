require('dotenv').config()
const irc = require('irc');
const conf = require('../conf.json')

const allowedChannels = process.env.ALLOWED_CHANNEL_NAMES
    .split(',')
    .map(c => c.trim())

const ircClient = new irc.Client(process.env.IRC_SERVER || "irc.libera.chat", process.env.BOTNAME, {
    channels: allowedChannels,
    username: process.env.BOTNAME,
    realName: process.env.REALNAME,
    password: process.env.PASSWORD,
});

module.exports = ircClient