import Command from "./Command.js";
import personalityService from "../service/personalityService.js";

const saveCommands = {
    enableDMAutoSave: new Command(
        "Enable DM auto save",
        ["!enableDMAutoSave"],
        [],
        null,
        async (msg, from, channel, command, roles, messageId) => {
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
        async (msg, from, channel, command, roles, messageId) => {
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
}

saveCommands.all = [
    saveCommands.enableDMAutoSave,
    saveCommands.disableDMAutoSave
]

export default saveCommands