import {config} from "dotenv";

config()
import Command from "./Command.js";
import axios from "axios";
import historyService from "../service/historyService.js";


const wikiCommands = {
    wiki: new Command(
        "Wikipedia",
        [],
        ["!wiki "],
        process.env.ALLOW_WIKI,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            if (!parsedMsg || parsedMsg.length === 0) {
                return {message: "# You have to provide at least one keyword for the search. Use like this: `!wiki KEYWORD`"}
            }

            const url = encodeURI(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${parsedMsg}&format=json`)

            const preResult = (await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json'
                }
            }))?.data

            if (preResult && preResult[1][0] && preResult[3][0]) {
                historyService.pushIntoHistory(msg, from, channel, messageId)
                const formattedEvent = `[ ${process.env.BOTNAME} responds to the command by searching for "${parsedMsg}" on wikipedia and sending the link "${preResult[3][0]}" to "${from}" ]`

                return {
                    message: `# Result found for ${preResult[1][0]}. Follow this link to read more: ${preResult[3][0]}`,
                    success: true,
                    pushIntoHistory: [formattedEvent, null, channel]
                }
            } else {
                return {error: `# Nothing was found... Sorry!`}
            }
        },
        false
    ),
}

wikiCommands.all = [
    wikiCommands.wiki,
]

export default wikiCommands