import {config} from "dotenv";

config()
import personalityService from "./personalityService.js";
import historyService from "./historyService.js";
import memoryService from "./memoryService.js";
import utils from "../utils.js";
import fs from "fs";

class SavingService {

    static save(channel) {

        const personality = personalityService.getChannelPersonality(channel)

        // Prevents saving DMs
        if (channel.startsWith("##") && !personality?.enabledDMChannels?.[channel]) return false

        const history = historyService.getChannelHistory(channel)
        const memory = memoryService.getChannelMemory(channel)

        const filename = `./save/${process.env.BOTNAME}/${channel}.json`
        const data = {
            personality,
            history,
            memory
        }

        try {
            fs.mkdirSync(`./save/${process.env.BOTNAME}`)
        } catch (e) {

        }

        try {
            utils.save(filename, JSON.stringify(data, null, 4))
            return true
        } catch (e) {
            console.log(e)
        }
    }

    static load(channel) {
        try {
            const {personality, history, memory} = utils.load(`./save/${process.env.BOTNAME}/${channel}.json`)
            if (personality) {
                personalityService.channelBotPersonality[channel] = personality
            }
            if (history) {
                historyService.channelHistories[channel] = history
            }
            if (memory) {
                memoryService.channelMemories[channel] = memory
            }
            if (personality && history && memory)
                return true
        } catch (e) {
            console.log(e)
        }

        return false
    }

    static loadAllChannels(){
        try {
            const channelFiles = fs.readdirSync(`./save/${process.env.BOTNAME}`)
            if (channelFiles) {
                for (let channelFile of channelFiles) {
                    SavingService.load(channelFile.replace('.json', ''))
                }
            }
        }catch(e){

        }
    }

}

export default SavingService