const utils = require("../utils");
const MuteService = require("../muteService");

/**
 * Main class to define commands
 */
class Command {
    /**
     * @param commandName {String} Name of the command
     * @param commands {String[]} List of trigger commands
     * @param commandsStartsWith {String[]} List of trigger starting with commands
     * @param permission {String} Name of the required permission
     * @param callback {function} Function of the command
     * @param worksWhenMuted {Boolean} Whether or not this command should work when the bot is muted
     */
    constructor(commandName, commands, commandsStartsWith, permission, callback, worksWhenMuted = true) {
        this.commandName = commandName
        this.commands = commands
        this.commandsStartsWith = commandsStartsWith
        this.permission = permission
        this.callback = callback
        this.worksWhenMuted = worksWhenMuted
    }

    /**
     * @param {String} msg User message
     * @param {String} from User name
     * @param {String} channel The channel
     * @param {String[]} roles List of roles the user have
     * @returns {Boolean|String} true if command was executed silently, false if command wasn't executed
     */
    async call(msg, from, channel, roles) {
        if (!this.worksWhenMuted && MuteService.isChannelMuted(channel))
            return false

        const command = this.commands.find(c => msg === c)
        const commandStartsWith = this.commandsStartsWith.find(c => msg.startsWith(c))
        const noCommand = this.commands.length === 0 && this.commandsStartsWith.length === 0

        // If a command matched or if there is no command at all
        if (command || commandStartsWith || noCommand) {
            if (this.permission)
                if (!utils.checkPermissions(roles, this.permission, channel.startsWith("##")) && (command || commandStartsWith))
                    return {permissionError: true}

            const callbackResult = await this.callback(msg, from, channel, command || commandStartsWith)
            if (callbackResult) {
                if (typeof callbackResult === "object"){
                    callbackResult.commandName = this.commandName
                }
                return callbackResult
            }

            if (this.commands || this.commandsStartsWith)
                return true
        }

        return false
    }
}

module.exports = Command