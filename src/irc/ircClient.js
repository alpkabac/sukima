import {config} from "dotenv";

config()

import irc from "irc";

const allowedChannels = process.env.ALLOWED_CHANNEL_NAMES
    .split(',')
    .map(c => c.trim())

const ircClient = new irc.Client(process.env.IRC_SERVER || "irc.libera.chat", process.env.BOTNAME, {
    channels: allowedChannels,
    username: process.env.BOTNAME,
    realName: process.env.REALNAME,
    password: process.env.PASSWORD,
});

export default ircClient