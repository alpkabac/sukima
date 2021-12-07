import utils from './utils.js'
const conf = utils.load("./conf.json")

class HistoryService {
    static channelHistories = {}

    static getChannelHistory(channel) {
        return !this.channelHistories[channel] ? [] : this.channelHistories[channel]
    }

    static pushIntoHistory(msg, from, channel, raw = false, messageId = null) {
        if (!this.channelHistories[channel]) this.channelHistories[channel] = []
        const historyEntry = {
            from,
            msg: raw ? msg.trim() : msg.replace(/([ a-zA-Z0-9-_'`\[\]]+):/, "$1,").trim(),
            timestamp: Date.now(),
        }
        if (messageId) historyEntry.messageId = messageId
        this.channelHistories[channel].push(historyEntry)
        while (this.channelHistories[channel].length > conf.maxHistory) this.channelHistories[channel].shift()
    }

    static forgetChannelHistory(channel) {
        if (this.channelHistories[channel])
            delete this.channelHistories[channel]
    }
}

export default HistoryService