import dotenv from 'dotenv'

dotenv.config()
import {Client} from "discord.js";

const bot = new Client({
    allowedMentions: {
        // set repliedUser value to `false` to turn off the mention by default
        repliedUser: false
    }
});

bot.login(process.env.TOKEN)