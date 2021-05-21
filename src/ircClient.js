const irc = require('irc');
const conf = require('../conf.json')

const ircClient = new irc.Client(conf.ircServer, conf.botName, {
    channels: conf.channels,
    username: process.env.USERNAME,
    realName: process.env.REALNAME,
    password: process.env.PASSWORD
});

module.exports = ircClient