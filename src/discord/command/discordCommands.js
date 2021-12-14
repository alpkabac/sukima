import setJSONPersonalityCommand from "./setJSONPersonalityCommand.js";

class DiscordCommands {
    static commands = [
        setJSONPersonalityCommand
    ]

    static getOnMessageCommands(){
        return this.commands
    }

    static addOnMessageCommand(command) {
        this.commands.unshift(command)
    }
}

export default DiscordCommands