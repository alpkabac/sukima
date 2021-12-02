class MuteService {
    static mutedChannels = {}

    /**
     * @param {String} channel The channel
     */
    static isChannelMuted(channel) {
        return !!MuteService.mutedChannels[channel]
    }

    /**
     * @param {String} channel The channel
     * @param {Boolean} muted Set to true to mute channel, false otherwise
     */
    static setChannelMuteStatus(channel, muted) {
        MuteService.mutedChannels[channel] = muted
    }
}

module.exports = MuteService