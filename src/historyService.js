const conf = require('../conf.json')

class HistoryService {
    static channelHistories = {}
    static privateHistories = {}

    static getChannelHistory(channel) {
        return !this.channelHistories[channel] ? [] : this.channelHistories[channel]
    }

    static pushIntoHistory(msg, from, channel) {
        if (!this.channelHistories[channel]) this.channelHistories[channel] = []
        this.channelHistories[channel].push({from, msg: msg.replace(/([ a-zA-Z0-9-_'`\[\]]+):/, "$1,")})
        while (this.channelHistories[channel].length > conf.maxHistory) this.channelHistories[channel].shift()
    }

    static forgetChannelHistory(channel){
        if (this.channelHistories[channel])
            delete this.channelHistories[channel]
    }
}

module.exports = HistoryService