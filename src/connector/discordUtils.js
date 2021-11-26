const channelBotTranslationService = require("../channelBotTranslationService");
const {MessageEmbed} = require("discord.js");
const utils = require('../utils')

function updateBotInfo(botClient) {

    botClient.channels.cache.forEach(async channel => {
        if (channel.name.toLowerCase() === "bots-info") {

            // Find info message for this bot
            let existingMessage = null;
            (await channel.messages.fetch({limit: 100})).forEach(message => {
                if (message.author.id === botClient.user.id) {
                    existingMessage = message
                }
            })

            const botPersonality = channelBotTranslationService.getChannelBotTranslations("#" + channel.name.toLowerCase())

            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(process.env.BOTNAME)
                //.setURL('https://discord.js.org/')
                //.setDescription("")
                .setThumbnail(botClient.user.avatarURL())


                .addField('Public context', botPersonality.context)
                .addField('DM context', botPersonality.contextDm)
                .addField('Personality context', botPersonality.description)
                .addField('Allowed channels', process.env.ALLOWED_CHANNEL_NAMES)

                .addField('\u200B', '\u200B')
                .addField('Personality edition commands',
                    `Voice: ${botPersonality.voice.name}`
                    + `\nAuto answer: ${utils.getBoolFromString(process.env.ENABLE_AUTO_ANSWER) ? 'enabled' : 'disabled'}`
                    + `\nText-To-Speech: ${utils.getBoolFromString(process.env.ENABLE_TTS) ? 'enabled' : 'disabled'}`
                    + `\nDMs enabled: ${utils.getBoolFromString(process.env.ENABLE_DM) ? 'enabled' : 'disabled'}`
                    + `\nIntro enabled: ${utils.getBoolFromString(process.env.ENABLE_INTRO) ? 'enabled' : 'disabled'}`
                )

                .addField('\u200B', '\u200B')
                .addField('Personality edition commands',
                    `Set personality: ${process.env.ALLOW_SET_PERSONALITY}`
                    + `\nSet JSON personality: ${process.env.ALLOW_SET_JSON_PERSONALITY}`
                    + `\nSet voice: ${process.env.ALLOW_SET_VOICE}`
                    + `\nSet language: ${process.env.ALLOW_CHANGE_LANGUAGE}`
                )

                .addField('\u200B', '\u200B')
                .addField('Channel commands',
                    `Mute/Unmute: ${process.env.ALLOW_MUTE}`
                    + `\nRemember: ${process.env.ALLOW_REMEMBER}`
                    + `\nForget: ${process.env.ALLOW_FORGET}`
                    + `\nWipe memory: ${process.env.ALLOW_WIPE_REMEMBER}`
                )

                .addField('\u200B', '\u200B')
                .addField('Message commands',
                    `No context message: ${process.env.ALLOW_NO_CONTEXT_MESSAGE}`
                    + `\nContinue message: ${process.env.ALLOW_CONTINUE_MESSAGE}`
                    + `\nRetry message: ${process.env.ALLOW_RETRY_MESSAGE}`
                    + `\nAnswer message: ${process.env.ALLOW_ANSWER_MESSAGE}`
                    + `\nComment message: ${process.env.ALLOW_COMMENT_MESSAGE}`
                    + `\nReaction message: ${process.env.ALLOW_REACTIONS}`
                )

                .addField('\u200B', '\u200B')
                .addField('Experimental commands',
                    `Prompt: ${process.env.ALLOW_PROMPT_MESSAGE}`
                    + `\nEvent injection: ${process.env.ALLOW_EVENT_INJECTION_MESSAGE}`
                    + `\nProperty injection: ${process.env.ALLOW_PROPERTY_INJECTION_MESSAGE}`
                    + `\nRule 34: ${process.env.ALLOW_RULE34}`
                )

                .setImage(botClient.user.avatarURL())
                .setTimestamp()
            //.setFooter('', botClient.user.avatarURL);

            if (existingMessage) {
                await existingMessage.edit(embed)
            } else {
                channel.send(embed)
            }
        }
    })
}


module.exports = updateBotInfo