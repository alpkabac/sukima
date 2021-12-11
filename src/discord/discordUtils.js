import channelBotTranslationService from "../service/personalityService.js";
import {MessageEmbed} from "discord.js";
import utils from "../utils.js";

function fromBoolToState(s) {
    if (s && s === "true") return 'true'
    if (!s || s === "false") return 'false'
}

function fromStringToBoolOrString(s) {
    if (s && s === "true") return 'anybody'
    if (!s || s === "false") return 'nobody'
    return s
}

function updateBotInfo(botClient) {

    botClient.channels.cache.forEach(async channel => {
        if (channel?.name?.toLowerCase() === "bots-info") {

            // Find info message for this bot
            let existingMessage = null;
            (await channel.messages.fetch({limit: 100})).forEach(message => {
                if (message.author.id === botClient.user.id) {
                    existingMessage = message
                }
            })

            const botPersonality = channelBotTranslationService.getChannelPersonality("#" + channel.name.toLowerCase())

            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(process.env.BOTNAME)
                //.setURL('https://discord.js.org/')
                //.setDescription("")
                .setThumbnail(botClient.user.avatarURL())

                .addField('Latest Model Input', `${process.env.LMI_URL || "http://54.37.153.103"}:${process.env.LMI_PORT}/`)
                .addField('General description', botPersonality.displayDescription)
                .addField('Public context', botPersonality.context)
                .addField('DM context', botPersonality.contextDm)
                .addField('Personality context', botPersonality.description)
                .addField('Channel Settings',
                    `Allowed channels: ${process.env.ALLOWED_CHANNEL_NAMES}`
                    + `\nSend intro to channels: ${process.env.SEND_INTRO_TO_CHANNELS}`
                )
                .addField('Timer Settings',
                    `Auto answer min interval: ${process.env.MIN_BOT_MESSAGE_INTERVAL}`
                    + `\nAuto answer max interval: ${process.env.MAX_BOT_MESSAGE_INTERVAL}`
                    + `\nAuto additional message check interval: ${process.env.INTERVAL_AUTO_MESSAGE_CHECK}`
                )

                .addField('\u200B', '\u200B')
                .addField('Personality edition commands',
                    `Auto answer: ${utils.getBoolFromString(process.env.ENABLE_AUTO_ANSWER) ? 'enabled' : 'disabled'}`
                    + `\nText-To-Speech: ${utils.getBoolFromString(process.env.ENABLE_TTS) ? 'enabled' : 'disabled'}`
                    + `\nVoice: ${botPersonality.voice?.name}`
                    + `\nDMs enabled: ${fromBoolToState(process.env.ENABLE_DM)}`
                    + `\nIntro enabled: ${fromBoolToState(process.env.ENABLE_INTRO)}`
                )

                .addField('\u200B', '\u200B')
                .addField('Personality edition commands',
                    `Set personality: ${fromStringToBoolOrString(process.env.ALLOW_SET_PERSONALITY)}`
                    + `\nSet JSON personality: ${fromStringToBoolOrString(process.env.ALLOW_SET_JSON_PERSONALITY)}`
                    + `\nSet voice: ${fromStringToBoolOrString(process.env.ALLOW_SET_VOICE)}`
                    + `\nSet language: ${fromStringToBoolOrString(process.env.ALLOW_CHANGE_LANGUAGE)}`
                )

                .addField('\u200B', '\u200B')
                .addField('Channel commands',
                    `Mute/Unmute: ${fromStringToBoolOrString(process.env.ALLOW_MUTE)}`
                    + `\nRemember: ${fromStringToBoolOrString(process.env.ALLOW_REMEMBER)}`
                    + `\nForget: ${fromStringToBoolOrString(process.env.ALLOW_FORGET)}`
                    + `\nWipe memory: ${fromStringToBoolOrString(process.env.ALLOW_WIPE_REMEMBER)}`
                )

                .addField('\u200B', '\u200B')
                .addField('Message commands',
                    `No context message: ${fromStringToBoolOrString(process.env.ALLOW_NO_CONTEXT_MESSAGE)}`
                    + `\nContinue message: ${fromStringToBoolOrString(process.env.ALLOW_CONTINUE_MESSAGE)}`
                    + `\nRetry message: ${fromStringToBoolOrString(process.env.ALLOW_RETRY_MESSAGE)}`
                    + `\nAnswer message: ${fromStringToBoolOrString(process.env.ALLOW_ANSWER_MESSAGE)}`
                    + `\nComment message: ${fromStringToBoolOrString(process.env.ALLOW_COMMENT_MESSAGE)}`
                    + `\nReaction message: ${fromStringToBoolOrString(process.env.ALLOW_REACTIONS)}`
                )

                .addField('\u200B', '\u200B')
                .addField('Experimental commands',
                    `Prompt: ${fromStringToBoolOrString(process.env.ALLOW_PROMPT_MESSAGE)}`
                    + `\nLore Generation Tool: ${fromStringToBoolOrString(process.env.ALLOW_LORE_GENERATION_TOOL)}`
                    + `\nEvent injection: ${fromStringToBoolOrString(process.env.ALLOW_EVENT_INJECTION_MESSAGE)}`
                    + `\nProperty injection: ${fromStringToBoolOrString(process.env.ALLOW_PROPERTY_INJECTION_MESSAGE)}`
                    + `\nWiki: ${fromStringToBoolOrString(process.env.ALLOW_WIKI)}`
                    + `\nRule 34: ${fromStringToBoolOrString(process.env.ALLOW_RULE34)}`
                    + `\nEporner: ${fromStringToBoolOrString(process.env.ALLOW_EPORNER)}`
                    + `\nDanbooru: ${fromStringToBoolOrString(process.env.ALLOW_DANBOORU)}`
                )

                .setImage(botClient.user.avatarURL())
                .setTimestamp()
            //.setFooter('', botClient.user.avatarURL);

            if (existingMessage) {
                await existingMessage.edit(embed)
            } else {
                channel.send(embed).catch(() => null)
            }
        }
    })
}


export default updateBotInfo