class MemoryService {
    static channelMemories = {}

    static getChannelMemory(channel) {
        return !this.channelMemories[channel] ? [] : this.channelMemories[channel]
    }

    static getChannelMemoryForUser(channel, user) {
        return MemoryService.getChannelMemory(channel)[user]
    }

    static setUserMemoryInChannel(msg, user, channel) {
        if (!MemoryService.channelMemories[channel]) MemoryService.channelMemories[channel] = {}
        MemoryService.channelMemories[channel][user] = msg
    }

    static forgetUserMemoryInChannel(user, channel) {
        if (!MemoryService.channelMemories[channel]) MemoryService.channelMemories[channel] = {}
        delete MemoryService.channelMemories[channel][user]
    }

    static forgetAllUserMemoryInChannel(channel) {
        if (MemoryService.channelMemories[channel])
            delete MemoryService.channelMemories[channel]
    }
}

module.exports = MemoryService