import {config} from "dotenv";

config()
import Command from "./Command.js";
import historyService from "../historyService.js";
import DanbooruService from "../externalApi/danbooruService.js";


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
                const formattedEvent = `[ ${process.env.BOTNAME} responds to the command by searching "${search}" on the hentai website "danbooru" and sending one of the pictures to ${from}. The picture has the tags "${result.tag_string_general}" ]`
                historyService.pushIntoHistory(formattedEvent, null, channel, true)
                return {
                    message: `# Id: ${result?.id}\nTags_string_general: ${result.tag_string_general}\nTag_string_character: ${result.tag_string_character}\nArtist: ${result.tag_string_artist}\nDate: ${result.created_at}\nURL: ||${result.large_file_url}||`,
                    success: true,
                    instantReply: true,
                    image: result.large_file_url
                }
            } else {
                return {
                    error: `# I'm sorry, but your search didn't return any result... Maybe try another keyword!`
                }
            }
        },
        false
    ),
}

danbooruCommands.all = [
    danbooruCommands.danbooru,
]

export default danbooruCommands