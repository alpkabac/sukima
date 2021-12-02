/**
 * Main class to define commands
 */
class Command {
    /**
     * @param commands {String[]} List of trigger commands
     * @param permission {String[]} List of user permissions
     * @param callback {function} Function of the command
     */
    constructor(commands, permission, callback) {
        this.commands = commands
        this.permission = permission
        this.call = callback
    }

    /**
     * @param {String} msg User message
     * @param {String} from User name
     * @param {String} channel The channel
     * @param {String[]} roles List of roles the user have
     * @returns {Boolean|String} true if command was executed silently, false if command wasn't executed
     * @throws {CommandPermissionError}
     */
    call(msg, from, channel, roles) {
        return null
    }
}

module.exports = Command