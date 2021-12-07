import {config} from "dotenv";

config()
import Command from './Command.js'
import MuteService from '../muteService.js'

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
            MuteService.setChannelMuteStatus(channel, false)
            return {success: true}
        }
    )
}

muteCommands.all = [
    muteCommands.mute,
    muteCommands.unmute
]

export default muteCommands