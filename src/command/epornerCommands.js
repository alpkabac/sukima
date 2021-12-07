import {config} from "dotenv";

config()
import Command from "./Command.js";
import historyService from "../historyService.js";
import axios from "axios";


const epornerCommands = {
    eporner: new Command(
        "Eporner",
        [],
        ["!eporner "],
        process.env.ALLOW_EPORNER,
        async (msg, from, channel, command) => {
            const search = msg.replace(command, '').trim()

            if (!search || search.length === 0) {
                return {message: "# You have to provide at least one keyword for the search. Use like this: `!eporner KEYWORD`"}
            }

            const ORDER = ["latest", "longest", "shortest", "top-rated", "most-popular", "top-weekly", "top-monthly"]
            const THUMBNAIL_SIZE = ["small", "medium", "big"]
            const page = 0
            const nbResultPerPage = 1
            let params = `?query=${search}&per_page=${nbResultPerPage}&page=${page}&thumbsize=${THUMBNAIL_SIZE[0]}&order=${ORDER[0]}&gay=1&lq=1&format=json`

            const preResult = (await axios.get("https://www.eporner.com/api/v2/video/search/" + params, {
                headers: {
                    'Content-Type': 'application/json'
                }
            }))?.data

            if (preResult?.videos?.length > 0) {
                const randomPage = Math.floor(Math.random() * preResult.total_pages)
                params = `?query=${search}&per_page=${nbResultPerPage}&page=${randomPage}&thumbsize=${THUMBNAIL_SIZE[2]}&order=${ORDER[0]}&gay=1&lq=1&format=json`

                const result = (await axios.get("https://www.eporner.com/api/v2/video/search/" + params, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }))?.data

                if (result?.videos?.length > 0) {
                    const vid = result.videos[0]

                    historyService.pushIntoHistory(msg, from, channel)
                    const formattedEvent = `[ ${process.env.BOTNAME} responds to the command by searching "${search}" on the porn website "eporner" and sending one of the clip to ${from}. The video is titled "${vid.title}" and contains the keywords "${vid.keywords}" ]`
                    historyService.pushIntoHistory(formattedEvent, null, channel, true)
                    return {
                        message: `# Id: ${vid?.id}\nTitle: ${vid.title}\nKeywords: ${vid.keywords}\nLength: ${vid.length_min}\nDate: ${vid.added}\nURL: ${vid.url}`,
                        success: true,
                        instantReply: true,
                        image: vid.url
                    }
                } else {
                    return {message: `# I'm sorry, but your search didn't return any result... Maybe try another keyword!`}
                }
            } else {
                return {message: `# I'm sorry, but your search didn't return any result... Maybe try another keyword!`}
            }
        },
        false
    ),
}

epornerCommands.all = [
    epornerCommands.eporner,
]

export default epornerCommands