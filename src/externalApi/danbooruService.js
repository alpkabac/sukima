const axios = require("axios");

class DanbooruService {
    static async getTags(tags) {

        try {
            const r = (await axios.get("https://danbooru.donmai.us/posts/random.json?limit=1&tags=" + encodeURI(tags.toLowerCase()), {
                params: {
                    "limit": 1
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + (Buffer.from(process.env.DANBOORU_LOGIN + ":" + process.env.DANBOORU_API_KEY)).toString("base64")
                }
            }))?.data

            return r
        } catch (e) {
            //console.error("error", e)
        }
    }
}

module.exports = DanbooruService