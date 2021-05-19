/**
 * Updates a given history
 */
function pushIntoHistory(history, entry, isMuted = options.isMuted) {
    if (isMuted) return
    history.push(entry)
    while (history.length > options.maxHistory) history.shift()
}