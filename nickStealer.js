const irc = require('irc');

const channel = "#nolibot"
const botName = "Alice"
const password = "nolibot34"

const client = new irc.Client('chat.freenode.net', botName, {
    channels: [channel],
    username: "nolibot",
    realName: "Nolibot",
    password
});

setInterval(() => {
    client.send("NICK", "Alice");
}, 30000)
