import axios from "axios";

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
        console.error(e)
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
        console.error(e)
    }
    return false
}

export default {
    generate,
    isServerIsOnline
}