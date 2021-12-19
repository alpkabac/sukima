import Command from "../../command/Command.js";

const ACTIVITY_TYPE = ["PLAYING", "STREAMING", "LISTENING", "WATCHING", "COMPETING"]

const activityCommands = {
    setActivity: new Command(
        "Set Discord Activity",
        [],
        ["!setActivity "],
        process.env.ALLOW_SET_ACTIVITY,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {
            if (parsedMsg) {
                const msgWords = parsedMsg.split(' ')
                const activityType = msgWords.shift()

                if (ACTIVITY_TYPE.includes(activityType)) {
                    const activityName = msgWords.join(' ')
                    return {
                        success: true,
                        message: `# Activity set to type "${activityType}" and name "${activityName}"`,
                        deleteUserMsg: true,
                        setActivityType: activityType,
                        setActivityName: activityName
                    }
                } else if (parsedMsg) {
                    return {
                        success: true,
                        message: `# Activity set to "${parsedMsg}"`,
                        deleteUserMsg: true,
                        setActivityName: parsedMsg
                    }
                }
            }

            return true
        },
        true
    )
}

activityCommands.all = [
    activityCommands.setActivity,

]

export default activityCommands