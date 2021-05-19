
/**
 * Load translations, you can use the different files for different languages
 */
let translations
try {
    translations = require(`../translations/${options.translationFile}.json`)
} catch (e) {
    translations = require(`../translations/default.json`)
}

let botTranslations
try {
    botTranslations = require(`../translations/aiPersonality/${options.botName}/${options.translationFile}.json`)
} catch (e) {
    botTranslations = require(`../translations/aiPersonality/${options.botName}/default.json`)
}

