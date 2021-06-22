require('dotenv').config()
const conf = require('../conf.json')

class TranslationsService {
    static _translations

    static get translations() {
        if (!this._translations) {
            this.changeLanguage()
        }
        return this._translations
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