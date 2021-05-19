const irc = require('irc');
const utils = require('./utils')
const options = require('../conf.json')

const ircClient = new irc.Client(options.ircServer, options.botName, {
    channels: [options.channel],
    username: process.env.USERNAME,
    realName: process.env.REALNAME,
    password: process.env.PASSWORD
});

/**
 * Makes the bot react to messages if its name is mentioned
 * FIXME: split code
 */
ircClient.addListener('message', function (from, to, message) {

});

/**
 * Makes the bot react when someone joins the channel
 * Also triggered when the bot joins at the start
 */
ircClient.addListener('join', function (channel, nick, message) {

});

/**
 * Makes the bot react when someone leaves the channel
 */
ircClient.addListener('part', function (channel, nick) {

});

/**
 * Makes the bot react when someone quits the channel
 */
ircClient.addListener('quit', function (nick) {

});

/**
 * Makes the bot react when someone is kicked from the channel
 */
ircClient.addListener('kick', function (channel, nick, by, reason) {

});

/**
 * Makes the bot react when someone makes an action on the channel
 */
ircClient.addListener('action', function (from, channel, text) {

});

/**
 * Makes the bot react to every PM
 */

/* Temporary deactivated
ircClient.addListener('pm', function (from, message) {
    if (!individualHistories[from]) individualHistories[from] = []  // Init individual history
    const msg = replaceNickByBotName((upperCaseFirstLetter(message)).trim())
    pushIntoHistory(individualHistories[from], {from, msg}, false)
    generateAndSendMessage(from, individualHistories[from], true)
});
*/