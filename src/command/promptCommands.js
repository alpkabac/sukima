require('dotenv').config()
const Command = require("./Command");
const utils = require("../utils");
const aiService = require("../aiService");
const loreGenerationToolEntries = require("../loreGenerationToolEntries");
const encoder = require("gpt-3-encoder");

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
    lgt: new Command(
        "Lore Generation Tool",
        [],
        ["!lgt "],
        process.env.ALLOW_PROMPT_MESSAGE,
        async (msg, from, channel, command) => {
            const input = utils.upperCaseFirstLetter(msg.replace(command, "").trim())
            if (input) {
                const placeholder = `INPUT: ${input}\nOUTPUT: `
                const placeholderLength = encoder.encode(placeholder).length
                const entries = utils.shuffleArrayInPlace(JSON.parse(JSON.stringify(loreGenerationToolEntries)))
                let prompt = ``
                while (true) {
                    const entry = entries.pop()
                    const currentPromptLength = encoder.encode(prompt).length
                    const entryText = `INPUT: ${entry.INPUT}\nOUTPUT: ${entry.OUTPUT}\nKEYS: ${entry.KEYS}\n⁂\n`
                    const entryLength = encoder.encode(entryText).length
                    if (currentPromptLength + entryLength + placeholderLength >= 2048 - 150) {
                        break
                    } else {
                        prompt += entryText
                    }
                }
                const result = await aiService.simpleEvalbot(prompt + placeholder, 150)
                return {message: "# " + result, success: true}
            } else {
                return {error: "# You have to provide an input after the command"}
            }
        },
        false
    ),
}

promptCommands.all = [
    promptCommands.prompt,
    promptCommands.lgt,
]

module.exports = promptCommands