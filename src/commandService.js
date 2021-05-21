const historyService = require('./historyService')
const memoryService = require('./memoryService')
const translationsService = require('./translationService')
const conf = require('../conf.json')
const utils = require('./utils')
const aiService = require("./aiService");
const promptService = require("./promptService");
const messageService = require("./messageService");
const lmiService = require("./lmiService");

class CommandService {
    static mutedChannels

    static isChannelMuted(channel) {
        if (!this.mutedChannels) this.mutedChannels = {}
        return this.mutedChannels[channel]
    }

    static mute(msg, from, channel) {
        const command = "!mute"
        if (msg.startsWith(command)) {
            // TODO: check if user 'from' is allowed to execute that command
            if (!this.mutedChannels) this.mutedChannels = {}
            this.mutedChannels[channel] = true
            return true
        }
        return false
    }

    static unmute(msg, from, channel) {
        const command = "!unmute"
        if (msg.startsWith(command)) {
            // TODO: check if user 'from' is allowed to execute that command
            if (!this.mutedChannels) this.mutedChannels = {}
            delete this.mutedChannels[channel]
            return true
        }
        return false
    }

    static remember(msg, from, channel) {
        const command = "!remember "
        if (msg.startsWith(command)) {
            memoryService.setUserMemoryInChannel(msg.replace(command, ""), from, channel)
            return true
        }
        return false
    }

    static forgetRemember(msg, from, channel) {
        const command = "!remember"
        if (msg.startsWith(command)) {
            memoryService.forgetUserMemoryInChannel(from, channel)
            return true
        }
        return false
    }

    static forgetAllRemember(msg, from, channel) {
        const command = "!forgetAll"
        if (msg.startsWith(command)) {
            // TODO: check if user 'from' is allowed to execute that command
            memoryService.forgetAllUserMemoryInChannel(channel)
            return true
        }
        return false
    }

    static deleteChannelHistory(msg, from, channel) {
        const command = "!forget"
        if (msg.startsWith(command)) {
            // TODO: check if user 'from' is allowed to execute that command
            historyService.forgetChannelHistory(channel)
            return true
        }
        return false
    }

    static changeLanguage(msg, from, channel) {
        const command = "!lang "
        return new Promise((resolve) => {
            if (msg.startsWith(command)) {
                // TODO: check if user 'from' is allowed to execute that command
                const language = msg.replace(command, "")
                let message = ""
                translationsService.changeLanguage(language)
                if (translationsService.changeBotLanguage(language, conf.botName)) {
                    message += `\nLoaded bot personality file: ${conf.botName}/${language}.json`
                } else {
                    message += (message ? "\n" : "") + `Couldn't load bot personality for ${conf.botName}/${language}.json`
                }
                if (message) {
                    resolve({message, channel})
                } else {
                    resolve(true)
                }
            } else {
                resolve(false)
            }
        })
    }

    static noContextMessage(msg, from, channel) {
        const command = "!"
        return new Promise((resolve) => {
            if (msg.startsWith(command)) {
                if (!this.isChannelMuted(channel)) {
                    const message = utils.upperCaseFirstLetter(msg.slice(1))
                    historyService.pushIntoHistory(message, from, channel)

                    const prompt = promptService.getPrompt(message, from, channel, false, false)
                    aiService.sendUntilSuccess(prompt, conf.generate_num, undefined, (answer) => {
                        const parsedAnswer = messageService.parse(answer)
                        lmiService.updateLmi(prompt, answer, parsedAnswer)
                        historyService.pushIntoHistory(parsedAnswer, conf.botName, channel)
                        resolve({message: parsedAnswer, channel})
                    })
                } else {
                    resolve(true)
                }
            } else {
                resolve(false)
            }
        })
    }

