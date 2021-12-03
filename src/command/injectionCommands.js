require('dotenv').config()
const Command = require("./Command");
const historyService = require("../historyService");
const utils = require("../utils");

const injectionCommands = {
    event: new Command(
        "Inject Event",
        [],
        ["!event "],
        process.env.ALLOW_EVENT_INJECTION_MESSAGE,
        async (msg, from, channel, command) => {
            const event = msg.replace(command, "")
            if (event) {
                const formattedEvent = event.startsWith("[") && event.endsWith("]") ? event :
                    `[ Event: ${event.trim()} ]`
                historyService.pushIntoHistory(formattedEvent, null, channel, true)

                return {message: formattedEvent, success: true}
            }
        },
        false
    ),
    property: new Command(
        "Inject Property",
        [],
        ["!property "],
        process.env.ALLOW_PROPERTY_INJECTION_MESSAGE,
        async (msg, from, channel, command) => {
            const fullCommand = msg.replace(command, "").trim()
            const words = fullCommand.split(" ")
            const key = words.shift()
            const value = words.join(" ")

            if (key && value) {
                const formattedEvent = `[ ${utils.upperCaseFirstLetter(key)}: ${value.trim()} ]`
                historyService.pushIntoHistory(formattedEvent, null, channel, true)
                return {message: formattedEvent, success: true}
            }
        },
        false
    ),
}

injectionCommands.all = [
    injectionCommands.event,
    injectionCommands.property
]

module.exports = injectionCommands