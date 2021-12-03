require('dotenv').config()
const Command = require("./Command");
const historyService = require("../historyService");
const DanbooruService = require("../externalApi/danbooruService");

const danbooruCommands = {
    danbooru: new Command(
        "Danbooru",
        [],
        ["!danbooru "],
        process.env.ALLOW_DANBOORU,
        async (msg, from, channel, command) => {
            const search = msg.replace(command, '').trim()

            const result = await DanbooruService.getTags(search || null)

            if (result) {
                historyService.pushIntoHistory(msg, from, channel)
                const formattedEvent = `[ ${process.env.BOTNAME} responds to the command by sending a random hentai picture from the website "danbooru" to ${from}. The picture has the tags "${result.tag_string_general}" ]`
                historyService.pushIntoHistory(formattedEvent, null, channel, true)
                return {
                    message: `# Id: ${result?.id}\nTags_string_general: ${result.tag_string_general}\nTag_string_character: ${result.tag_string_character}\nArtist: ${result.tag_string_artist}\nDate: ${result.created_at}\nURL: ${result.large_file_url}`,
                    success: true
                }
            } else {
                return {error: `# I'm sorry, but your search didn't return any result... Maybe try another keyword!`}
            }
        },
        false
    ),
}

danbooruCommands.all = [
    danbooruCommands.danbooru,
]

module.exports = danbooruCommands