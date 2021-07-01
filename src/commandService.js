require('dotenv').config()
const historyService = require('./historyService')
const memoryService = require('./memoryService')
const translationsService = require('./translationService')
const channelBotTranslationService = require('./channelBotTranslationService')
const conf = require('../conf.json')
const utils = require('./utils')
const aiService = require("./aiService");
const promptService = require("./promptService");
const {getMap, getTags} = require("./r34Service");

class CommandService {
    static mutedChannels

    static loadMutedChannels() {
        if (!this.mutedChannels || this.mutedChannels === {}) {
            this.mutedChannels = conf.mutedChannels || {}
        }
    }

    static isChannelMuted(channel) {
        this.loadMutedChannels()
        return this.mutedChannels[channel]
    }

    static mute(msg, from, channel) {
        const command = "!mute"
        if (msg.startsWith(command)) {
            // TODO: check if user 'from' is allowed to execute that command
            this.loadMutedChannels()
            this.mutedChannels[channel] = true
            return true
        }
        return false
    }

    static unmute(msg, from, channel) {
        const command = "!unmute"
        if (msg.startsWith(command)) {
            // TODO: check if user 'from' is allowed to execute that command
            this.loadMutedChannels()
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
        const command = "!forgetAllRemember"
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
                if (channelBotTranslationService.changeChannelBotTranslations(channel, language, process.env.BOTNAME)) {
                    message += `\nLoaded bot personality file: ${process.env.BOTNAME}/${language}.json`
                } else {
                    message += (message ? "\n" : "") + `Couldn't load bot personality for ${process.env.BOTNAME}/${language}.json`
                }
                if (message) {
                    const privateMessage = channel.startsWith("##")
                    const botTranslations = channelBotTranslationService.getChannelBotTranslations(channel)
                    message = `${message}\n${(privateMessage ? botTranslations.introductionDm : botTranslations.introduction)[0].msg}`
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
                    aiService.sendUntilSuccess(prompt, conf.generate_num, channel.startsWith("##"), (answer) => {
                        historyService.pushIntoHistory(answer, process.env.BOTNAME, channel)
                        resolve({message: answer, channel})
                    }).then(() => {
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
                    aiService.sendUntilSuccess(prompt, conf.generate_num, channel.startsWith("##"), (answer) => {

                        historyService.getChannelHistory(channel).reverse()
                        for (let h of historyService.getChannelHistory(channel)) {
                            if (h.from === process.env.BOTNAME) {
                                if (h.msg.substr(h.msg.length - 1).match(/[,.;?!:]/)) {
                                    h.msg += " "
                                }
                                h.msg += answer
                                break
                            }
                        }
                        historyService.getChannelHistory(channel).reverse()
                        resolve({message: answer, channel})
                    }).then(() => {
                    })
                } else {
                    resolve(true)
                }
            } else {
                resolve(false)
            }
        })
    }

    static retryMessage(msg, from, channel) {
        const command = "²"
        return new Promise((resolve) => {
            if (msg.startsWith(command) && msg.length === 1) {
                if (!this.isChannelMuted(channel)) {
                    const prompt = promptService.getPrompt(msg, from, channel, true, true, false, true)
                    aiService.sendUntilSuccess(prompt, conf.generate_num, channel.startsWith("##"), (answer) => {

                        historyService.getChannelHistory(channel).reverse()
                        for (let h of historyService.getChannelHistory(channel)) {
                            if (h.from === process.env.BOTNAME) {
                                h.msg = answer
                                break
                            }
                        }
                        historyService.getChannelHistory(channel).reverse()
                        resolve({message: answer, channel})
                    }).then(() => {
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
                    aiService.sendUntilSuccess(prompt, undefined, channel.startsWith("##"), (answer) => {
                        historyService.pushIntoHistory(answer, process.env.BOTNAME, channel)
                        resolve({message: answer, channel})
                    }).then(() => {
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
                if (msg.toLowerCase().includes(process.env.BOTNAME.toLowerCase())) {
                    const prompt = promptService.getPrompt(msg, from, channel)
                    aiService.sendUntilSuccess(prompt, undefined, channel.startsWith("##"), (answer) => {
                        historyService.pushIntoHistory(answer, process.env.BOTNAME, channel)
                        resolve({message: answer, channel})
                    }).then(() => {
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
                    historyService.getChannelHistory(channel)[historyService.getChannelHistory(channel).length - 1]
                    : null
                if (lastMessageFromChannel && lastMessageFromChannel.from !== process.env.BOTNAME) {
                    const prompt = promptService.getPrompt(null, null, channel)
                    aiService.sendUntilSuccess(prompt, undefined, channel.startsWith("##"), (answer) => {
                        historyService.pushIntoHistory(answer, process.env.BOTNAME, channel)
                        resolve({message: answer, channel})
                    }).then(() => {
                    })
                } else {
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
                aiService.sendUntilSuccess(prompt, undefined, channel.startsWith("##"), (answer) => {
                    historyService.pushIntoHistory(answer, process.env.BOTNAME, channel)
                    resolve({message: answer, channel})
                }).then(() => {
                })
            } else {
                resolve(true)
            }
        })
    }

    static setEvalbot(msg, from, channel) {
        const command = /!evalbot *([0-9]*)/g.exec(msg);
        return new Promise((resolve) => {
            if (command && command[1]) {
                const message = utils.upperCaseFirstLetter(msg.replace(command, ""))
                const tokenCount = Math.min(100, parseInt(command[1]))
                const result = aiService.simpleEvalbot(message, tokenCount)
                resolve({message: result, channel})
            } else {
                resolve(false)
            }
        })
    }

    static r34(msg, from, channel) {
        const command = "!r34"
        return new Promise((resolve) => {
            if (msg.startsWith(command)) {
                if (this.isChannelMuted(channel)) {
                    resolve(true)
                    return
                }

                let tags = msg.substr((command + " ").length)
                let pid
                const tagSplit = tags.split(" ")
                pid = parseInt(tagSplit[0])

                if (!isNaN(pid)) {
                    tagSplit.shift()
                    tags = tagSplit.join(" ")
                } else {
                    pid = null
                }

                if (!tags) {
                    tags = "alice_in_wonderland"
                }

                getTags(100, null, tags, (found_tags) => {
                    if (found_tags.length > 0) {
                        if (!pid) {
                            pid = Math.floor(Math.random() * Math.floor(found_tags[0].posts / 100))
                        }

                        getMap(100, pid, tags ? tags : null, (posts) => {
                            if (posts && posts.length > 0) {
                                posts = posts
                                    .filter((p) => !p.file_url.endsWith(".mp4"))
                                    .filter((p) => p.score >= 50)

                                if (posts.length === 0) {
                                    resolve(true)
                                } else {
                                    const id = Math.floor(Math.random() * posts.length)
                                    resolve({message: posts[id].file_url, channel})
                                }
                            } else {
                                resolve(true)
                            }
                        })
                    } else {
                        resolve(true)
                    }
                }, null, null)
            } else {
                resolve(false)
            }
        })
    }
}

CommandService.loadMutedChannels()

module
    .exports = CommandService