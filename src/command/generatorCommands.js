import {config} from "dotenv";
import Command from "./Command.js";
import duckHuntService from "../service/rpg/duckHuntService.js";
import {MessageAttachment, MessageEmbed} from "discord.js";
import utils from "../utils.js";

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
    workflow: new Command(
        "Generator Workflow",
        [],
        ["!workflow"],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.workflow(channel, parsedMsg, attachmentUrl)
        },
        true
    ),
    ioGenerator: new Command(
        "Intput/Output Generator",
        [],
        ["!ioGenerator ", "!iogenerator ", "!iog "],
        process.env.ALLOW_RPG_ATTACK,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            return duckHuntService.ioGenerator(channel, parsedMsg, attachmentUrl)
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
    ),
    generateImage: new Command(
        "Generate Image",
        [],
        ["!image ", "!img "],
        process.env.ALLOW_IMAGE_GENERATION,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {

            let [text, steps, cutouts, generationCount] = parsedMsg.split(';').map(s => s.trim())

            if (!steps) steps = 1000
            else steps = Math.min(10000, Math.max(1, parseInt(steps)))
            if (!cutouts) cutouts = 6
            else cutouts = Math.min(128, Math.max(1, parseInt(cutouts)))
            if (!generationCount) generationCount = 1
            else generationCount = Math.min(3, Math.max(1, parseInt(generationCount)))

            const ts = Date.now()

            const message = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`${from} generated an image${generationCount === 1 ? '' : ` (x${generationCount})`}`)
                .setDescription(text)
                .addFields(
                    {name: 'Steps', value: steps, inline: true},
                    {name: 'Cutouts', value: cutouts, inline: true},
                )

            let messageAttachments = []
            for (let i = 0; i < generationCount; i++) {
                const buff = await utils.generatePicture(text, steps, cutouts)
                if (buff) {
                    const m = new MessageAttachment(buff, `generated_image_${i}.png`)
                    messageAttachments.push(m)
                }
            }
            message.attachFiles([...messageAttachments])

            const generationTime = ((Date.now() - ts) / 1000)
            message.addFields(
                {name: 'Generation Time', value: `${generationTime.toFixed(1)} seconds`, inline: true},
                {
                    name: 'Steps/second',
                    value: `${((steps * generationCount) / generationTime).toFixed(1)}`,
                    inline: true
                },
            )

            return {
                message: message,
                success: true,
                deleteUserMsg: true,
                instantReply: true
            }
        },
        true
    ),
    continueImage: new Command(
        "Generate Image",
        [],
        ["!cimg"],
        process.env.ALLOW_IMAGE_GENERATION,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {

            let [steps] = parsedMsg.split(';').map(s => s.trim())

            if (!steps) steps = 600
            else steps = Math.min(10000, Math.max(1, parseInt(steps)))

            const ts = Date.now()

            const message = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`${from} continued an image`)
                .setDescription(`${from} continued an image for ${steps} steps`)

            const buff = await utils.continuePicture(steps)
            if (buff) {
                const m = new MessageAttachment(buff, `generated_image.png`)
                message.attachFiles([m])
            }

            const generationTime = ((Date.now() - ts) / 1000)
            message.addFields(
                {name: 'Generation Time', value: `${generationTime.toFixed(1)} seconds`, inline: true},
                {
                    name: 'Steps/second',
                    value: `${((steps) / generationTime).toFixed(1)}`,
                    inline: true
                },
            )

            return {
                message: message,
                success: true,
                deleteUserMsg: true,
                instantReply: true
            }
        },
        true
    ),
    changeImagePrompt: new Command(
        "Change Image Prompt",
        [],
        ["!cimgp", "!cip"],
        process.env.ALLOW_IMAGE_GENERATION,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {

            let [text, steps] = parsedMsg.split(';').map(s => s.trim())

            if (!steps) steps = 600
            else steps = Math.min(10000, Math.max(1, parseInt(steps)))

            const ts = Date.now()

            const message = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`${from} changed the prompt of the image and continued generation`)
                .setDescription(`${text}`)
                .addFields(
                    {name: 'Steps', value: steps, inline: true},
                )

            const buff = await utils.changePicturePrompt(text, steps)
            if (buff) {
                const m = new MessageAttachment(buff, `generated_image.png`)
                message.attachFiles([m])
            }

            const generationTime = ((Date.now() - ts) / 1000)
            message.addFields(
                {name: 'Generation Time', value: `${generationTime.toFixed(1)} seconds`, inline: true},
                {
                    name: 'Steps/second',
                    value: `${((steps) / generationTime).toFixed(1)}`,
                    inline: true
                },
            )

            return {
                message: message,
                success: true,
                deleteUserMsg: true,
                instantReply: true
            }
        },
        true
    ),
    updateCutouts: new Command(
        "Update Image Cutouts",
        [],
        ["!uc"],
        process.env.ALLOW_IMAGE_GENERATION,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {

            let [cutouts] = parsedMsg.split(';').map(s => s.trim())

            if (!cutouts) cutouts = 6
            else cutouts = Math.min(128, Math.max(1, parseInt(cutouts)))

            const message = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`${from} updated the cutouts`)
                .setDescription(`Cutout count: ${cutouts}`)

            await utils.updateCutouts(cutouts)

            return {
                message: message,
                success: true,
                deleteUserMsg: true,
                instantReply: true
            }
        },
        true
    ),
}

generatorCommands.all = [
    generatorCommands.generateSpell,
    generatorCommands.generatorPrompt,
    generatorCommands.generator,
    generatorCommands.workflow,
    generatorCommands.ioGenerator,
    generatorCommands.changeImagePrompt,
    generatorCommands.generateImage,
    generatorCommands.continueImage,
    generatorCommands.updateCutouts
]

export default generatorCommands