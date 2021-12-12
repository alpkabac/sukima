import {config} from "dotenv";
import utils from "../utils.js";

config()

const greetingGenerator = utils.load("./data/generationPrompt/greetingGeneratorFemale.json")

class GreetingService {
    static getPrompt() {
        return greetingGenerator
            .map(m => `${m.from.replace('${botName}', process.env.BOTNAME)}: ${m.msg}`)
            .join('\n')
    }
}

export default GreetingService