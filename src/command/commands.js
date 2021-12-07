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

export default {
    onMessageCommands: []
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
        .concat(messageCommands.all)    // Should always be last
}