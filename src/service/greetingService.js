import {config} from "dotenv";
import utils from "../utils.js";

config()

const greetingGenerator = utils.load("./data/generationPrompt/greetingGeneratorFemale.json")

class GreetingService {
    static getPrompt(username, botName) {
        const context = `[ ${botName} is the official greeting bot of the discord server. ${botName}'s only goal is to greet every new member in the discord server and guide them towards the main discord channels ]\n`
        return context + greetingGenerator
                .map(m => `${m.from.replace('${botName}', botName)}: ${m.msg}`)
                .join('\n')
            + `\nSERVER MESSAGE: User ${username} joined the discord server!\n${botName}:`
    }
}

export default GreetingService