require('dotenv').config()
const irc = require('irc');
const conf = require('../conf.json')

const ircClient = new irc.Client(process.env.IRC_SERVER || "irc.libera.chat", process.env.BOTNAME, {
    channels: conf.channels,
    username: process.env.BOTNAME,
    realName: process.env.REALNAME,
    password: process.env.PASSWORD,
});

module.exports = ircClient