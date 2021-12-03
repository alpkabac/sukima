# AliceBot

IRC/Discord chatbot that uses an AI API to generate messages

# IRC/Discord commands and usage

- `!reset` will make the bot forget the current conversation, only keeping her presentation and memories acquired
  through `!remember`
- `!remember Your text` will insert a message from you in the bot's memory formatted like `yourNick: Your text` (only
  one `!remember` per user)
- `!forget` will delete your remembered message
- `!Blah blah blah` will send the message without any memory besides the `noContextSentence` included in personality
  translation file
  - You can use the `!` prefix to ask questions without using the context (it gives the **best** results)
- `?Blah blah blah` will simply trigger the bot to talk after your message
- `?` will simply trigger the bot to talk
- `,` is a special command **only to be used when the bot sends an incomplete message**
- `²` or `○` will make the bot rewrite entirely its last message
- `# Blah blah` comment text, the bot doesn't see it not react to it
- `!mute` Prevents the bot from receiving and sending messages (PMs still work)
- `!unmute`
- `!lang <language>` will load the `translations/aiPersonality/${process.env.BOTNAME}/<language>.json`
  file, useful to change the bot personality
  - Available personalities for Alice: `en-EN`, `en-NSFW`, `en-GURO` and `fr-FR`
- [NSFW] `!danbooru 2girls hand_holding` if you're a naughty person
- [NSFW] `!eporner mathematics` is along the same lines
- `!prompt <number of tokens to generate>\n<your prompt>` will execute your prompt and return X tokens depending on your argument
  - This command can be used freely without the bot remembering either the command nor the output
  - It can be used as a tool to test evalbots, or just to use the AI model with your own prompt
- `!setPersonality <context>\n<presentation message>` sets the AI personality for the current channel or DM channel
  - use like this:
```
!setPersonality [ character: Alice; gender: female; hair: golden; personality: joyful, helpful, talkative; writing style: purple prose ]
Hello everyone! My name is Alice, and I'm an AI *She smiles cutely as she bows down before everyone*
```
- `!setVoice <voice>` use like this: `!setVoice en-US-Wavenet-F` and see https://cloud.google.com/text-to-speech/docs/voices for supported languages

# Prerequisites for NovelAI API (latest and current)
1. A paid NovelAI account (any tier should do)
2. Grab your NovelAI API key (you can use this simple [google colab](https://colab.research.google.com/drive/1TKRNYKxWTJXjZcFbhK3RnsuZBpPIdW8_))

# [DEPRECATED] Prerequisites for 6B parameters AI model

You have to run [this colab](https://colab.research.google.com/gist/nolialsea/ba93c54a09b95e3306b69fd2480183e7/gpt-j-6b-inference-demo.ipynb#scrollTo=bsIUxnOdBAYu)  
Then paste the generated API URL to the `conf.json` file `apiUrl` property

# [DEPRECATED] Prerequisites for 2.7B parameters AI model

This project uses my [Horni API](https://gitlab.com/nolialsea/horni-api) to generate the AI results  
You have to install and run it in order for simple prompt to work

# Install

1. `npm i` to install node modules
2. Edit `.env.example`, rename it `.env`
3. Edit `.env` to configure your bot(s)
4. Start the bot using ``

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

`node ./index_discord.js` for discord version
`node ./index_irc.js` for irc version 
