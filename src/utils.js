import {config} from "dotenv";

config()
import textToSpeech from "@google-cloud/text-to-speech";
import fs from "fs";
import {Duplex} from "stream";

const conf = load("./conf.json")
const client = new textToSpeech.TextToSpeechClient()


function load (filename) {
    let file
    try {
        file = fs.readFileSync(filename)
        return JSON.parse(file)
    } catch (err) {
        console.error(err)
    }
}

class Utils {
    /**
     * Replaces the nick of the bot by the bot name
     * Helps the bot AI to keep track of who it is
     * @param botName
     * @param nick
     * @param msg
     * @return message where nick is replaced by bot name
     */
    static replaceNickByBotName(msg) {
        if (process.env.BOT_DISCORD_USERNAME){
            return msg.replace(process.env.BOT_DISCORD_USERNAME, process.env.BOTNAME)
        }else{
            return msg
        }
    }

    static upperCaseFirstLetter(str) {
        return str.substr(0, 1).toUpperCase() + str.substr(1)
    }

    static caseInsensitiveStringEquals(str1, str2) {
        return str1.toLowerCase() === str2.toLowerCase()
    }

    static getInterval() {
        const min = parseInt(process.env.MIN_BOT_MESSAGE_INTERVAL) || conf.minBotMessageIntervalInSeconds
        const max = parseInt(process.env.MAX_BOT_MESSAGE_INTERVAL) || conf.maxBotMessageIntervalInSeconds

        return 1000 *
            (
                Math.random()
                * (max - min)
                + min
            )
    }

    static async synthesizeText(text, voiceConfig) {
        const request = {
            input: {text},
            voice: voiceConfig,
            audioConfig: {audioEncoding: 'OGG_OPUS'},
        };

        const [response] = await client.synthesizeSpeech(request);
        return response.audioContent;
    };

    static async tts(connection, text, voiceConfig) {
        const buffer = await Utils.synthesizeText(text, voiceConfig)
        const stream = new Duplex()
        stream.push(buffer)
        stream.push(null)
        connection.play(stream)
    }

    static shuffleArray(array) {
        return Utils.shuffleArrayInPlace(JSON.parse(JSON.stringify(array)))
    }

    static shuffleArrayInPlace(array) {
        let currentIndex = array.length, randomIndex;

        // While there remain elements to shuffle...
        while (currentIndex !== 0) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }

        return array;
    }

    static isMessageFromAllowedChannel(to) {
        if (to.startsWith("##")) return true
        const allowedChannels = process.env.ALLOWED_CHANNEL_NAMES
            .split(',')
            .map(c => c.trim())
        return allowedChannels.some((channel) => Utils.caseInsensitiveStringEquals(to, channel))
    }

    static getBoolFromString(value) {
        return value && value.toLowerCase() === "true"
    }

    static hasRole(roles, roleName) {

        return roles.some(r => {
            return r.name.toLowerCase() === roleName.toLowerCase()
        })
    }

    static checkPermissions(roles, roleName, isPrivateMessage = false) {
        if (!roleName) return true
        if (isPrivateMessage) return true
        if (roleName === "false") return false
        if (roleName === "true") return true

        let roleNames = roleName.split(",").map(r => r.trim())
        if (roleNames.length > 1) {
            roleNames = roleNames.map(r => r.trim())
            return roleNames.some(r => this.hasRole(roles, r))
        } else {
            return this.hasRole(roles, roleName)
        }
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static save(filename, content) {
        try {
            fs.writeFileSync(filename, content)
            return true
        } catch (err) {
            console.error(err)
        }
    }

    static load(filename) {
        return load(filename)
    }
}

export default Utils