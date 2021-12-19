import setJSONPersonalityCommand from "./setJSONPersonalityCommand.js";
import activityCommands from "./activityCommands.js";

class DiscordCommands {
    static commands = [
        setJSONPersonalityCommand
    ].concat(activityCommands.all)

    static getOnMessageCommands(){
        return this.commands
    }

    static addOnMessageCommand(command) {
        this.commands.unshift(command)
    }
}

export default DiscordCommands