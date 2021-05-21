const conf = require('../conf.json')

class TranslationsService {
    static _translations
    static _botTranslations

    static get translations() {
        if (!this._translations) {
            this.changeLanguage()
        }
        return this._translations
    }

    static get botTranslations() {
        if (!this._botTranslations) {
            this.changeBotLanguage()
        }
        return this._botTranslations
    }

    static changeBotLanguage(code = conf.defaultBotTranslationFile, botName = conf.botName) {
        try {
            this._botTranslations = require(`../translations/aiPersonality/${botName}/${code}.json`)
            return true
        } catch (e) {
            try {
                this._botTranslations = require(`../translations/aiPersonality/${botName}/${conf.defaultBotTranslationFile}.json`)
            } catch (e2) {
                console.log(e2)
            }
            return false
        }
    }

    static changeLanguage(code = conf.translationFile) {
        try {
            this._translations = require(`../translations/${code}.json`)
            return true
        } catch (e) {
            this._translations = require(`../translations/${conf.translationFile}.json`)
        }
        return false
    }
}

module.exports = TranslationsService