require('dotenv').config()
const historyService = require('./historyService')
const memoryService = require('./memoryService')
const translationsService = require('./translationService')
const channelBotTranslationService = require('./channelBotTranslationService')
const conf = require('../conf.json')
const utils = require('./utils')
const aiService = require("./aiService")
const promptService = require("./promptService")
const {getMap, getTags} = require("./r34Service")
const voices = JSON.parse(JSON.stringify(require('./tts/languages.json')))

// TODO: split this class
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

    static mute(msg, from, channel, roles) {
        const command = "!mute"
        if (msg.startsWith(command)) {
            if (!utils.checkPermissions(roles, process.env.ALLOW_MUTE)) return true

            this.loadMutedChannels()
            this.mutedChannels[channel] = true
            return true
        }
        return false
    }

    static unmute(msg, from, channel, roles) {
        const command = "!unmute"
        if (msg.startsWith(command)) {
            if (!utils.checkPermissions(roles, process.env.ALLOW_MUTE)) return true

            this.loadMutedChannels()
            delete this.mutedChannels[channel]
            return true
        }
        return false
    }

    static remember(msg, from, channel, roles) {
        const command = "!remember "
        if (msg.startsWith(command)) {
            if (!utils.checkPermissions(roles, process.env.ALLOW_REMEMBER)) return true

            memoryService.setUserMemoryInChannel(msg.replace(command, ""), from, channel)
            return true
        }
        return false
    }

    static forgetRemember(msg, from, channel, roles) {
        const command = "!remember"
        if (msg.startsWith(command)) {
            if (!utils.checkPermissions(roles, process.env.ALLOW_REMEMBER)) return true

            memoryService.forgetUserMemoryInChannel(from, channel)
            return true
        }
        return false
    }

    static forgetAllRemember(msg, from, channel, roles) {
        const command = "!forgetAllRemember"
        if (msg.startsWith(command)) {
            if (!utils.checkPermissions(roles, process.env.ALLOW_WIPE_REMEMBER)) return true

            memoryService.forgetAllUserMemoryInChannel(channel)
            return true
        }
        return false
    }

    static deleteChannelHistory(msg, from, channel, roles) {
        const command = "!forget"
        if (msg.startsWith(command)) {
            if (!utils.checkPermissions(roles, process.env.ALLOW_FORGET)) return true

            historyService.forgetChannelHistory(channel)

            if (channelBotTranslationService.getChannelBotTranslations(channel).introduction.length < 1) return true

            return {
                message: `${channelBotTranslationService.getChannelBotTranslations(channel).introduction[0].msg}`,
                channel
            }
        }
        return false
    }

    static changeLanguage(msg, from, channel, roles) {
        const command = "!lang "
        return new Promise((resolve) => {
            if (msg.startsWith(command)) {
                if (!utils.checkPermissions(roles, process.env.ALLOW_CHANGE_LANGUAGE)) {
                    resolve(true)
                    return
                }

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

    static noContextMessage(msg, from, channel, roles) {
        const command = "!"
        return new Promise((resolve) => {
            if (msg.startsWith(command)) {

                if (!utils.checkPermissions(roles, process.env.ALLOW_NO_CONTEXT_MESSAGE)) {
                    resolve(true)
                    return
                }

                if (!this.isChannelMuted(channel)) {
                    const message = utils.upperCaseFirstLetter(msg.slice(1))
                    historyService.pushIntoHistory(message, from, channel)

                    const prompt = promptService.getNoContextPrompt(message, from, channel)
                    aiService.sendUntilSuccess(prompt, channel.startsWith("##"), (answer) => {
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

    static continueMessage(msg, from, channel, roles) {
        const command = ","
        return new Promise((resolve) => {
            if (msg.startsWith(command) && msg.length === 1) {

                if (!utils.checkPermissions(roles, process.env.ALLOW_CONTINUE_MESSAGE)) {
                    resolve(true)
                    return
                }

                if (!this.isChannelMuted(channel)) {
                    const prompt = promptService.getPrompt(msg, from, channel, true, false)
                    aiService.sendUntilSuccess(prompt, channel.startsWith("##"), (answer) => {

                        historyService.getChannelHistory(channel).reverse()
                        for (let h of historyService.getChannelHistory(channel)) {
                            if (h.from === process.env.BOTNAME) {
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

    static retryMessage(msg, from, channel, roles) {
        const command = "²"
        const command2 = "○"
        return new Promise((resolve) => {
            if ((msg.startsWith(command) || msg.startsWith(command2)) && msg.length === 1) {

                if (!utils.checkPermissions(roles, process.env.ALLOW_RETRY_MESSAGE)) {
                    resolve(true)
                    return
                }

                if (!this.isChannelMuted(channel)) {
                    const prompt = promptService.getPrompt(msg, from, channel, false, true)
                    aiService.sendUntilSuccess(prompt, channel.startsWith("##"), (answer) => {

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

    static answerMessage(msg, from, channel, roles) {
        const command = "?"
        return new Promise((resolve) => {
            if (msg.startsWith(command)) {

                if (!utils.checkPermissions(roles, process.env.ALLOW_ANSWER_MESSAGE)) {
                    resolve(true)
                    return
                }

                if (!this.isChannelMuted(channel)) {
                    const message = utils.upperCaseFirstLetter(msg.slice(1))
                    if (message) {
                        historyService.pushIntoHistory(message, from, channel)
                    }
                    const prompt = promptService.getPrompt(msg, from, channel)
                    aiService.sendUntilSuccess(prompt, channel.startsWith("##"), (answer) => {
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

    static comment(msg, from, channel, roles) {
        const command = "#"
        if (!utils.checkPermissions(roles, process.env.ALLOW_COMMENT_MESSAGE)) return true


        return !!msg.startsWith(command);
    }

    static answerToName(msg, from, channel, roles) {
        return new Promise((resolve) => {

            if (!utils.checkPermissions(roles, process.env.ALLOW_ANSWER_MESSAGE)) {
                resolve(true)
                return
            }

            if (!this.isChannelMuted(channel)) {
                historyService.pushIntoHistory(msg, from, channel, roles)
                if (msg.toLowerCase().includes(process.env.BOTNAME.toLowerCase())) {
                    const prompt = promptService.getPrompt(msg, from, channel)
                    aiService.sendUntilSuccess(prompt, channel.startsWith("##"), (answer) => {
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
                const history = historyService.getChannelHistory(channel)
                const lastMessageFromChannel = history && history.length > 0 ?
                    history[history.length - 1]
                    : null
                if (lastMessageFromChannel && lastMessageFromChannel.from !== process.env.BOTNAME) {
                    const prompt = promptService.getPrompt(null, null, channel)
                    aiService.sendLowPriority(prompt, channel.startsWith("##")).then((answer) => {
                        if (answer) {
                            historyService.pushIntoHistory(answer, process.env.BOTNAME, channel)
                            resolve({message: answer, channel})
                        }
                        resolve(true)
                    })
                } else {
                    resolve(true)
                }
            } else {
                resolve(false)
            }
        })
    }

    static reactToAction(msg, from, channel, roles) {
        return new Promise((resolve) => {

            if (!utils.checkPermissions(roles, process.env.ALLOW_REACTIONS)) {
                resolve(true)
                return
            }

            if (!this.isChannelMuted(channel)) {
                const action = translationsService.translations.onAction
                    .replace("${text}", utils.upperCaseFirstLetter(msg.trim()))
                historyService.pushIntoHistory(action, from, channel)
                const prompt = promptService.getPrompt(msg, from, channel)
                aiService.sendUntilSuccess(prompt, channel.startsWith("##"), (answer) => {
                    historyService.pushIntoHistory(answer, process.env.BOTNAME, channel)
                    resolve({message: answer, channel})
                }).then(() => {
                })
            } else {
                resolve(true)
            }
        })
    }

    static prompt(msg, from, channel, roles) {
        const command = /!prompt *([0-9]*)\n/g.exec(msg);
        return new Promise(async (resolve) => {

            if (command && command[1]) {

                if (!utils.checkPermissions(roles, process.env.ALLOW_PROMPT_MESSAGE)) {
                    resolve(true)
                    return
                }

                const message = utils.upperCaseFirstLetter(msg.replace(command[0], ""))
                const tokenCount = Math.min(150, parseInt(command[1]))
                const result = await aiService.simpleEvalbot(message, tokenCount)
                resolve({message: result, channel})
            } else {
                resolve(false)
            }
        })
    }

    static setPersonality(msg, from, channel, roles) {
        const command = "!setPersonality "
        return new Promise((resolve) => {
            if (msg.toLowerCase().startsWith(command.toLowerCase())) {

                if (!utils.checkPermissions(roles, process.env.ALLOW_SET_PERSONALITY)) {
                    resolve(true)
                    return
                }

                if (conf.changePersonalityChannelBlacklist.includes(channel)) {
                    resolve({message: "Sorry, but this channel personality is locked.", channel})
                    return
                }
                // TODO: check if user 'from' is allowed to execute that command
                const personality = msg.replace(command, "")

                let message = ""
                const aiPersonality = channelBotTranslationService.getChannelBotTranslations(channel)

                if (personality && personality.length > 0) {
                    const lines = personality.split("\n")

                    aiPersonality.description = lines[0]
                    message += "Custom AI Personality " + aiPersonality.description + " loaded!\n"

                    if (lines.length > 1) {
                        for (let i = 1; i < lines.length; i++) {
                            if (!aiPersonality.introduction[i - 1]) {
                                aiPersonality.introduction[i - 1] = {
                                    from: process.env.BOTNAME,
                                    msg: lines[i]
                                }
                            } else {
                                aiPersonality.introduction[i - 1].msg = lines[i]
                            }
                            message += aiPersonality.introduction[i - 1].msg
                        }
                    }

                } else {
                    message = "Sorry, you did something wrong"
                }
                resolve({message, channel})

            } else {
                resolve(false)
            }
        })
    }

    static setVoice(msg, from, channel, roles) {
        const command = "!setVoice "
        return new Promise((resolve) => {
            if (msg.toLowerCase().startsWith(command.toLowerCase())) {

                if (!utils.checkPermissions(roles, process.env.ALLOW_SET_VOICE)) {
                    resolve(true)
                    return
                }

                const voice = msg.replace(command, "")

                let message = ""
                const aiPersonality = channelBotTranslationService.getChannelBotTranslations(channel)

                if (voice && voice.length > 0) {
                    const params = voice.split(" ")

                    if (params.length === 1 || params.length === 3) {
                        if (params.length === 1) {
                            const selectedVoice = voices.voices
                                .find(v => v.name.toLowerCase() === params[0].toLowerCase())
                            if (selectedVoice) {
                                aiPersonality.voice = selectedVoice
                                message = "AI Personality voice set to " + JSON.stringify(selectedVoice)
                            } else {
                                message = "Voice not found, check out https://cloud.google.com/text-to-speech/docs/voices for available voices"
                            }
                        } else if (params.length === 3) {
                            aiPersonality.voice = {
                                languageCode: params[0],
                                name: params[1],
                                ssmlGender: params[2]
                            }
                            message = "AI Personality voice set to " + JSON.stringify(aiPersonality.voice)
                        }
                    } else {
                        message = "Wrong usage. Command for default voice: \"!setVoice en-US en-US-Wavenet-F FEMALE\" or simpler: \"!setVoice en-US-Wavenet-F\""
                    }
                } else {
                    message = "Sorry, you did something wrong"
                }
                resolve({message, channel})

            } else {
                resolve(false)
            }
        })
    }

    static rpgPutEvent(msg, from, channel, roles) {
        const command = "!event "

        if (msg.startsWith(command)) {

            if (!utils.checkPermissions(roles, process.env.ALLOW_EVENT_INJECTION_MESSAGE)) return true


            const event = msg.replace(command, "")
            if (event) {
                const formattedEvent = event.startsWith("[") && event.endsWith("]") ? event :
                    `[ Event: ${event.trim()} ]`
                historyService.pushIntoHistory(formattedEvent, null, channel, true)

                return {message: formattedEvent, channel}
            }
            return true
        } else {
            return false
        }
    }

    static rpgContext(msg, from, channel, roles) {
        const command = "!rpg "

        if (msg.startsWith(command)) {

            if (!utils.checkPermissions(roles, process.env.ALLOW_PROPERTY_INJECTION_MESSAGE)) return true

            const fullCommand = msg.replace(command, "").trim()
            const words = fullCommand.split(" ")
            const key = words.shift()
            const value = words.join(" ")

            if (key && value) {
                const formattedEvent = `[ ${utils.upperCaseFirstLetter(key)}: ${value.trim()} ]`
                historyService.pushIntoHistory(formattedEvent, null, channel, true)

                return {message: formattedEvent, channel}
            }
            return true
        } else {
            return false
        }
    }

    static setJSONPersonality(msg, from, channel, roles) {
        const command = "!setJSONPersonality"
        return !!msg.startsWith(command);

    }

    static r34(msg, from, channel, roles) {
        const command = "!r34"
        return new Promise((resolve) => {
            if (msg.startsWith(command)) {

                if (!utils.checkPermissions(roles, process.env.ALLOW_RULE34)) {
                    resolve(true)
                    return
                }

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