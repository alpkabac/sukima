import utils from "../../utils.js";
import generatorService from "../generatorService.js";
import playerService from "./playerService.js";
import pawnService from "./pawnService.js";
import envService from "../../util/envService.js";
import worldItemsService from "./worldItemsService.js";
import {MessageAttachment, MessageEmbed} from "discord.js";
import sharp from "sharp";
import rpgService from "./rpgService.js";

const generatorAttackNew = utils.fileExists(`./bot/${envService.getBotId()}/generator/attack.json`) ?
    utils.loadJSONFile(`./bot/${envService.getBotId()}/generator/attack.json`)
    : utils.loadJSONFile("./data/generator/rpg/attack.json")

const generatorEnemy = utils.fileExists(`./bot/${envService.getBotId()}/generator/enemy.json`) ?
    utils.loadJSONFile(`./bot/${envService.getBotId()}/generator/enemy.json`)
    : utils.loadJSONFile("./data/generator/rpg/enemy.json")
const generatorSpellBook = utils.loadJSONFile("./data/generationPrompt/rpg/generateSpellBook.json")


const STATUS_DEAD = ["dead", "killed", "died", "deceased", "defeated", "destroyed", "disabled", "total destruction", "annihilated", "obliterated", "defeated!", "ashes"]
const FULL_HEALS = ['healed', 'cured', 'healed (general)', 'cured (general)', 'completely healed', 'completely cured',
    'full heal', 'full health', 'full cure', 'fully restored', 'fully healed', 'fully cured', 'recovered', 'fully recovered',
    'fully restored health', 'restored to full health', 'healed (all types)', 'cured (all wounds)', 'no more injuries', 'removed all injuries',
    'resurrected', 'restored (hit points)']

let swarmSettings = {
    difficulty: null,
    name: null,
    timestamp: null,
    duration: null
}

let itemsToInspect = {}

function isAlive(target) {
    return !!(target?.health?.status && !STATUS_DEAD.includes(target?.health?.status.toLowerCase()));
}

let lastUploadedGenerator = null

class DuckHuntService {

    /**
     * Generate a loot for that pawn
     */
    static async spawnItem(channel, username, rarity, type, name) {

        rarity = rarity?.replace('!spawnitem ', '')
        type = type?.replace('!spawnitem ', '')

        if (!name || !rarity) {
            const args = [
                {name: "type", value: type},
                {name: "rarity", value: rarity},
                {name: "item"},
            ]
            const object = await generatorService.newWorkflow("loot", args)

            name = object.item
            if (!rarity) {
                rarity = object.rarity
            }
        }

        worldItemsService.appendItem(channel, {name, type, rarity})

        const title = `Admin ${username} spawned an item on the ground: ${name} (${rarity} ${type})`
        const embed = new MessageEmbed()
            .setColor('#ffff66')
            .setTitle(title)
            .setDescription(`Spawned item "${name}" is on the ground slot number [${worldItemsService.getActiveItems(channel).length - 1}]`)
            .addField("Item type", type, true)
            .addField("Item rarity", rarity, true)

        return {
            message: embed,
            success: true,
            instantReply: true,
            deleteUserMsg: username !== process.env.BOTNAME,
            pushIntoHistory: [`[ Admin ${username} spawned an item on the ground: ${name} (${rarity} ${type}) ]`, null, channel],
            ttsMessage: title
        }
    }

    static async spawnEquipItem(channel, username, rarity, type, name) {
        rarity = rarity?.replace('!spawnequipitem ', '')
        type = type?.replace('!spawnequipitem ', '')

        if (!name || !rarity) {
            const args = [
                {name: "type", value: type},
                {name: "rarity", value: rarity},
                {name: "item"},
            ]
            const object = await generatorService.newWorkflow("loot", args)

            name = object.item
            if (!rarity) {
                rarity = object.rarity
            }
        }

        const player = playerService.getPlayer(channel, username)

        const item = {name, type, rarity}

        if (player.weapon) {
            player.inventory.push(player.weapon)
        }
        player.weapon = item

        const title = `Admin ${username} spawned and equipped an item: ${name} (${rarity} ${type})`
        const embed = new MessageEmbed()
            .setColor('#ffff66')
            .setTitle(title)
            .setDescription(`Spawned item "${name}" is now used as weapon by ${username}`)
            .addField("Item type", type, true)
            .addField("Item rarity", rarity, true)

        return {
            message: embed,
            success: true,
            instantReply: true,
            deleteUserMsg: username !== process.env.BOTNAME,
            pushIntoHistory: [`[ Player ${username} spawned and equipped an item: ${name} (${rarity} ${type}) ]`, null, channel],
            ttsMessage: title
        }
    }

    static getSwarm() {
        return swarmSettings
    }

    static async swarm(channel, difficulty = null, name = null) {
        let args
        if (!difficulty && !name) {
            args = [
                {name: "name"},
                {name: "difficulty"},
                {name: "encounterDescription"},
            ]
        } else if (difficulty && !name) {
            args = [
                {name: "difficulty", value: difficulty},
                {name: "name"},
                {name: "encounterDescription"},
            ]
        } else if (!difficulty && name) {
            args = [
                {name: "name", value: name},
                {name: "difficulty"},
                {name: "encounterDescription"},
            ]
        } else {
            args = [
                {name: "name", value: name},
                {name: "difficulty", value: difficulty},
                {name: "encounterDescription"},
            ]
        }

        swarmSettings.difficulty = difficulty
        swarmSettings.name = name

        const object = await generatorService.newWorkflow("enemy", args)

        pawnService.createPawn(channel, object.name, object.difficulty, object.encounterDescription)

        const remainingTime = ((swarmSettings.timestamp + swarmSettings.duration) - Date.now()) / 1000
        const title = `New Swarm Event Encounter! (remaining time: ${remainingTime.toFixed(0)} seconds)`
        return {
            message: new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(title)
                .setDescription(object.encounterDescription)
                .addFields(
                    {name: 'Enemy name', value: object.name, inline: true},
                    {
                        name: utils.upperCaseFirstLetter(rpgService.getGenerators()?.["loot"]?.placeholders["difficulty"] || "difficulty"),
                        value: object.difficulty || "undefined",
                        inline: true
                    },
                ),
            pushIntoHistory: [`[ New Enemy Encounter: ${object.name} (${object.difficulty}) ]\n[ ${object.encounterDescription} ]`, null, channel],
            success: true,
            deleteUserMsg: true,
            instantReply: true,
            ttsMessage: title + ". " + object.encounterDescription
        }
    }

    /**
     * Spawns a random animal/critter/enemy
     */
    static async spawn(channel, difficulty = null, name = null, encounterDescription = null) {

        let args
        if (!difficulty && !name) {
            args = [
                {name: "name"},
                {name: "difficulty"},
                {name: "encounterDescription"},
            ]
        } else if (difficulty && !name) {
            args = [
                {name: "difficulty", value: difficulty},
                {name: "name"},
                {name: "encounterDescription"},
            ]
        } else if (!difficulty && name) {
            args = [
                {name: "name", value: name},
                {name: "difficulty"},
                {name: "encounterDescription"},
            ]
        } else {
            args = [
                {name: "name", value: name},
                {name: "difficulty", value: difficulty},
                {name: "encounterDescription"},
            ]
        }

        if (encounterDescription !== null) {
            args = [
                {name: "encounterDescription", value: encounterDescription},
                {name: "name"},
                {name: "difficulty"},
            ]
        }


        const object = await generatorService.newWorkflow("enemy", args)

        const newPawn = pawnService.createPawn(channel, object.name, object.difficulty, object.encounterDescription)

        const title = 'New Encounter!'
        const msg = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(title)
            .setDescription(object.encounterDescription)
            .addFields(
                {name: 'Enemy name', value: object.name, inline: true},
                {name: 'Difficulty', value: object.difficulty, inline: true},
            )

        if (envService.getBoolean("ENABLE_RPG_IMAGES")) {
            const prompt = envService.getBoolean("ENABLE_RPG_NSFW") ?
                `${newPawn.name} naked girl ${utils.sanitize(newPawn.difficulty)}`
                : `${newPawn.name}`
            const buff = await utils.generatePicture(utils.sanitize(prompt, false))
            if (buff) {
                const m = new MessageAttachment(buff, "generated_image.png")
                msg.attachFiles([m])
            }
        }

        return {
            message: msg,
            pushIntoHistory: [`[ New Enemy Encounter: ${object.name} (${object.difficulty}) ]\n[ ${object.encounterDescription} ]`, null, channel],
            success: true,
            deleteUserMsg: true,
            instantReply: true,
            newPawn,
            ttsMessage: title + ". " + object.encounterDescription
        }
    }

