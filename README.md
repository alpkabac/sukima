# AliceBot

IRC chatbot that uses an AI API to generate messages

# IRC commands and usage

- `!forget` will make the bot forget the current conversation, only keeping her presentation and memories acquired
  through `!remember`
- `!remember Your text` will insert a message from you in the bot's memory formatted like `yourNick: Your text` (only
  one `!remember` per user)
- `!remember` will delete your remembered message
- `!Blah blah blah` will send the message without any memory besides the `noContextSentence` included in personality
  traduction file
- You can use the `!` prefix to ask questions without using the context (it gives the **best** results)
- `?Blah blah blah` will simply trigger the bot to talk after your message
- `?` will simply trigger the bot to talk
- `!mute` Prevents the bot from receiving and sending messages (PMs still work)
- `!unmute`
- `,` is a special command **only to be used when the bot sends an incomplete message**
- `!lang <language>` will load the `translations/aiPersonality/${conf.botName}/<language>.json`
  file, useful to change the bot personality
  - Available personalities for Alice: `en-EN`, `en-NSFW`, `en-GURO` and `fr-FR`

# Prerequisites

The AI API is not part of this project, but it's basically a gpt-neo API endpoint that takes this as JSON parameters:

```
{
    prompt,        // Prompt to process
    generate_num,  // Number of tokens to generate
    temp           // Temperature
}
```

If you want to host it yourself, you'll have to download and install AI Dungeon Clover Edition **and the gtp-neo
horni-ln model** (it's what works the best right now)  
Then, all you have to do is copy/paste the `ai_rest_server.py` file into AID Clover in the same folder as `play.py` and execute it

It will expose two REST endpoints:  
POST `http://localhost:5000/prompt` to send a prompt and generate an answer  
POST `http://localhost:5000/tokens` to get the tokens from a prompt

# Install

1. `npm i` to install node modules
2. Edit `.env.example`, rename it `.env`
3. Edit `conf.json`

# Translations and bot personality

Check out the files inside the `translations` folder  
Possible values for `translationFile`: `default`, `en-EN`
or `fr-FR`  
`default` is english  
Feel free to add your own languages and bot personalities  
Loaded folder for bot personality is the same as the `botName` in `conf.json`

```
const translations = require(`./translations/${options.translationFile}.json`)
const botMemory = require(`./translations/aiPersonality/${options.botName}/${options.translationFile}.json`)
```

# Launch

`node ./index.js`
