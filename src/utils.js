import {config} from "dotenv";
import textToSpeech from "@google-cloud/text-to-speech";
import fs from "fs";
import {Duplex} from "stream";
import {MessageAttachment} from "discord.js";
import axios from "axios";
import logService from "./service/logService.js";
import sharp from "sharp";

config()

const conf = loadJSONFile("./conf.json")
const client = new textToSpeech.TextToSpeechClient()


function loadJSONFile(filename, silent = false) {
    let file
    try {
        file = fs.readFileSync(filename)
        return JSON.parse(file)
    } catch (err) {
        if (!silent) {
            logService.error("Couldn't load JSON file", err)
        }
    }
}

const URL_IMAGE_GENERATION = "http://92.167.46.77:5000"

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
        if (process.env.BOT_DISCORD_USERNAME) {
            return msg.replace(process.env.BOT_DISCORD_USERNAME, process.env.BOTNAME)
        } else {
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
        try {
            return Utils.shuffleArrayInPlace(JSON.parse(JSON.stringify(array)))
        } catch {
            return array
        }
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
        fs.writeFileSync(filename, content)
        return true
    }

    static loadJSONFile(filename, silent = false) {
        return loadJSONFile(filename, silent)
    }

    static getMessageId(message) {
        const msg = message.trim()
        if (!msg.trim().startsWith("#")) return null

        const match = msg.match(/^#([0-9]*)/)

        if (match && match[1]) {
            return match[1]
        } else {
            return null
        }
    }

    static getMessageAsFile(text, filename) {
        return new MessageAttachment(Buffer.from(text), filename)
    }

    static async getAttachment(attachmentUrl) {
        // fetch the file from the external URL
        const response = await axios.get(attachmentUrl).catch(e => console.error(e));

        // if there was an error send a message with the status
        if (!response?.data)
            return

        // take the response stream and read it to completion
        return response.data;
    }

    static fileExists(filePath) {
        return fs.existsSync(filePath);
    }

    static replaceAsterisksByBackQuotes(text) {
        return text.replace(/\*/g, '`')
    }

    static replaceBackQuotesByAsterisks(text) {
        return text.replace(/`/g, '*')
    }

    static findDuplicates(arr, sortFunction = null) {
        let sorted_arr = sortFunction ? arr.slice().sort(sortFunction) : arr.slice().sort()
        let results = []
        for (let i = 0; i < sorted_arr.length - 1; i++) {
            if (sorted_arr[i + 1] === sorted_arr[i]) {
                results.push(sorted_arr[i])
            }
        }
        return results
    }

    static async getResizedImage(response, resize = true) {
        const imgOriginal = await sharp(Buffer.from(response.data, 'binary'))
        if (resize) {
            const im = await imgOriginal.resize(160, 160, {kernel: sharp.kernel.nearest})
            return await im.toBuffer()
        } else {
            return await imgOriginal.toBuffer()
        }
    }

    static async generatePicture(text, steps = 1000, cutouts = 6, resize = true) {
        try {
            const response = await axios({
                url: URL_IMAGE_GENERATION + `/index?steps=${steps}&cutouts=${cutouts}&input=${encodeURIComponent(text)}`,
                method: 'GET',
                responseType: 'arraybuffer',
            })
            return await this.getResizedImage(response, resize)
        } catch (e) {
            console.error(e)
        }
    }

    static async continuePicture(steps = 600) {
        try {
            const response = await axios({
                url: URL_IMAGE_GENERATION + `/continue?steps=${steps}`,
                method: 'GET',
                responseType: 'stream',
            })
            return await this.getResizedImage(response)
        } catch (e) {
            console.error(e)
        }
    }

    static async changePicturePrompt(prompt, steps = 600) {
        try {
            const response = await axios({
                url: URL_IMAGE_GENERATION + `/changeInput?steps=${steps}&input=${prompt}`,
                method: 'GET',
                responseType: 'stream',
            })
            return await this.getResizedImage(response)
        } catch (e) {
            console.error(e)
        }
    }

    static async updateCutouts(cutouts = 6) {
        try {
            await axios({
                url: `http://localhost:5000/updateCutouts?cutouts=${cutouts}`,
                method: 'GET',
                responseType: 'stream',
            })
        } catch (e) {
            console.error(e)
        }
    }

    static sanitize(str, hard = true) {
        const newStr = str
            .toLowerCase()
            .replace(/[,;.:!?"]/g, '')

        if (hard) {
            return newStr
                .replace(/ a /g, ' ')
                .replace(/ an /g, ' ')
                .replace(/ of /g, ' ')
                .replace(/ or /g, ' ')
                .replace(/ from /g, ' ')
                .replace(/ the /g, ' ')
                .replace(/ this /g, ' ')
                .replace(/ those /g, ' ')
                .replace(/ that /g, ' ')
                .replace(/ has /g, ' ')
                .replace(/ was /g, ' ')
                .replace(/ with /g, ' ')
                .replace(/ and /g, ' ')
                .replace(/ on /g, ' ')
                .replace(/ for /g, ' ')
                .replace(/ by /g, ' ')
                .replace(/ now /g, ' ')
                .replace(/ now /g, ' ')
                .replace(/ to /g, ' ')
                .replace(/ too /g, ' ')
                .replace(/ as /g, ' ')
                .replace(/ is /g, ' ')
                .replace(/ it /g, ' ')
        }else{
            return newStr
        }

    }
}

export default Utils