    /**
     * Attack the current pawn
     */
    static async attack(channel, username, healMode = false, target = null) {
        let targetPlayer
        const pawn = pawnService.getActivePawn(channel)
        const player = playerService.getPlayer(channel, username)

        if (!isAlive(player)) {
            return {
                message: `# ${username} tried to ${healMode ? 'heal' : 'attack'}, but player ${username} is currently dead and thus cannot make any action.`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to ${healMode ? 'heal' : 'attack'}, but player ${username} is currently dead and thus cannot make any action. ]`, null, channel],
            }
        }

        if (target) {
            targetPlayer = playerService.getPlayer(channel, target, false)
            if (targetPlayer) {
                if (!healMode && isAlive(targetPlayer)) {
                    // Target player acquired
                    target = targetPlayer
                } else if (!healMode && !isAlive(targetPlayer)) {
                    return {
                        message: `# ${username} tried to attack ${target}, but player ${target} is already dead...`,
                        deleteUserMsg: username !== process.env.BOTNAME,
                        deleteNewMessage: username !== process.env.BOTNAME,
                        pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to attack ${target}, but player ${target} is already dead... ]`, null, channel],
                    }
                } else {
                    if (player.heal) {
                        target = targetPlayer
                    } else {
                        return {
                            message: `# ${username} tried to heal ${target}, but player ${username} doesn't have any healing item or spell equipped...`,
                            deleteUserMsg: username !== process.env.BOTNAME,
                            deleteNewMessage: username !== process.env.BOTNAME,
                            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to heal ${target}, but player ${username} doesn't have any healing item or spell equipped... ]`, null, channel],
                        }
                    }
                }
            } else {
                return {
                    message: `# ${username} tried to ${healMode ? 'heal' : 'attack'} player "${target}", but no player with that name could be found...`,
                    deleteUserMsg: username !== process.env.BOTNAME,
                    deleteNewMessage: username !== process.env.BOTNAME,
                    pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to attack player "${target}", but no player with that name could be found... ]`, null, channel],
                }
            }
        } else {
            if (healMode) {
                target = player
            } else {
                target = pawn
            }
        }

        if (target === pawn && !healMode && !pawnService.isPawnAliveOnChannel(channel)) return {
            message: `# ${username} tried to attack, but there is no enemy...`,
            deleteUserMsg: username !== process.env.BOTNAME,
            deleteNewMessage: username !== process.env.BOTNAME,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to attack, but there is no enemy yet... ]`, null, channel],
        }

        const timeDiff = Date.now() - player.lastAttackAt
        if (player.lastAttackAt && timeDiff < 1000 * envService.getRpgAttackCoolDown()) {
            return {
                message: `# ${username} tried to ${healMode ? 'heal' : 'attack'} but is still too tired, ${username} will have to wait for ${((1000 * envService.getRpgAttackCoolDown() - timeDiff) / 1000).toFixed(0)} seconds to ${healMode ? 'heal' : 'attack'} again`,
                reactWith: '⌛',
                deleteNewMessage: username !== process.env.BOTNAME,
                deleteUserMsg: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to ${healMode ? 'heal' : 'attack'} but is still too tired, ${username} will have to wait for ${((1000 * envService.getRpgAttackCoolDown() - timeDiff) / 1000).toFixed(0)} seconds to ${healMode ? 'heal' : 'attack'} again ]`, null, channel],
            }
        }


        const workflowName = target === pawn ?
            "attackEnemy"
            : target === player ?
                healMode ? "healSelf"
                    : "attackSelf"
                : healMode ?
                    "healPlayer"
                    : "attackPlayer"

        const enemyWounds = target.health.wounds.length === 0 ? 'none' : [...new Set(target.health.wounds)].join(', ')
        const enemyStatus = target !== pawn ?
            `[ Target: ${target.name}; race/species: human; \${wounds}: ${enemyWounds}; \${bloodLoss}: ${target.health.bloodLoss}; status: ${target.health.status} ]`
            : healMode ?
                `[ Target: Yourself; race/species: human; \${wounds}: ${enemyWounds}; \${bloodLoss}: ${player.health.bloodLoss}; status: ${player.health.status} ]`
                : `[ Target: ${target.name}; \${difficulty}: ${target.difficulty}; \${wounds}: ${enemyWounds}; \${bloodLoss}: ${target.health.bloodLoss}; status: ${target.health.status} ]`
        const playerEquipment = playerService.getEquipmentPrompt(player, healMode)

        const input = {
            player: playerEquipment,
            enemy: enemyStatus,
            enemyCurrentWounds: enemyWounds,
            enemyCurrentBloodLoss: target.health.bloodLoss,
            enemyCurrentStatus: target.health.status
        }

        const object = await generatorService.newWorkflow(workflowName, input)

        if (target === pawn && !healMode) pawn.attacks.push({player: username, description: object.description})

        const noDamageStrings = ["n/a", "no damage", "none", "undefined", "blocked", "spared", "missed", "failed attempt", "failed attempt (unsuccessful)", "0", "thrown", "nothing"]
        if (object.wounds && object.wounds.trim() && !noDamageStrings.includes(object.wounds.trim().toLowerCase())) {
            const parsedWounds = object.wounds.toLowerCase()
                .split(/[;,+]./)
                .map(e => e.trim())
            const newWounds = [...new Set(parsedWounds)]

            if (healMode) {
                if (newWounds.some(nw => FULL_HEALS.includes(nw))) {
                    target.health.wounds = []
                    object.bloodLoss = 'none'
                    object.status = 'healthy'
                }

                // removes wounds if any word matches with healing "wound"
                target.health.wounds = target.health.wounds.filter(
                    wound => !wound.split(' ').some(word =>
                        !newWounds.some(nw =>
                            !nw.split(' ').some(nww => word === nww)
                        )
                    )
                )
            } else {
                target.health?.wounds?.push?.(...newWounds)
            }
        }

        if (object.bloodLoss && object.bloodLoss.trim()) {
            target.health.bloodLoss = object.bloodLoss
        }

        if (object.status && object.status.trim() && !["failed"].includes(object.status.trim().toLowerCase())) {
            target.health.status = object.status.toLowerCase()
        }

        if (object.status && object.status.trim() && STATUS_DEAD.includes(object.status.trim().toLowerCase())) {
            if (target === pawn && !healMode) pawn.alive = false
        }

        player.lastAttackAt = Date.now()

        const title = target === pawn ?
            `Player ${username} attacks the ${target.name} (${pawn.difficulty})!`
            : target === player ?
                healMode ?
                    `Player ${username} heals itself!`
                    : `Player ${username} attacks itself!`
                : healMode ? `Player ${username} heals player ${target.name}!`
                    : `Player ${username} attacks player ${target.name}!`


        const msg = new MessageEmbed()
            .setColor('#ff0000')
            .setTitle(title)
            .setDescription(`${object.description || 'undefined'}`)
            .addField('New wounds', object.wounds || 'undefined', true)
            .addField('New blood loss', object.bloodLoss || 'undefined', true)
            .addField('New status', object.status || 'undefined', true)
            .addField('Is dead?', STATUS_DEAD.includes(object.status.trim().toLowerCase()), true)
            .addField('All wounds', [...new Set(target.health.wounds)].join('\n') || 'none', false)
            .addField(`Player equipment used for ${healMode ? 'heal' : 'attack'}`, playerEquipment, false)


        const {embed, pushIntoHistory, ttsMessage} = (target !== pawn || target.alive) ?
            {embed: null, pushIntoHistory: null, ttsMessage: null}
            : (await this.loot(channel) || {embed: null, pushIntoHistory: null, ttsMessage: null})

        if (target === pawn && !healMode && !pawn.alive) {
            pawnService.lastPawnKilledAt[channel] = Date.now()
        }

        const historyMessage = (username !== process.env.BOTNAME ?
                `!${healMode ? 'heal' : 'attack'}${target === pawn || target === player ?
                    ''
                    : ` ${target.name}`}\n`
                : '')
            + `[ ${title} ]`
            + `\n[ Narrator to ${username}: ${object.description} ]`
            + (target === pawn ?
                `\n[ Target new wound(s): ${object.wounds}; Target new status: ${object.status}${pawn.alive ? ' (not dead yet)' : ''} ]`
                : `\n[ Target: ${target.name}; new wound(s): ${object.wounds}; Target new status: ${object.status}${isAlive(target) && !healMode ? ' (not dead yet)' : ''} ]`)
            + (isAlive(target) ? '' : `\n[ ${target === pawn ? `Enemy ${pawn.name} (${pawn.difficulty})` : `Target ${target.name}`} has been defeated and is now dead! ]`)
            + (pushIntoHistory ? `\n${pushIntoHistory}` : '')

        return {
            pushIntoHistory: [historyMessage, username !== process.env.BOTNAME ? username : null, channel],
            message: msg,
            reactWith: '⚔',
            deleteUserMsg: username !== process.env.BOTNAME,
            instantReply: true,
            alsoSend: (target !== pawn || pawn.alive) ? null : embed,
            ttsMessage: title + '. ' + object.description + (!ttsMessage ? '' : `.. ${ttsMessage}`)
        }
    }

    static async wound(channel, username, healMode = false, target = null) {
        let targetPlayer
        const pawn = pawnService.getActivePawn(channel)

        let wound
        [target, wound] = target.split(';').map(s => s.trim())

        if (!wound || !target) return {deleteUserMsg: username !== process.env.BOTNAME}

        if (target) {
            targetPlayer = playerService.getPlayer(channel, target, false)
            if (targetPlayer) {
                if (!healMode && isAlive(targetPlayer)) {
                    // Target player acquired
                    target = targetPlayer
                } else if (!healMode && !isAlive(targetPlayer)) {
                    return {
                        message: `# ${username} tried to attack ${target}, but player ${target} is already dead...`,
                        deleteUserMsg: username !== process.env.BOTNAME,
                        deleteNewMessage: username !== process.env.BOTNAME,
                        pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to attack ${target}, but player ${target} is already dead... ]`, null, channel],
                    }
                } else {
                    target = targetPlayer
                }
            } else {
                return {
                    message: `# ${username} tried to attack player "${target}", but no player with that name could be found...`,
                    deleteUserMsg: username !== process.env.BOTNAME,
                    deleteNewMessage: username !== process.env.BOTNAME,
                    pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to attack player "${target}", but no player with that name could be found... ]`, null, channel],
                }
            }
        } else {
            target = pawn
        }

        if (target === pawn && !pawnService.isPawnAliveOnChannel(channel)) return {
            deleteUserMsg: username !== process.env.BOTNAME,
            deleteNewMessage: username !== process.env.BOTNAME
        }

        target.health.wounds.push(wound.toLowerCase())

        return {
            success: true,
            deleteUserMsg: username !== process.env.BOTNAME,
            instantReply: true
        }
    }

    static async kill(channel, username, target = null) {
        if (!target) return {deleteUserMsg: username !== process.env.BOTNAME}

        let targetPlayer = playerService.getPlayer(channel, target, false)

        if (targetPlayer) {
            if (!isAlive(targetPlayer)) {
                return {
                    message: `# Admin ${username} tried to kill ${target}, but player ${target} is already dead...`,
                    deleteUserMsg: username !== process.env.BOTNAME,
                    deleteNewMessage: username !== process.env.BOTNAME,
                    pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Admin ${username} tried to kill ${target}, but player ${target} is already dead... ]`, null, channel],
                }
            }
        } else {
            return {
                message: `# Admin ${username} tried to kill player "${target}", but no player with that name could be found...`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Admin ${username} tried to kill player "${target}", but no player with that name could be found... ]`, null, channel],
            }
        }

        targetPlayer.health.status = "dead"

        const title = `Admin ${username} kills ${targetPlayer.name}!`
        const msg = new MessageEmbed()
            .setColor('#ff0000')
            .setTitle(title)
            .setDescription(`Admin ${username} kills ${targetPlayer.name}!`)
            .addField(`${targetPlayer.name}'s wounds`, targetPlayer.health.wounds.join(', ') || 'none', true)
            .addField(`${targetPlayer.name}'s blood loss`, targetPlayer.health.bloodLoss || 'undefined', true)
            .addField(`${targetPlayer.name}'s status`, targetPlayer.health.status || 'undefined', true)

        return {
            message: msg,
            success: true,
            deleteUserMsg: username !== process.env.BOTNAME,
            instantReply: true,
            ttsMessage: title
        }
    }

    static async resurrect(channel, username, target = null, reviveMode = false) {
        let targetPlayer
        if (target) {
            targetPlayer = playerService.getPlayer(channel, target, false)
            if (targetPlayer) {

            } else {
                return {
                    message: `# ${username} tried to attack a player, but no player with that name could be found...`,
                    deleteUserMsg: username !== process.env.BOTNAME,
                    deleteNewMessage: username !== process.env.BOTNAME,
                    pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to attack a player, but no player with that name could be found... ]`, null, channel],
                }
            }
        } else {
            return {
                message: `# ${username} tried to resurrect a player, but no player with that name could be found...`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to resurrect a player, but no player with that name could be found... ]`, null, channel],
            }
        }

        const verb = STATUS_DEAD.includes(targetPlayer.health.status) ?
            reviveMode ?
                "revived"
                : "resurrected"
            : reviveMode ?
                "heals"
                : "heals"

        if (!reviveMode) {
            targetPlayer.health.wounds = []
        }
        targetPlayer.health.bloodLoss = 'none'
        targetPlayer.health.status = 'healthy'

        const title = reviveMode ? `Admin ${username} ${verb} ${targetPlayer.name}, but ${targetPlayer.name}'s wounds are still here.` : `Admin ${username} ${verb} ${targetPlayer.name}!`
        const msg = new MessageEmbed()
            .setColor('#ff0000')
            .setTitle(title)
            .setDescription(reviveMode ? `Admin ${username} ${verb} ${targetPlayer.name}, but ${targetPlayer.name}'s wounds are still here.` : `Admin ${username} ${verb} ${targetPlayer.name} to full health!`)
            .addField(`${targetPlayer.name}'s wounds`, targetPlayer.health.wounds.join(', ') || 'none', true)
            .addField(`${targetPlayer.name}'s blood loss`, targetPlayer.health.bloodLoss || 'undefined', true)
            .addField(`${targetPlayer.name}'s status`, targetPlayer.health.status || 'undefined', true)

        const historyMessage = reviveMode ? `[ Player ${username} ${verb} ${targetPlayer.name}, but ${targetPlayer.name}'s wounds are still here. ]` : `[ Player ${username} ${verb} ${targetPlayer.name} to full health! ]`

        return {
            pushIntoHistory: [historyMessage, username !== process.env.BOTNAME ? username : null, channel],
            message: msg,
            deleteUserMsg: username !== process.env.BOTNAME,
            instantReply: true,
            ttsMessage: title
        }
    }

    /**
     * Generate a loot for that pawn
     */
    static async loot(channel) {
        if (!pawnService.isPawnDeadOnChannel(channel)) return null

        const pawn = pawnService.getActivePawn(channel)

        let lootedItem
        if (pawn?.loot) {
            lootedItem = pawn.loot
        } else {
            const args = [
                {name: "name", value: pawn.name},
                {name: "difficulty", value: pawn.difficulty},
                {name: "item"},
                {name: "type"},
                {name: "rarity"},
            ]
            const object = await generatorService.newWorkflow("loot", args)
            lootedItem = {name: object.item, type: object.type, rarity: object.rarity}
        }

        worldItemsService.appendItem(channel, {name: lootedItem.name, type: lootedItem.type, rarity: lootedItem.rarity})
        pawnService.removePawn(channel)

        const embed = new MessageEmbed()
            .setColor('#ffff66')
            .setTitle(`Loot for ${pawn.name} (${pawn.difficulty?.toLowerCase?.()}): ${lootedItem.name} (${lootedItem.rarity} ${lootedItem.type})`)
            .setDescription(`Looted item "${lootedItem.name}" is on the ground slot number [${worldItemsService.getActiveItems(channel).length - 1}]`)
            .addField("Item type", lootedItem.type, true)
            .addField("Item rarity", lootedItem.rarity, true)

        if (lootedItem.image) {
            const buff = new Buffer.from(lootedItem.image, "base64")
            const imgOriginal = await sharp(Buffer.from(buff, 'binary'))
            const im = await imgOriginal.resize(160, 160, {kernel: sharp.kernel.nearest})
            const messageAttachment = new MessageAttachment(await im.toBuffer(), "output.png")
            embed.attachFiles([messageAttachment])
        }

        const lootText = `Loot item falling on the ground for defeating ${pawn.name} (${pawn.difficulty.toLowerCase()}): ${lootedItem.name} (${lootedItem.rarity} ${lootedItem.type})`
        if (lootedItem) {
            return {
                embed,
                pushIntoHistory: `[ ${lootText} ]`,
                ttsMessage: lootText
            }
        }
    }

    static take(channel, username, itemSlot) {
        const activeItems = worldItemsService.getActiveItems(channel)
        const fromBot = username === process.env.BOTNAME
        const itemSlotNotProvided = fromBot ? true : (!itemSlot?.trim() && typeof itemSlot === "string")
        const itemSlotNumber = itemSlotNotProvided ? activeItems.length - 1 : parseInt(itemSlot?.trim())

        const player = playerService.getPlayer(channel, username)

        if (!isAlive(player)) {
            return {
                message: `# ${username} tried to take an item, but player ${username} is currently dead and thus cannot make any action.`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to take an item, but player ${username} is currently dead and thus cannot make any action. ]`, null, channel],
            }
        }

        const remainingTime = swarmSettings.timestamp ? ((swarmSettings.timestamp + swarmSettings.duration) - Date.now()) / 1000 : 0

        if (remainingTime > 0) {
            return {
                message: `# ${username} tried to take an item, but a swarm event is currently happening. You have to defeat the swarm first!`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to take an item, but a swarm event is currently happening. You have to defeat the swarm first! ]`, null, channel],
            }
        }

        const tookItem = playerService.takeItem(channel, username, activeItems[itemSlotNumber])
        if (tookItem) {
            activeItems.splice(itemSlotNumber, 1)
        }

        const item = tookItem ? player.inventory[player.inventory.length - 1] : tookItem

        if (item) {
            const embed = new MessageEmbed()
                .setColor('#884422')
                .setTitle(`Player ${username} takes the item "${item.name}"`)
                .setDescription(`${username} puts the item in its backpack slot number [${player.inventory.length - 1}]`)

            const text = `Player ${username} takes the item ${item.name} (${item.rarity} ${item.type}) and puts it in its backpack`
            return {
                message: embed,
                success: true,
                deleteUserMsg: username !== process.env.BOTNAME,
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !take\n` : '') + `[ ${text} ]`, null, channel],
                ttsMessage: text
            }
        } else if (item === false) {
            return {
                message: `# ${username} tried to take an item, but its backpack is full. Try to \`!sell\` or \`!drop\` an item first, or \`!upgrade\` your backpack!!`,
                instantReply: true,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Player ${username} tried to take an item, but its backpack is full. Try to "!sell" or "!drop" your backpack selected item first, or use "!upgradeBackpack"! ]`, null, channel]
            }
        }
        return {
            message: `# ${username} tried to take an item on the ground, but there is no item to grab...`,
            instantReply: true,
            deleteUserMsg: username !== process.env.BOTNAME,
            deleteNewMessage: username !== process.env.BOTNAME,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Player ${username} tried to take an item on the ground, but there is no item to grab... ]`, null, channel]
        }
    }

    static async drop(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)
        const fromBot = username === process.env.BOTNAME
        const itemSlotNotProvided = fromBot ? true : (!itemSlot?.trim() && typeof itemSlot === "string")
        const itemSlotNumber = itemSlotNotProvided ? player.inventory.length - 1 : parseInt(itemSlot?.trim())

        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (!isAlive(player)) {
            return {
                message: `# ${username} tried to drop an item, but player ${username} is currently dead and thus cannot make any action.`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to drop an item, but player ${username} is currently dead and thus cannot make any action. ]`, null, channel],
            }
        }

        if (!item) {
            return {
                message: `# ${username} tried to drop an item but has no item in inventory slot [${itemSlotNumber}]`,
                instantReply: true,
                deleteUserMsg: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to drop an item from backpack but doesn't have any item! ]`, null, channel]
            }
        }

        worldItemsService.appendItem(channel, item)
        player.inventory.splice(player.inventory.indexOf(item), 1)

        const embed = new MessageEmbed()
            .setColor('#888844')
            .setTitle(`Player ${username} drops the item "${item.name}" on the ground`)
            .setDescription(`Ground slot number [${worldItemsService.getActiveItems(channel).length - 1}]`)

        const text = `Player ${username} drops the item ${item.name} (${item.rarity} ${item.type}) on the ground`
        return {
            success: true,
            message: embed,
            deleteUserMsg: username !== process.env.BOTNAME,
            instantReply: true,
            pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !drop\n` : '') + `[ ${text} ]`, null, channel],
            ttsMessage: text
        }
    }

    static async look(channel, username) {
        const items = worldItemsService.getActiveItems(channel)

        const itemListString = `${items.map((item, i) => `${i}: [${item.rarity} ${item.type}] "${item.name}"`).join('\n') || 'None'}`

        const seenItem = items[items.length - 1]
        const lastItemOnTheGround = `${seenItem?.name || 'none'}`
            + (!seenItem ? `` : ` (${seenItem.rarity} ${seenItem.type})`)


        let chunks = []
        let lines = itemListString.split('\n')
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const messageWillBeTooLong = chunks.length === 0 || chunks[chunks.length - 1].length + line.length + 2 > 4000
            if (i % 50 === 0 || messageWillBeTooLong) {
                chunks.push(line)
            } else {
                chunks[chunks.length - 1] += "\n" + line
            }
        }

        const messages = chunks.map((c, i) => new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`Items on the ground (page ${i + 1}/${chunks.length})`)
            .setDescription(c))

        return {
            success: true,
            message: messages[0],
            deleteUserMsg: username !== process.env.BOTNAME,
            instantReply: true,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Item on the ground: ${lastItemOnTheGround} ]`, null, channel],
            alsoSend: messages && messages?.length > 1 ? messages.slice(1) : null
        }
    }

    static async cleanup(channel, username, from = null, to = null) {
        const items = worldItemsService.getActiveItems(channel)

        const msg = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`${username} cleaned up the ground! Items left on the ground:`)

        if (to === null && from === null) {
            items.splice(from, items.length)
        } else if (to === null && from !== null) {
            items.splice(from, 1)
        } else if (typeof to === "number") {
            items.splice(from, to - from)
        }

        msg.setDescription(`${items.map((item, i) => `${i}: [${item.rarity} ${item.type}] "${item.name}"`).join('\n') || 'None'}`)
        return {
            success: true,
            message: msg,
            deleteUserMsg: username !== process.env.BOTNAME,
            instantReply: true,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Administrator deleted some items on the ground to clean up the server ]`, null, channel],
            ttsMessage: `${username} cleaned up some items on the ground!`
        }
    }

    static async sell(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        if (!isAlive(player)) {
            return {
                message: `# ${username} tried to sell an item, but player ${username} is currently dead and thus cannot make any action.`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to sell an item, but player ${username} is currently dead and thus cannot make any action. ]`, null, channel],
            }
        }

        const itemSlotNotProvided = username === process.env.BOTNAME ? true : (!itemSlot && typeof itemSlot === "string")

        const itemSlotNumber = itemSlotNotProvided ? player.inventory.length - 1 : parseInt(itemSlot)
        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (!item) {
            const message = itemSlotNumber < 0 ?
                `# ${username} tried to sell an item but has no item in its backpack`
                : `# ${username} tried to sell an item but has no item in inventory slot [${itemSlotNumber}]`
            return {
                message,
                instantReply: true,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Player ${username} tried to sell an item but has no item in its backpack! ]`, null, channel]
            }
        }

        const args = [
            {name: "item", value: item.name},
            {name: "type", value: item.type || 'undefined type'},
            {name: "rarity", value: item.rarity || 'undefined rarity'},
            {name: "price"},
        ]
        const object = await generatorService.newWorkflow("sell", args)

        let goldAmount = !object?.price ? null : parseInt(
            object.price.trim().split(' ')[0]
        )

        if (goldAmount && typeof goldAmount === "number" && !isNaN(goldAmount)) {
            player.gold += goldAmount
            player.inventory.splice(player.inventory.indexOf(item), 1)
        } else if (['infinite', 'unlimited', 'unknown', 'infinity', '-infinity', 'unlimited!', 'infinity!']
            .includes(object.price.trim().split(' ')[0]?.split?.(' ')?.[0]?.toLowerCase())) {
            goldAmount = 100000
            player.gold += goldAmount
            player.inventory.splice(player.inventory.indexOf(item), 1)
        } else {
            return {
                error: `# ${username} tried to sell an item but something went wrong with the AI generation (missing numerical value in result)`,
                instantReply: true,
                deleteUserMsg: username !== process.env.BOTNAME
            }
        }

        const embed = new MessageEmbed()
            .setColor('#ffff00')
            .setTitle(`Player ${username} sold the item "${item.name}" for ${goldAmount} ${generatorEnemy.placeholders["currency"] || 'gold'}!`)
            .setDescription(`Total player ${generatorEnemy.placeholders["currency"] || 'gold'} now: ${player.gold}`)

        const text = `Player ${username} sold the item ${item.name} (${item.rarity} ${item.type}) for ${goldAmount} ${generatorEnemy.placeholders["currency"] || 'gold'}!`
        return {
            success: true,
            message: embed,
            deleteUserMsg: username !== process.env.BOTNAME,
            instantReply: true,
            pushIntoHistory: [
                (username !== process.env.BOTNAME ? `${username}: !sell\n` : '') + `[ ${text} ]`,
                null,
                channel
            ],
            ttsMessage: text
        }
    }

    static async equipItem(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        if (!isAlive(player)) {
            return {
                message: `# ${username} tried to equip an item, but player ${username} is currently dead and thus cannot make any action.`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to equip an item, but player ${username} is currently dead and thus cannot make any action. ]`, null, channel],
            }
        }

        let itemSlotNumber
        if (!itemSlot?.trim()) {
            itemSlotNumber = player.inventory.length - 1
        } else {
            itemSlotNumber = parseInt(itemSlot)
            if (isNaN(itemSlotNumber)) {
                itemSlotNumber = player.inventory.length - 1
            }
        }

        const item = player.inventory[itemSlotNumber] || null

        if (!item) return {
            error: `# ${username} tried to equip an item but has no item in inventory slot [${itemSlotNumber}]`,
            instantReply: true,
            deleteUserMsg: username !== process.env.BOTNAME
        }

        const ITEM_CATEGORIES = {
            weapon: ["weapon"],
            armor: ["armor", "clothing"],
            accessory: ["accessory"]
        }

        let itemCategory = null
        for (let c in ITEM_CATEGORIES) {
            if (item.type.toLowerCase().includes(ITEM_CATEGORIES[c])) {
                itemCategory = c
                break
            }
        }

        if (itemCategory === null) throw new Error("Null category")

        if (itemCategory === "weapon") {

        } else if (itemCategory === "armor") {

        } else if (itemCategory === "accessory") {

        }
    }

    static async equipWeapon(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        if (!isAlive(player)) {
            return {
                message: `# ${username} tried to equip an item, but player ${username} is currently dead and thus cannot make any action.`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to equip an item, but player ${username} is currently dead and thus cannot make any action. ]`, null, channel],
            }
        }

        let itemSlotNumber
        if (!itemSlot || !itemSlot.trim() || username === process.env.BOTNAME) {
            itemSlotNumber = player.inventory.length - 1
        } else {
            itemSlotNumber = parseInt(itemSlot)
        }

        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (!item) return {
            message: `# ${username} tried to equip an item but has no item in inventory slot [${itemSlotNumber}]`,
            instantReply: true,
            deleteUserMsg: username !== process.env.BOTNAME,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Player ${username} tried to equip a weapon but has no item in its backpack! ]`, null, channel]

        }

        if (!player.weapon) {
            player.weapon = player.inventory[itemSlotNumber]
            player.inventory.splice(player.inventory.indexOf(player.inventory[itemSlotNumber]), 1)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.weapon.name}" as weapon`)
                .setDescription(`Equipped "${player.weapon.name}" as weapon`)
                .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
                .addField('Equipped heal', !player.heal ? 'No healing item or spell' : `[${player.heal.rarity} ${player.heal.type}] ${player.heal.name}`, true)

            await DuckHuntService.appendItemImage(embed, player.weapon)

            const text = `Player ${username} equips item ${player.weapon.name} (${item.rarity} ${item.type}) as weapon`
            return {
                success: true,
                message: embed,
                deleteUserMsg: username !== process.env.BOTNAME,
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !equipWeapon\n` : '') + `[ ${text} ]`, null, channel],
                ttsMessage: text
            }
        } else {
            const weapon = player.weapon
            player.weapon = player.inventory[itemSlotNumber]
            player.inventory.splice(itemSlotNumber, 1)
            player.inventory.push(weapon)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.weapon.name}" as weapon`)
                .setDescription(`${username} puts "${weapon.name}" into its backpack slot number [${player.inventory.length - 1}]`)
                .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
                .addField('Equipped heal', !player.heal ? 'No healing item or spell' : `[${player.heal.rarity} ${player.heal.type}] ${player.heal.name}`, true)

            await DuckHuntService.appendItemImage(embed, player.weapon)

            const text = `Player ${username} equips item ${player.weapon.name} (${item.rarity} ${item.type}) as weapon and puts previous weapon ${weapon.name} into its backpack`
            return {
                success: true,
                message: embed,
                deleteUserMsg: username !== process.env.BOTNAME,
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !equipWeapon\n` : '') + `[ ${text} ]`, null, channel],
                ttsMessage: text
            }
        }
    }

    static async equipHeal(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        if (!isAlive(player)) {
            return {
                message: `# ${username} tried to equip an item, but player ${username} is currently dead and thus cannot make any action.`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to equip an item, but player ${username} is currently dead and thus cannot make any action. ]`, null, channel],
            }
        }

        let itemSlotNumber
        if (!itemSlot || !itemSlot.trim() || username === process.env.BOTNAME) {
            itemSlotNumber = player.inventory.length - 1
        } else {
            itemSlotNumber = parseInt(itemSlot)
        }

        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (!item) return {
            message: `# ${username} tried to equip an item but has no item in inventory slot [${itemSlotNumber}]`,
            instantReply: true,
            deleteUserMsg: username !== process.env.BOTNAME,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Player ${username} tried to equip a heal but has no item in its backpack! ]`, null, channel]

        }

        if (!player.heal) {
            player.heal = player.inventory[itemSlotNumber]
            player.inventory.splice(player.inventory.indexOf(player.inventory[itemSlotNumber]), 1)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.heal.name}" as heal`)
                .setDescription(`Equipped "${player.heal.name}" as heal`)
                .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
                .addField('Equipped heal', !player.heal ? 'No healing item or spell' : `[${player.heal.rarity} ${player.heal.type}] ${player.heal.name}`, true)

            await DuckHuntService.appendItemImage(embed, player.heal)

            const text = `Player ${username} equips item ${player.heal.name} (${item.rarity} ${item.type}) as heal`
            return {
                success: true,
                message: embed,
                deleteUserMsg: username !== process.env.BOTNAME,
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !equipHeal\n` : '') + `[ ${text} ]`, null, channel],
                ttsMessage: text
            }
        } else {
            const heal = player.heal
            player.heal = player.inventory[itemSlotNumber]
            player.inventory.splice(itemSlotNumber, 1)
            player.inventory.push(heal)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.heal.name}" as heal`)
                .setDescription(`${username} puts "${heal.name}" into its backpack slot number [${player.inventory.length - 1}]`)
                .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
                .addField('Equipped heal', !player.heal ? 'No healing item or spell' : `[${player.heal.rarity} ${player.heal.type}] ${player.heal.name}`, true)

            await DuckHuntService.appendItemImage(embed, player.heal)

            const text = `Player ${username} equips item ${player.heal.name} (${item.rarity} ${item.type}) as heal and puts previous heal ${heal.name} into its backpack`
            return {
                success: true,
                message: embed,
                deleteUserMsg: username !== process.env.BOTNAME,
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !equipHeal\n` : '') + `[ ${text} ]`, null, channel],
                ttsMessage: text
            }
        }
    }

    static async equipArmor(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        if (!isAlive(player)) {
            return {
                message: `# ${username} tried to equip an item, but player ${username} is currently dead and thus cannot make any action.`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to equip an item, but player ${username} is currently dead and thus cannot make any action. ]`, null, channel],
            }
        }

        let itemSlotNumber
        if (!itemSlot || !itemSlot.trim() || username === process.env.BOTNAME) {
            itemSlotNumber = player.inventory.length - 1
        } else {
            itemSlotNumber = parseInt(itemSlot)
        }
        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (!item) return {
            message: `# ${username} tried to equip an item but has no item in inventory slot [${itemSlotNumber}]`,
            instantReply: true,
            deleteUserMsg: username !== process.env.BOTNAME,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Player ${username} tried to equip an armor but has no item in its backpack! ]`, null, channel]
        }

        if (!player.armor) {
            player.armor = player.inventory[itemSlotNumber]
            player.inventory.splice(player.inventory.indexOf(player.inventory[itemSlotNumber]), 1)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.armor.name}" as armor`)
                .setDescription(`Equipped "${player.armor.name}" as armor`)
                .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
                .addField('Equipped heal', !player.heal ? 'No healing item or spell' : `[${player.heal.rarity} ${player.heal.type}] ${player.heal.name}`, true)

            await DuckHuntService.appendItemImage(embed, player.armor)

            const text = `Player ${username} equips item ${player.armor.name} (${item.rarity} ${item.type}) as armor`
            return {
                success: true,
                message: embed,
                deleteUserMsg: username !== process.env.BOTNAME,
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !equipArmor\n` : '') + `[ ${text} ]`, null, channel],
                ttsMessage: text
            }
        } else {
            const armor = player.armor
            player.armor = player.inventory[itemSlotNumber]
            player.inventory.splice(itemSlotNumber, 1)
            player.inventory.push(armor)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.armor.name}" as armor`)
                .setDescription(`${username} puts "${armor.name}" into its backpack slot number [${player.inventory.length - 1}]`)
                .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
                .addField('Equipped heal', !player.heal ? 'No healing item or spell' : `[${player.heal.rarity} ${player.heal.type}] ${player.heal.name}`, true)

            await DuckHuntService.appendItemImage(embed, player.armor)

            const text = `Player ${username} equips item ${player.armor.name} (${item.rarity} ${item.type}) as armor and puts previous armor ${armor.name} into its backpack`
            return {
                success: true,
                message: embed,
                deleteUserMsg: username !== process.env.BOTNAME,
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !equipArmor\n` : '') + `[ ${text} ]`, null, channel],
                ttsMessage: text
            }
        }
    }

    static async equipAccessory(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)

        if (!isAlive(player)) {
            return {
                message: `# ${username} tried to equip an item, but player ${username} is currently dead and thus cannot make any action.`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to equip an item, but player ${username} is currently dead and thus cannot make any action. ]`, null, channel],
            }
        }

        let itemSlotNumber
        if (!itemSlot || !itemSlot.trim() || username === process.env.BOTNAME) {
            itemSlotNumber = player.inventory.length - 1
        } else {
            itemSlotNumber = parseInt(itemSlot)
        }
        const item = player.inventory[itemSlotNumber] ? player.inventory[itemSlotNumber] : null

        if (!item) return {
            message: `# ${username} tried to equip an item but has no item in inventory slot [${itemSlotNumber}]`,
            instantReply: true,
            deleteUserMsg: username !== process.env.BOTNAME,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Player ${username} tried to equip an accessory but has no item in its backpack! ]`, null, channel]
        }

        if (!player.accessory) {
            player.accessory = player.inventory[itemSlotNumber]
            player.inventory.splice(player.inventory.indexOf(player.inventory[itemSlotNumber]), 1)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.accessory.name}" as accessory`)
                .setDescription(`Equipped "${player.accessory.name}" as accessory`)
                .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
                .addField('Equipped heal', !player.heal ? 'No healing item or spell' : `[${player.heal.rarity} ${player.heal.type}] ${player.heal.name}`, true)

            await DuckHuntService.appendItemImage(embed, player.accessory)

            const text = `Player ${username} equips item ${player.accessory.name} (${item.rarity} ${item.type}) as accessory`
            return {
                success: true,
                message: embed,
                deleteUserMsg: username !== process.env.BOTNAME,
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !equipAccessory\n` : '') + `[ ${text} ]`, null, channel],
                ttsMessage: text
            }
        } else {
            const accessory = player.accessory
            player.accessory = player.inventory[itemSlotNumber]
            player.inventory.splice(itemSlotNumber, 1)
            player.inventory.push(accessory)

            const embed = new MessageEmbed()
                .setColor('#665500')
                .setTitle(`Player ${username} equips item "${player.accessory.name}" as accessory`)
                .setDescription(`${username} puts "${accessory.name}" into its backpack slot number [${player.inventory.length - 1}]`)
                .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)
                .addField('Equipped heal', !player.heal ? 'No healing item or spell' : `[${player.heal.rarity} ${player.heal.type}] ${player.heal.name}`, true)

            await DuckHuntService.appendItemImage(embed, player.accessory)

            const text = `Player ${username} equips item ${player.accessory.name} (${item.rarity} ${item.type}) as accessory and puts previous accessory ${accessory.name} into its backpack`
            return {
                success: true,
                message: embed,
                deleteUserMsg: username !== process.env.BOTNAME,
                instantReply: true,
                pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !equipAccessory\n` : '') + `[ ${text} ]`, null, channel],
                ttsMessage: text
            }
        }
    }

    static async unequipWeapon(channel, username) {
        const player = playerService.getPlayer(channel, username)

        if (!isAlive(player)) {
            return {
                message: `# ${username} tried to unequip an item, but player ${username} is currently dead and thus cannot make any action.`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to unequip an item, but player ${username} is currently dead and thus cannot make any action. ]`, null, channel],
            }
        }

        if (!player.weapon) {
            return {
                error: `# ${username} tried to unequip its weapon but doesn't have any!`,
                instantReply: true,
                deleteUserMsg: username !== process.env.BOTNAME
            }
        } else {
            if (player.inventory.length < player.inventorySize) {
                player.inventory.push(player.weapon)
                player.weapon = null

                const embed = new MessageEmbed()
                    .setColor('#665500')
                    .setTitle(`Player ${username} unequips weapon "${player.inventory[player.inventory.length - 1].name}"`)
                    .setDescription(`${username} puts item "${player.inventory[player.inventory.length - 1].name}" into its backpack slot number [${player.inventory.length - 1}]`)
                    .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                    .addField('Equipped heal', !player.heal ? 'No healing item or spell' : `[${player.heal.rarity} ${player.heal.type}] ${player.heal.name}`, true)
                    .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                    .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)

                const text = `Player ${username} unequips weapon "${player.inventory[player.inventory.length - 1].name}" (${player.inventory[player.inventory.length - 1].rarity} ${player.inventory[player.inventory.length - 1].type})`
                return {
                    success: true,
                    message: embed,
                    deleteUserMsg: username !== process.env.BOTNAME,
                    instantReply: true,
                    pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !unequipWeapon\n` : '') + `[ ${text} ]`, null, channel],
                    ttsMessage: text
                }
            } else {
                return {
                    error: `# ${username} tried to unequip its weapon but doesn't have enough space in inventory!`,
                    instantReply: true,
                    deleteUserMsg: username !== process.env.BOTNAME
                }
            }

        }
    }

    static async unequipHeal(channel, username) {
        const player = playerService.getPlayer(channel, username)

        if (!isAlive(player)) {
            return {
                message: `# ${username} tried to unequip an item, but player ${username} is currently dead and thus cannot make any action.`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to unequip an item, but player ${username} is currently dead and thus cannot make any action. ]`, null, channel],
            }
        }

        if (!player.heal) {
            return {
                error: `# ${username} tried to unequip its heal but doesn't have any!`,
                instantReply: true,
                deleteUserMsg: username !== process.env.BOTNAME
            }
        } else {
            if (player.inventory.length < player.inventorySize) {
                player.inventory.push(player.heal)
                player.heal = null

                const embed = new MessageEmbed()
                    .setColor('#665500')
                    .setTitle(`Player ${username} unequips heal "${player.inventory[player.inventory.length - 1].name}"`)
                    .setDescription(`${username} puts item "${player.inventory[player.inventory.length - 1].name}" into its backpack slot number [${player.inventory.length - 1}]`)
                    .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                    .addField('Equipped heal', !player.heal ? 'No healing item or spell' : `[${player.heal.rarity} ${player.heal.type}] ${player.heal.name}`, true)
                    .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                    .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)

                const text = `Player ${username} unequips heal "${player.inventory[player.inventory.length - 1].name}" (${player.inventory[player.inventory.length - 1].rarity} ${player.inventory[player.inventory.length - 1].type})`
                return {
                    success: true,
                    message: embed,
                    deleteUserMsg: username !== process.env.BOTNAME,
                    instantReply: true,
                    pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !unequipHeal\n` : '') + `[ ${text} ]`, null, channel],
                    ttsMessage: text
                }
            } else {
                return {
                    error: `# ${username} tried to unequip its heal but doesn't have enough space in inventory!`,
                    instantReply: true,
                    deleteUserMsg: username !== process.env.BOTNAME
                }
            }

        }
    }

    static async unequipArmor(channel, username) {
        const player = playerService.getPlayer(channel, username)

        if (!isAlive(player)) {
            return {
                message: `# ${username} tried to unequip an item, but player ${username} is currently dead and thus cannot make any action.`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to unequip an item, but player ${username} is currently dead and thus cannot make any action. ]`, null, channel],
            }
        }

        if (!player.armor) {
            return {
                error: `# ${username} tried to unequip its armor but doesn't have any!`,
                instantReply: true,
                deleteUserMsg: username !== process.env.BOTNAME
            }
        } else {
            if (player.inventory.length < player.inventorySize) {
                player.inventory.push(player.armor)
                player.armor = null
                const embed = new MessageEmbed()
                    .setColor('#665500')
                    .setTitle(`Player ${username} unequips armor "${player.inventory[player.inventory.length - 1].name}"`)
                    .setDescription(`${username} puts item "${player.inventory[player.inventory.length - 1].name}" into its backpack slot number [${player.inventory.length - 1}]`)
                    .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                    .addField('Equipped heal', !player.heal ? 'No healing item or spell' : `[${player.heal.rarity} ${player.heal.type}] ${player.heal.name}`, true)
                    .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                    .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)

                const text = `Player ${username} unequips armor "${player.inventory[player.inventory.length - 1].name}" (${player.inventory[player.inventory.length - 1].rarity} ${player.inventory[player.inventory.length - 1].type})`
                return {
                    success: true,
                    message: embed,
                    deleteUserMsg: username !== process.env.BOTNAME,
                    instantReply: true,
                    pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !unequipArmor\n` : '') + `[ ${text} ]`, null, channel],
                    ttsMessage: text
                }
            } else {
                return {
                    error: `# ${username} tried to unequip its armor but doesn't have enough space in its backpack!`,
                    instantReply: true,
                    deleteUserMsg: username !== process.env.BOTNAME
                }
            }

        }
    }

    static async unequipAccessory(channel, username) {
        const player = playerService.getPlayer(channel, username)

        if (!isAlive(player)) {
            return {
                message: `# ${username} tried to unequip an item, but player ${username} is currently dead and thus cannot make any action.`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to unequip an item, but player ${username} is currently dead and thus cannot make any action. ]`, null, channel],
            }
        }

        if (!player.accessory) {
            return {
                error: `# ${username} tried to unequip its accessory but doesn't have any!`,
                instantReply: true,
                deleteUserMsg: username !== process.env.BOTNAME
            }
        } else {
            if (player.inventory.length < player.inventorySize) {
                player.inventory.push(player.accessory)
                player.accessory = null
                const embed = new MessageEmbed()
                    .setColor('#665500')
                    .setTitle(`Player ${username} unequips accessory "${player.inventory[player.inventory.length - 1].name}"`)
                    .setDescription(`${username} puts item "${player.inventory[player.inventory.length - 1].name}" into its backpack slot number [${player.inventory.length - 1}]`)
                    .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}`, true)
                    .addField('Equipped heal', !player.heal ? 'No healing item or spell' : `[${player.heal.rarity} ${player.heal.type}] ${player.heal.name}`, true)
                    .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}`, true)
                    .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}`, true)

                const text = `Player ${username} unequips accessory "${player.inventory[player.inventory.length - 1].name}" (${player.inventory[player.inventory.length - 1].rarity} ${player.inventory[player.inventory.length - 1].type})`
                return {
                    success: true,
                    message: embed,
                    deleteUserMsg: username !== process.env.BOTNAME,
                    instantReply: true,
                    pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !unequipAccessory\n` : '') + `[ ${text} ]`, null, channel],
                    ttsMessage: text
                }
            } else {
                return {
                    error: `# ${username} tried to unequip its accessory but doesn't have enough space in its backpack!`,
                    instantReply: true,
                    deleteUserMsg: username !== process.env.BOTNAME
                }
            }

        }
    }

    static async appendItemImage(embed, item) {
        if (item?.image) {
            const buff = new Buffer.from(item.image, "base64")
            const imgOriginal = await sharp(Buffer.from(buff, 'binary'))
            const im = await imgOriginal.resize(128, 128, {kernel: sharp.kernel.nearest})
            const messageAttachment = new MessageAttachment(await im.toBuffer(), `output_${Date.now()}.png`)
            embed.attachFiles([messageAttachment])
        }
    }

    static async showInventory(channel, username) {
        const player = playerService.getPlayer(channel, username)
        const embed = new MessageEmbed()
            .setColor('#887733')
            .setTitle(`Inventory of Player ${username}`)
            .setDescription(`Backpack (${player.inventory.length}/${player.inventorySize}):${player.inventory.map((item, n) => `\n${n}: [${item.rarity} ${item.type}] "${item.name}"${item.image ? ' :white_check_mark:' : ''}`).join(', ')}`)
            .addField('Equipped weapon', !player.weapon ? 'No Weapon' : `[${player.weapon.rarity} ${player.weapon.type}] ${player.weapon.name}${player.weapon.image ? ' :white_check_mark:' : ''}`, true)
            .addField('Equipped armor', !player.armor ? 'No Armor' : `[${player.armor.rarity} ${player.armor.type}] ${player.armor.name}${player.armor.image ? ' :white_check_mark:' : ''}`, true)
            .addField('Equipped accessory', !player.accessory ? 'No accessory' : `[${player.accessory.rarity} ${player.accessory.type}] ${player.accessory.name}${player.accessory.image ? ' :white_check_mark:' : ''}`, true)
            .addField('Equipped heal', !player.heal ? 'No healing item or spell' : `[${player.heal.rarity} ${player.heal.type}] ${player.heal.name}${player.heal.image ? ' :white_check_mark:' : ''}`, true)
            .addField('Health', player.health.status, true)
            .addField('Blood Loss', player.health.bloodLoss, true)
            .addField('Wounds', player.health.wounds.join(', ') || 'none', true)
            .addField(utils.upperCaseFirstLetter(generatorEnemy.placeholders["currency"] || 'gold'), player.gold, false)
            .addField('Backpack size', player.inventorySize, true)
            .addField('Next backpack upgrade cost', Math.floor(Math.pow(player.inventorySize * 2, 3) + Math.pow(player.inventorySize * 9.59, 2)), true)

        const playerLastInventoryItem = player.inventory[player.inventory.length - 1]
        const backpackSelectedItem = `${playerLastInventoryItem?.name || 'none'}`
            + (!playerLastInventoryItem ? `` : ` (${playerLastInventoryItem.rarity} ${playerLastInventoryItem.type})`)

        await DuckHuntService.appendItemImage(embed, player.weapon)
        await DuckHuntService.appendItemImage(embed, player.armor)
        await DuckHuntService.appendItemImage(embed, player.accessory)
        await DuckHuntService.appendItemImage(embed, player.heal)

        return {
            message: embed,
            deleteUserMsg: username !== process.env.BOTNAME,
            instantReply: true,
            pushIntoHistory: [
                (username !== process.env.BOTNAME ? `${username}: !inventory\n` : '')
                + `[ Inventory of Player ${username}; `
                + `backpack used space: (${player.inventory.length}/${player.inventorySize}); `
                + `backpack selected item: ${backpackSelectedItem}; `
                + `weapon: ${!player.weapon ? 'No Weapon' : `${player.weapon.name} (${player.weapon.rarity} ${player.weapon.type})`}; `
                + `heal: ${!player.heal ? 'No healing item or spell' : `${player.heal.name} (${player.heal.rarity} ${player.heal.type})`}; `
                + `armor: ${!player.armor ? 'No Armor' : `${player.armor.name} (${player.armor.rarity} ${player.armor.type})`}; `
                + `accessory: ${!player.accessory ? 'No Accessory' : `${player.accessory.name} (${player.accessory.rarity} ${player.accessory.type})`}; `
                + `status: ${player.health.status}; blood loss: ${player.health.bloodLoss}; wounds: ${player.health.wounds.join(', ') || 'none'} `
                + `]`,
                null,
                channel
            ]
        }
    }

    static async upgradeBackpack(channel, username) {
        const player = playerService.getPlayer(channel, username)

        if (!isAlive(player)) {
            return {
                message: `# ${username} tried to upgrade its backpack, but player ${username} is currently dead and thus cannot make any action.`,
                deleteUserMsg: username !== process.env.BOTNAME,
                deleteNewMessage: username !== process.env.BOTNAME,
                pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ ${username} tried to upgrade its backpack, but player ${username} is currently dead and thus cannot make any action. ]`, null, channel],
            }
        }

        const price = Math.floor(Math.pow(player.inventorySize * 2, 3) + Math.pow(player.inventorySize * 9.59, 2))

        if (player.gold < price) return {
            message: `# ${username} tried to upgrade its backpack but doesn't have enough ${generatorEnemy.placeholders["currency"] || 'gold'}! (${player.gold}/${price})`,
            instantReply: true,
            deleteUserMsg: username !== process.env.BOTNAME,
            deleteNewMessage: username !== process.env.BOTNAME,
            pushIntoHistory: username !== process.env.BOTNAME ? null : [`[ Player ${username} tried to upgrade its backpack but doesn't have enough ${generatorEnemy.placeholders["currency"] || 'gold'}! (${player.gold}/${price}) ]`, null, channel]
        }

        player.inventorySize += 1
        player.gold -= price

        const newPrice = Math.floor(Math.pow(player.inventorySize * 2, 3) + Math.pow(player.inventorySize * 9.59, 2))

        const text = `Player ${username} upgraded its backpack for ${price} ${generatorEnemy.placeholders["currency"] || 'gold'}!`
        const embed = new MessageEmbed()
            .setColor('#33ff33')
            .setTitle(text)
            .setDescription(`New backpack size: ${player.inventorySize}\nCost of next upgrade: ${newPrice} ${generatorEnemy.placeholders["currency"] || 'gold'}\nCurrent ${generatorEnemy.placeholders["currency"] || 'gold'} balance after upgrade: ${player.gold}`)
        return {
            message: embed,
            deleteUserMsg: username !== process.env.BOTNAME,
            instantReply: true,
            pushIntoHistory: [(username !== process.env.BOTNAME ? `${username}: !upgradeBackpack\n` : '') + `[ Player ${username} upgraded its backpack for ${price} ${generatorEnemy.placeholders["currency"] || 'gold'}! ]`, null, channel],
            ttsMessage: text
        }
    }

    static async setGender(channel, username, gender) {
        const player = playerService.getPlayer(channel, username)

        if (["male", "female"].includes(gender.toLowerCase())) {
            player.gender = gender.toLowerCase()
        } else {
            return {
                message: `# ${username} tried to change its gender to ${gender.toLowerCase()}, but gender must be either "male" or "female"`,
                deleteUserMsg: username !== process.env.BOTNAME,
                instantReply: true
            }
        }

        const text = `Player ${username} sets its gender to ${gender}!`
        const embed = new MessageEmbed()
            .setColor('#ffffff')
            .setTitle(text)
            .setDescription(`Player gender set to ${gender}`)

        return {
            message: embed,
            deleteUserMsg: username !== process.env.BOTNAME,
            instantReply: true,
            ttsMessage: text
        }
    }

    static async inspectItem(channel, username, itemSlot) {
        const player = playerService.getPlayer(channel, username)


        let playerSelectedItem
        if (itemSlot && !isNaN(parseInt(itemSlot))) {
            playerSelectedItem = player.inventory[parseInt(itemSlot)]
            if (playerSelectedItem) {
                if (!playerSelectedItem.image) {
                    if (!itemsToInspect[channel]) itemsToInspect[channel] = []

                    if (!itemsToInspect[channel].includes(playerSelectedItem)) {
                        itemsToInspect[channel].push(playerSelectedItem)
                    } else {
                        return {
                            message: `# ${username} tried to add an item in the item inspection queue, but this item is already in the list`,
                            deleteUserMsg: username !== process.env.BOTNAME,
                            instantReply: true
                        }
                    }
                } else {
                    const embed = new MessageEmbed()
                        .setColor('#ffff66')
                        .setTitle(`Inspected Item`)
                        .setDescription(`${playerSelectedItem.name} (${playerSelectedItem.rarity} ${playerSelectedItem.type})`)

                    const buff2 = new Buffer.from(playerSelectedItem.image, "base64")
                    const imgOriginal = await sharp(Buffer.from(buff2, 'binary'))
                    const im = await imgOriginal.resize(160, 160, {kernel: sharp.kernel.nearest})
                    const messageAttachment = new MessageAttachment(await im.toBuffer(), "output.png")
                    embed.attachFiles([messageAttachment])

                    return {
                        message: embed,
                        deleteUserMsg: username !== process.env.BOTNAME,
                        instantReply: true
                    }
                }
            } else {
                return {
                    message: `# ${username} tried to add an item in the item inspection queue, but has no item in slot [${itemSlot}]`,
                    deleteUserMsg: username !== process.env.BOTNAME,
                    instantReply: true
                }
            }
        } else {
            return {
                message: `# ${username} tried to add an item in the item inspection queue, but no slot was provided`,
                deleteUserMsg: username !== process.env.BOTNAME,
                instantReply: true
            }
        }

        const embed = new MessageEmbed()
            .setColor('#ffffff')
            .setTitle(`Player ${username} added the item "${playerSelectedItem.name}" in the inspection list! A message will be sent when the item image is done generating!`)
            .setDescription(`It might take up to a mine per item in the queue`)
        return {
            message: embed,
            deleteUserMsg: username !== process.env.BOTNAME,
            instantReply: true
        }
    }

    static async reInspectItem(channel, username, itemSlot) {
        const price = 10000
        const player = playerService.getPlayer(channel, username)

        let playerSelectedItem
        if (itemSlot && !isNaN(parseInt(itemSlot))) {
            playerSelectedItem = player.inventory[parseInt(itemSlot)]
            if (playerSelectedItem) {
                const player = playerService.getPlayer(channel, username)

                if (player.gold < price) {
                    return {
                        message: `# ${username} tried to re-inspect an item, but doesn't have enough gold! (10000 gold needed)`,
                        deleteUserMsg: username !== process.env.BOTNAME,
                        instantReply: true
                    }
                }

                if (!itemsToInspect[channel]) itemsToInspect[channel] = []
                if (!itemsToInspect[channel].includes(playerSelectedItem)) {
                    itemsToInspect[channel].push(playerSelectedItem)
                    player.gold -= price
                } else {
                    return {
                        message: `# ${username} tried to add an item in the item inspection queue, but this item is already in the list`,
                        deleteUserMsg: username !== process.env.BOTNAME,
                        instantReply: true
                    }
                }
            } else {
                return {
                    message: `# ${username} tried to add an item in the item inspection queue, but has no item in slot [${itemSlot}]`,
                    deleteUserMsg: username !== process.env.BOTNAME,
                    instantReply: true
                }
            }
        } else {
            return {
                message: `# ${username} tried to add an item in the item inspection queue, but no slot was provided`,
                deleteUserMsg: username !== process.env.BOTNAME,
                instantReply: true
            }
        }

        const embed = new MessageEmbed()
            .setColor('#ffffff')
            .setTitle(`Player ${username} added the item "${playerSelectedItem.name}" in the inspection list for ${price} ${generatorEnemy.placeholders["currency"]}! A message will be sent when the item image is done generating!`)
            .setDescription(`It might take up to a mine per item in the queue`)
        return {
            message: embed,
            deleteUserMsg: username !== process.env.BOTNAME,
            instantReply: true
        }
    }

    static getItemsToInspect(channel) {
        return itemsToInspect[channel]
    }

    static async generateSpell(channel, args) {
        const {
            object,
            result,
            module
        } = await generatorService.generator(generatorSpellBook, args, channel.startsWith("##"))

        return {
            message: JSON.stringify(object, null, 4),
            instantReply: true
        }
    }

    static async generator(channel, args, attachmentUrl) {
        if (!attachmentUrl && !lastUploadedGenerator) return {
            error: "# You need to upload a JSON generator file as attachment to your command"
        }

        let generator
        if (!lastUploadedGenerator || attachmentUrl) {
            generator = await utils.getAttachment(attachmentUrl)
            lastUploadedGenerator = generator
        } else {
            generator = lastUploadedGenerator
        }
        let argsJSON
        try {
            argsJSON = !args ? null : JSON.parse(args.trim())
        } catch (e) {
            return {
                error: "# Invalid JSON",
                instantReply: true
            }
        }

        let json = []
        let nbResults = 1
        let submoduleName = null
        if (argsJSON) {
            for (let name in argsJSON) {
                if (name === 'nbResults') {
                    if (typeof argsJSON[name] === "string") {
                        argsJSON[name] = parseInt(argsJSON[name])
                    }
                    nbResults = Math.min(5, argsJSON[name])
                } else if (name === "aiParameters") {
                    generator.aiParameters = argsJSON[name]
                } else if (name === "aiModel") {
                    generator.aiModel = argsJSON[name]
                } else if (name === "submodule") {
                    submoduleName = argsJSON[name]
                } else {
                    json.push({name, value: argsJSON[name]})
                }
            }
        }

        let properties
        if (submoduleName && generator.submodules?.[submoduleName]?.properties) {
            properties = generator.submodules?.[submoduleName]?.properties?.map(p => {
                return {name: p.name}
            })
            for (let element of json) {
                if (element.value) {
                    const property = properties.find(p => p.name === element.name)
                    if (property) {
                        property.value = element.value
                    }
                }
            }
        } else {
            properties = json.length > 0 ? json : generator["properties"]
        }

        let results = []
        for (let i = 0; i < nbResults; i++) {
            const {
                object,
                result,
                module
            } = await generatorService.generator(generator, properties, channel.startsWith("##"), submoduleName)
            results.push(object)
        }

        const resultsJSONString = JSON.stringify(results, null, 1)

        const attachment = resultsJSONString.length < 2000 ? resultsJSONString : new MessageAttachment(Buffer.from(resultsJSONString), 'results.json')

        return {
            message: attachment,
            instantReply: true
        }
    }

    static async generatorPrompt(channel, args, attachmentUrl) {
        if (!attachmentUrl && !lastUploadedGenerator) return {
            error: "# You need to upload a JSON generator file as attachment to your command"
        }

        let generator
        if (!lastUploadedGenerator) {
            generator = await utils.getAttachment(attachmentUrl)
            lastUploadedGenerator = generator
        } else {
            generator = lastUploadedGenerator
        }

        let argsJSON
        try {
            argsJSON = !args ? null : JSON.parse(args.trim())
        } catch (e) {
            return {
                error: "# Invalid JSON",
                instantReply: true
            }
        }

        let json = []
        if (argsJSON) {
            for (let name in argsJSON) {
                if (name !== 'nbResults') {
                    json.push({name, value: argsJSON[name]})
                }
            }
        }

        let properties = json.length > 0 ? json : generator["properties"]
        const prompt = generatorService.getPrompt(
            generator,
            properties,
            true
        )

        if (generator.placeholders) {
            for (let placeholders of generator.placeholders) {
                prompt.completePrompt = prompt.completePrompt.replace("${" + placeholders[0] + "}", placeholders[1])
            }
        }

        const attachment = utils.getMessageAsFile(prompt.completePrompt, 'generator.json')
        return {
            message: attachment,
            instantReply: true
        }
    }
}


export default DuckHuntService