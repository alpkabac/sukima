import utils from '../utils.js'

const conf = utils.load("./conf.json")

class HistoryService {
    static channelHistories = {}

    static getChannelHistory(channel) {
        return !this.channelHistories[channel] ? [] : this.channelHistories[channel]
    }

    static delete(channel, messageId) {
        let history = this.channelHistories[channel]
        let index

        for (let h in history) {
            if (history[h].messageId === messageId) {
                index = h
                break
            }
        }

        if (index !== null) {
            history.splice(index, 1)
            return true
        }
        return false
    }

    /**
     * Deletes all messages up to a certain message (included)
     * If the message isn't in the history, method does nothing and returns false
     * @param {String} channel
     * @param {String} messageId
     * @return {boolean}
     */
    static prune(channel, messageId) {
        if (!this.channelHistories[channel]) return false
        let history = this.channelHistories[channel]
        let index

        for (let h in history) {
            if (history[h].messageId === messageId) {
                index = h
                break
            }
        }

        if (index !== null) {
            history.splice(index)
            return true
        }

        return false
    }

    static pushIntoHistory(msg, from, channel, messageId = null) {
        if (!this.channelHistories[channel]) this.channelHistories[channel] = []
        const historyEntry = {
            from,
            msg: msg.trim(),
            timestamp: Date.now(),
        }
        if (messageId) historyEntry.messageId = messageId
        this.channelHistories[channel].push(historyEntry)
        while (this.channelHistories[channel].length > conf.maxHistory) this.channelHistories[channel].shift()
    }

    static editByMessageId(parsedMsg, channel, targetMessageId) {
        if (!this.channelHistories[channel]) return false
        let success = false
        this.channelHistories[channel].reverse()
        for (let h of this.channelHistories[channel]) {
            if ((targetMessageId ? (h.messageId === targetMessageId) : (!h.from || h.from === process.env.BOTNAME))) {
                h.msg = parsedMsg
                success = true
                break
            }
        }
        this.channelHistories[channel].reverse()
        return success
    }

    static forgetChannelHistory(channel) {
        if (this.channelHistories[channel])
            delete this.channelHistories[channel]
    }
}

export default HistoryService