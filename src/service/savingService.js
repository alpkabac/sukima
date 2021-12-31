import {config} from "dotenv";

config()
import personalityService from "./personalityService.js";
import historyService from "./historyService.js";
import memoryService from "./memoryService.js";
import utils from "../utils.js";
import fs from "fs";
import pawnService from "./rpg/pawnService.js";
import playerService from "./rpg/playerService.js";
import worldItemsService from "./rpg/worldItemsService.js";

class SavingService {

    static save(channel) {

        const personality = personalityService.getChannelPersonality(channel)

        // Prevents saving DMs
        if (channel.startsWith("##") && !personality?.enabledDMChannels?.[channel]) return false

        const history = historyService.getChannelHistory(channel)
        const memory = memoryService.getChannelMemory(channel)
        const pawn = pawnService.getActivePawn(channel)
        const lastPawnCreatedAt = pawnService.lastPawnCreatedAt[channel] || null
        const players = playerService.players[channel] || {}
        const activeItems = worldItemsService.getActiveItems(channel)

        const filename = `./save/${process.env.BOTNAME}/${channel}.json`
        const data = {
            personality,
            history,
            memory,
            pawn,
            lastPawnCreatedAt,
            players,
            activeItems
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
            const {personality, history, memory, pawn, lastPawnCreatedAt, players,activeItems} = utils.load(`./save/${process.env.BOTNAME}/${channel}.json`)
            if (personality) {
                personalityService.channelBotPersonality[channel] = personality
            }
            if (history) {
                historyService.channelHistories[channel] = history
            }
            if (memory) {
                memoryService.channelMemories[channel] = memory
            }
            if (pawn) {
                pawnService.activePawn[channel] = pawn
            }
            if (lastPawnCreatedAt) {
                pawnService.lastPawnCreatedAt[channel] = lastPawnCreatedAt
            }
            if (players) {
                playerService.players[channel] = players
            }
            if (activeItems) {
                worldItemsService.activeItems[channel] = activeItems
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