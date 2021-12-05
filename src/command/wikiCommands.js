require('dotenv').config()
const Command = require("./Command");
const axios = require("axios");
const historyService = require("../historyService");

const wikiCommands = {
    wiki: new Command(
        "Wikipedia",
        [],
        ["!wiki "],
        process.env.ALLOW_WIKI,
        async (msg, from, channel, command) => {
            const search = msg.replace(command, '').trim()
            if (!search || search.length === 0) {
                return {message: "# You have to provide at least one keyword for the search. Use like this: `!wiki KEYWORD`"}
            }

            const url = encodeURI(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${search}&format=json`)

            const preResult = (await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json'
                }
            }))?.data

            if (preResult && preResult[1][0] && preResult[3][0]) {
                historyService.pushIntoHistory(msg, from, channel)
                const formattedEvent = `[ ${process.env.BOTNAME} responds to the command by searching for "${search}" on wikipedia and sending the link "${preResult[3][0]}" to "${from}" ]`
                historyService.pushIntoHistory(formattedEvent, null, channel, true)

                return {
                    message: `# Result found for ${preResult[1][0]}. Follow this link to read more: ${preResult[3][0]}`,
                    success: true
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

module.exports = wikiCommands