
class EvalbotService {
    static channelEvalbots = {}

    static getChannelEvalbot(channel) {
        return !this.channelEvalbots[channel] ? {} : this.channelEvalbots[channel]
    }
}

module.exports = EvalbotService