    static continueMessage(msg, from, channel) {
        const command = ","
        return new Promise((resolve) => {
            if (msg.startsWith(command) && msg.length === 1) {
                if (!this.isChannelMuted(channel)) {
                    const prompt = promptService.getPrompt(msg, from, channel, true, true, true)
                    aiService.sendUntilSuccess(prompt, conf.generate_num, undefined, (answer) => {
                        const parsedAnswer = messageService.parse(answer)
                        lmiService.updateLmi(prompt, answer, parsedAnswer)

                        historyService.getChannelHistory(channel).reverse()
                        for (let h of historyService.getChannelHistory(channel)) {
                            if (h.from === conf.botName) {
                                if (h.msg.substr(h.msg.length - 1).match(/[,.;?!:]/)) {
                                    h.msg += " "
                                }
                                h.msg += parsedAnswer
                                break
                            }
                        }
                        historyService.getChannelHistory(channel).reverse()
                        resolve({message: parsedAnswer, channel})
                    })
                } else {
                    resolve(true)
                }
            } else {
                resolve(false)
            }
        })
    }

    static answerMessage(msg, from, channel) {
        const command = "?"
        return new Promise((resolve) => {
            if (msg.startsWith(command)) {
                if (!this.isChannelMuted(channel)) {
                    const message = utils.upperCaseFirstLetter(msg.slice(1))
                    if (message) {
                        historyService.pushIntoHistory(message, from, channel)
                    }
                    const prompt = promptService.getPrompt(message, from, channel)
                    aiService.sendUntilSuccess(prompt, undefined, undefined, (answer) => {
                        const parsedAnswer = messageService.parse(answer)
                        lmiService.updateLmi(prompt, answer, parsedAnswer)
                        historyService.pushIntoHistory(parsedAnswer, conf.botName, channel)
                        resolve({message: parsedAnswer, channel})
                    })
                } else {
                    resolve(true)
                }
            } else {
                resolve(false)
            }
        })
    }

    static answerToName(msg, from, channel) {
        return new Promise((resolve) => {
            if (!this.isChannelMuted(channel)) {
                historyService.pushIntoHistory(msg, from, channel)
                if (msg.toLowerCase().includes(conf.botName.toLowerCase())) {
                    const prompt = promptService.getPrompt(msg, from, channel)
                    aiService.sendUntilSuccess(prompt, undefined, undefined, (answer) => {
                        const parsedAnswer = messageService.parse(answer)
                        lmiService.updateLmi(prompt, answer, parsedAnswer)
                        historyService.pushIntoHistory(parsedAnswer, conf.botName, channel)
                        resolve({message: parsedAnswer, channel})
                    })
                } else {
                    resolve(true)
                }
            } else {
                resolve(false)
            }
        })
    }

    static talk(channel) {
        return new Promise((resolve) => {
            if (!this.isChannelMuted(channel)) {
                const lastMessageFromChannel = historyService.getChannelHistory(channel) && historyService.getChannelHistory(channel).length > 0 ?
                    historyService.getChannelHistory(channel)[historyService.getChannelHistory(channel).length-1]
                    : null
                if (lastMessageFromChannel && lastMessageFromChannel.from !== conf.botName) {
                    const prompt = promptService.getPrompt(null, null, channel)
                    aiService.sendUntilSuccess(prompt, undefined, undefined, (answer) => {
                        const parsedAnswer = messageService.parse(answer)
                        lmiService.updateLmi(prompt, answer, parsedAnswer)
                        historyService.pushIntoHistory(parsedAnswer, conf.botName, channel)
                        resolve({message: parsedAnswer, channel})
                    })
                }else{
                    resolve(true)
                }
            } else {
                resolve(false)
            }
        })
    }

    static reactToAction(msg, from, channel) {
        return new Promise((resolve) => {
            if (!this.isChannelMuted(channel)) {
                const action = translationsService.translations.onAction
                    .replace("${text}", utils.upperCaseFirstLetter(msg.trim()))
                historyService.pushIntoHistory(action, from, channel)
                const prompt = promptService.getPrompt(msg, from, channel)
                aiService.sendUntilSuccess(prompt, undefined, undefined, (answer) => {
                    const parsedAnswer = messageService.parse(answer)
                    lmiService.updateLmi(prompt, answer, parsedAnswer)
                    historyService.pushIntoHistory(parsedAnswer, conf.botName, channel)
                    resolve({message: parsedAnswer, channel})
                })
            } else {
                resolve(true)
            }
        })
    }
}

module
    .exports = CommandService