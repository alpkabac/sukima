import {config} from "dotenv";
import Command from "./Command.js";
import duckHuntService from "../service/rpg/duckHuntService.js";

config()


const generatorCommands = {
    generateSpell: new Command(
        "Generate Spell",
        [],
        ["!spellBook", "!spellbook", "!spell"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.generateSpell(channel, parsedMsg)
        },
        false
    ),
    generator: new Command(
        "Generator",
        [],
        ["!generator"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.generator(channel, parsedMsg, attachmentUrl)
        },
        true
    ),
    generatorPrompt: new Command(
        "Generate Prompt",
        [],
        ["!generatorPrompt"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.generatorPrompt(channel, parsedMsg, attachmentUrl)
        },
        true
    )
}

generatorCommands.all = [
    generatorCommands.generateSpell,
    generatorCommands.generatorPrompt,
    generatorCommands.generator,
]

export default generatorCommands