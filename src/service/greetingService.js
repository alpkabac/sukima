import {config} from "dotenv";
import utils from "../utils.js";

config()

const greetingGenerator = utils.load("./data/generationPrompt/greetingGeneratorFemale.json")

class GreetingService {
    static getPrompt(username, botName) {
        return greetingGenerator
            .map(m => `${m.from.replace('${botName}', botName)}: ${m.msg}`)
            .join('\n')
         + `\nSERVER MESSAGE: User ${username} joined the discord server!\n${botName}:`
    }
}

export default GreetingService