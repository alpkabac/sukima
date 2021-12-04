const muteCommands = require("../command/muteCommands");
const memoryCommands = require("../command/memoryCommands");
const languageCommands = require("../command/languageCommands");
const promptCommands = require("../command/promptCommands");
const voiceCommands = require("../command/voiceCommands");
const injectionCommands = require("../command/injectionCommands");
const wikiCommands = require("../command/wikiCommands");
const danbooruCommands = require("../command/danbooruCommands");
const epornerCommands = require("../command/epornerCommands");
const personalityCommands = require("../command/personalityCommands");
const messageCommands = require("../command/messageCommands");

module.exports = {
    onMessageCommands: []
        .concat(muteCommands.all)
        .concat(memoryCommands.all)
        .concat(languageCommands.all)
        .concat(promptCommands.all)
        .concat(voiceCommands.all)
        .concat(injectionCommands.all)
        .concat(wikiCommands.all)
        .concat(danbooruCommands.all)
        .concat(epornerCommands.all)
        .concat(personalityCommands.all)
        .concat(messageCommands.all)    // Should always be last
}