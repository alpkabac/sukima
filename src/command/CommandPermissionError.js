class CommandPermissionError extends Error {
    constructor(message) {
        super(message)
    }
}

module.exports = CommandPermissionError