const axios = require("axios");

class DanbooruService {
    static async getTags(tags) {

        try {
            const r = (await axios.get("https://danbooru.donmai.us/posts/random.json?limit=1&tags=" + encodeURI(tags), {
                params: {
                    "limit": 1
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + (Buffer.from("Noli:cTR2osoXdmNnZVuFkAbKAFHt")).toString("base64")
                }
            }))?.data

            console.log(r)
            return r
        } catch (e) {
            console.error("error", e)
            //console.error(e)
        }
    }
}

DanbooruService.getTags("alice_in_wonderland").then()

module.exports = DanbooruService