import muteCommands from "../command/muteCommands.js";
import memoryCommands from "../command/memoryCommands.js";
import languageCommands from "../command/languageCommands.js";
import promptCommands from "../command/promptCommands.js";
import voiceCommands from "../command/voiceCommands.js";
import injectionCommands from "../command/injectionCommands.js";
import wikiCommands from "../command/wikiCommands.js";
import danbooruCommands from "../command/danbooruCommands.js";
import epornerCommands from "../command/epornerCommands.js";
import personalityCommands from "../command/personalityCommands.js";
import messageCommands from "../command/messageCommands.js";
import saveCommands from "../command/saveCommands.js";
import duckHuntCommands from "./duckHuntCommands.js";
import answerToNameCommand from "./answerToNameCommand.js";
import fallbackCommand from "./fallbackCommand.js";
import generatorCommands from "./generatorCommands.js";


class Commands {
    static commands = []
        .concat(muteCommands.all)
        .concat(memoryCommands.all)
        .concat(languageCommands.all)
        .concat(promptCommands.all)
        .concat(voiceCommands.all)
        .concat(injectionCommands.all)
        .concat(wikiCommands.all)
        .concat(danbooruCommands.all)
        .concat(epornerCommands.all)
        .concat(personalityCommands.all)
        .concat(saveCommands.all)
        .concat(duckHuntCommands.all)
        .concat(generatorCommands.all)
        .concat(messageCommands.all)
        .concat(fallbackCommand.all)        // Should always be penultimate
        .concat(answerToNameCommand.all)    // Should always be very last

    static getOnMessageCommands() {
        return this.commands
    }

    static addOnMessageCommand(command) {
        this.commands.unshift(command)
    }
}

export default Commands