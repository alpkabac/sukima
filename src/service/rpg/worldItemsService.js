class WorldItemsService {
    static activeItems = {}

    static getActiveItems(channel) {
        if (this.activeItems[channel] !== [] && !this.activeItems[channel]) {
            this.activeItems[channel] = []
        }

        return this.activeItems[channel]
    }

    static appendItem(channel, item) {
        this.getActiveItems(channel).push(item)
    }
}

export default WorldItemsService