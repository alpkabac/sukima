const ircClient = require('../ircClient')
const botService = require('../botService')
const conf = require('../../conf.json')
const commandService = require("../commandService");
const {getInterval} = require("../utils");

class IrcConnector {
    static sendMessage(to, message) {
        ircClient.say(to, message)
    }
}

/**
 * Makes the bot react to messages if its name is mentioned
 */
ircClient.addListener('message', async function (from, to, message) {
    const msg = await botService.onChannelMessage(from, to, message, ircClient.nick)
    if (msg.message) {
        ircClient.say(msg.channel, msg.message)
    }
});

/**
 * Makes the bot react when someone joins the channel
 * Also triggered when the bot joins at the start
 */
ircClient.addListener('join', async function (channel, nick) {
    const msg = await botService.onJoin(channel, nick)
    if (msg.message) {
        ircClient.say(msg.channel, msg.message)
    }
});

/**
 * Makes the bot react when someone leaves the channel
 */
ircClient.addListener('part', async function (channel, nick) {
    const msg = await botService.onPart(channel, nick)
    if (msg.message) {
        ircClient.say(msg.channel, msg.message)
    }
});

/**
 * Makes the bot react when someone quits the channel
 */
ircClient.addListener('quit', async function (nick) {

});

/**
 * Makes the bot react when someone is kicked from the channel
 */
ircClient.addListener('kick', async function (channel, nick, by, reason) {
    const msg = await botService.onKick(channel, nick, by, reason)
    if (msg.message) {
        ircClient.say(msg.channel, msg.message)
    }
});

/**
 * Makes the bot react when someone makes an action on the channel
 */
ircClient.addListener('action', async function (from, channel, text) {
    const msg = await botService.onAction(channel, from, text)
    if (msg.message) {
        ircClient.say(msg.channel, msg.message)
    }
});

/**
 * Makes the bot react to every PM
 */
ircClient.addListener('pm', async function (from, message) {

});

async function loop() {
    const msg = await commandService.talk(conf.channels[0])
    if (msg.message) {
        ircClient.say(msg.channel, msg.message)
    }
    setTimeout(loop, getInterval())
}

setTimeout(loop, getInterval())

module.exports = IrcConnector