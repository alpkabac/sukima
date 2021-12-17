import Command from "../../command/Command";

const commands = {
    setActivity: new Command(
        "Set Discord Activity",
        [],
        ["!setActivity "],
        process.env.ALLOW_SET_ACTIVITY,
        async (msg, parsedMsg, from, channel, command, roles, messageId, targetMessageId) => {

        },
        true
    )
}