import {config} from "dotenv";
import utils from "./utils.js";

config()

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
            this._translations = utils.load(`../translations/${code}.json`)
            return true
        } catch (e) {
            this._translations = require(`../translations/en-EN.json`)
        }
        return false
    }
}

export default TranslationsService