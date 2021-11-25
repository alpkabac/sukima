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

    static changeLanguage(code = "en-EN") {
        try {
            this._translations = require(`../translations/${code}.json`)
            return true
        } catch (e) {
            this._translations = require(`../translations/en-EN.json`)
        }
        return false
    }
}

module.exports = TranslationsService