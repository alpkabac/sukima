require('dotenv').config()
const Command = require("./Command");
const MuteService = require("../muteService");

const muteCommands = {
    mute: new Command(
        "Mute",
        ["!mute"],
        [],
        process.env.ALLOW_MUTE,
        (msg, from, channel, command) => {
            MuteService.setChannelMuteStatus(channel, true)
            return {success: true}
        }
    ),
    unmute: new Command(
        "Unmute",
        ["!unmute"],
        [],
        process.env.ALLOW_MUTE,
        (msg, from, channel, command) => {
            MuteService.setChannelMuteStatus(channel, true)
            return {success: true}
        }
    )
}

muteCommands.all = [
    muteCommands.mute,
    muteCommands.unmute
]

module.exports = muteCommands