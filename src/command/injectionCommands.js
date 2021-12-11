import {config} from "dotenv";
import Command from "./Command.js";
import historyService from "../historyService.js";
import utils from "../utils.js";

config()


const injectionCommands = {
    event: new Command(
        "Inject Event",
        [],
        ["!event "],
        process.env.ALLOW_EVENT_INJECTION_MESSAGE,
        async (msg, from, channel, command, roles) => {
            const event = msg.replace(command, "").trim()
            if (event) {
                const formattedEvent = event.startsWith("[") && event.endsWith("]") ? event :
                    `[ Event: ${event.trim()} ]`
                historyService.pushIntoHistory(formattedEvent, null, channel)

                return {message: formattedEvent, success: true, deleteUserMsg: true}
            }
        },
        false
    ),
    property: new Command(
        "Inject Property",
        [],
        ["!property "],
        process.env.ALLOW_PROPERTY_INJECTION_MESSAGE,
        async (msg, from, channel, command, roles) => {
            const fullCommand = msg.replace(command, "").trim()
            const words = fullCommand.split(" ")
            const key = words.shift().replace(':', '')
            const value = words.join(" ")

            if (key && value) {
                const formattedEvent = `[ ${utils.upperCaseFirstLetter(key)}: ${value.trim()} ]`
                historyService.pushIntoHistory(formattedEvent, null, channel)
                return {message: formattedEvent, success: true, deleteUserMsg: true}
            }
        },
        false
    ),
}

injectionCommands.all = [
    injectionCommands.event,
    injectionCommands.property
]

export default injectionCommands