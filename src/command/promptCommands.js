require('dotenv').config()
const Command = require("./Command");
const utils = require("../utils");
const aiService = require("../aiService");

const promptCommands = {
    prompt: new Command(
        "Prompt",
        [],
        ["!prompt "],
        process.env.ALLOW_PROMPT_MESSAGE,
        async (msg, from, channel, command) => {
            const args = /!prompt *(\d*)\n/g.exec(msg);
            if (args && args[1]) {
                const message = utils.upperCaseFirstLetter(msg.replace(args[0], ""))
                const tokenCount = Math.min(150, parseInt(args[1]))
                const result = await aiService.simpleEvalbot(message, tokenCount)
                return {message: result, success: true}
            }
        },
        false
    ),
}

promptCommands.all = [
    promptCommands.prompt,
]

module.exports = promptCommands