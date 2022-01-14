import Command from "./Command.js";
import personalityService from "../service/personalityService.js";
import savingService from "../service/savingService.js";
import utils from "../utils.js";

const saveCommands = {
    enableDMAutoSave: new Command(
        "Enable DM auto save",
        ["!enableDMAutoSave"],
        [],
        null,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            const personality = personalityService.getChannelPersonality(channel)
            const isDm = channel.startsWith("##")
            if (!isDm) return {deleteUserMsg: true}

            if (!personality.enabledDMChannels) personality.enabledDMChannels = {}
            personality.enabledDMChannels[channel] = true

            return {
                message: "# Congratulation, the DM auto save feature is now enabled! Remember that you can disable it at any moment with the `!disableDMAutoSave` command!",
                success: true
            }
        },
        true
    ),
    disableDMAutoSave: new Command(
        "Disable DM auto save",
        ["!disableDMAutoSave"],
        [],
        null,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            const personality = personalityService.getChannelPersonality(channel)
            const isDm = channel.startsWith("##")
            if (!isDm) return true

            if (!personality.enabledDMChannels) personality.enabledDMChannels = {}
            personality.enabledDMChannels[channel] = undefined
            delete personality.enabledDMChannels[channel]

            return {
                message: "# DM auto save feature is now disabled! Remember that you can enable it back at any moment with the `!enableDMAutoSave` command!",
                success: true
            }
        },
        true
    ),
    save: new Command(
        "Save channel",
        ["!save"],
        [],
        null,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            const json = savingService.getCompleteJSON(channel)
            const m = utils.getMessageAsFile(JSON.stringify(json, null, 4), `save_${channel}_${Date.now()}.json`)
            return {
                message: m,
                success: true
            }
        },
        true
    ),
    load: new Command(
        "Load channel",
        ["!load"],
        [],
        null,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId, client, attachmentUrl) => {
            const json = await utils.getAttachment(attachmentUrl)

            if (!attachmentUrl || !json) return {
                error: "# You need to provide a valid save file as message attachment!",
                instantReply: true,
                deleteNewMessage: true
            }

            const success = savingService.loadJSON(channel, json)

            if (success) {
                return {
                    success: true
                }
            }else{
                return {
                    error: "# Save file couldn't load or didn't detect anything to load, please verify the sent save file",
                    instantReply: true,
                    deleteNewMessage: true
                }
            }
        },
        true
    ),
}

saveCommands.all = [
    saveCommands.enableDMAutoSave,
    saveCommands.disableDMAutoSave,
    saveCommands.save,
    saveCommands.load
]

export default saveCommands