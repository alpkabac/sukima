import axios from "axios";
import log from "../service/logService.js"

const GENERATOR_API_URL = 'http://localhost:5000/api/v1'

const POST_CONFIG = {
    headers: {
        'Content-Type': 'application/json'
    }
}

async function generate(generatorRequest, apiUrl = GENERATOR_API_URL) {
    try {
        return (await axios.post(apiUrl + '/generator', generatorRequest, POST_CONFIG)).data
    } catch (e) {
        log.error("Could not generate result", e)
    }
}

async function isServerIsOnline(apiUrl = GENERATOR_API_URL) {
    try {
        const answer = await axios
            .post(apiUrl + '/test', {}, POST_CONFIG)

        if (answer) {
            if (answer.status === 200) {
                return true
            } else {
                console.error(answer)
            }
        }
    } catch (e) {
        log.error("Generator server is not online", e)
    }
    return false
}

export default {
    generate,
    isServerIsOnline
}