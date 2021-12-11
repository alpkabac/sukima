# AliceBot

IRC/Discord chatbot that uses an AI API to generate messages  
The bot will talk automatically when spoken to, but also has plenty of commands to get the best out of the conversation  
You can also create and customize every part of your AI personality and its functionalities and commands

# IRC/Discord commands and usage

## Message Commands
### No Context Message
Command: `!!Blah blah blah` or `!! Blah blah blah` (it's the same)  
Will send the message without any memory besides the `noContextSentence` included in personality translation file  
You can use the `!!` prefix to ask questions without using the context or the conversation history (and it gives the **best** results)

### Instant Answer Message
Command: `?Blah blah blah` or `? Blah blah blah` (again, it's the same)  
Will make the bot answer immediately after your message

### Force Bot Message
Command: `?` or `!talk`  
Will force the bot to send a new message

### Finish Last Bot Message
Command: `,` or `!continue`  
Special command **only to be used when the bot sends an incomplete message**  
The bot will generate the end of its last message and edit its content to update it

### Retry Last Bot Message
Command: `²` or `○` or `!retry`  
Will make the bot regenerate its last message and edit it to update its content

### Comment Message
Command: `# Blah blah`  
Comment text, the bot doesn't see nor react to it

### Mute and Unmute
Commands: `!mute` and `!unmute`    
Prevents the bot from receiving and sending messages in the current channel


## Memory Commands

### Reset
Command: `!reset`  
Will make the bot forget the current conversation, only keeping its presentation messages and memories acquired
  through the `!remember` command

### Remember
Command: `!remember [ Your text ]`  
Will insert a message containing `[ Your text]` from you at the top of the bot's memory  
Be careful, you if you reuse the `!remember` command it will replace the previous things you remembered  
Also, know that the square brackets `[]` are important (but not mandatory) for the AI to know that the text is contextual text and not part of the conversation 

### Also Remember
Command: `!alsoRemember [ Your text ]`  
Will append `[ Your text ]` to the currently remembered things

### Forget
Command: `!forget`  
Will delete your remembered things on this channel

### Forger All
Command: `!forgetAll`  
Will delete everyone's things on this channel

### Show Remember
Command: `!showRemember`  
Shows your remembered things on this channel

### Show All Remember
Command: `!showAllRemember`  
Shows everyone's remembered things on this channel

## Personality Commands

### Show Current Bot Personality
Command: `!showPersonality` or `!displayPersonality`  
Will display most of the AIs parameters

### Set Bot Personality
Command: `!setPersonality <context>\n<presentation message>`  
Sets the AI personality for the current channel (or DM channel)  
Use like this:
```
!setPersonality [ character: Alice; gender: female; hair: golden; personality: joyful, helpful, talkative; writing style: purple prose ]
Hello everyone! My name is Alice, and I'm an AI *She smiles cutely as she bows down before everyone*
```

### Change Personality File
Command: `!lang <language>`  
Will try to load the `translations/aiPersonality/${process.env.BOTNAME}/<language>.json`
  file, useful to have multiple alternative personalities, but requires the files to exist

### Change TTS Voice
Command: `!setVoice <voice>`  
Use like this: `!setVoice en-US-Wavenet-F`  
See [HERE](https://cloud.google.com/text-to-speech/docs/voices) for supported languages


# Experimental Commands
### Wiki
Command: `!wiki French Revolution`  
Will perform a wikipedia search and return a link of the first result  
When using this command, a hidden context is injected into the bot conversation memory that says something like `[ The bot sends you a wikipedia link about French Revolution ]`

### [NSFW] Danbooru
Command `!danbooru 2girls hand_holding`  
If you're a naughty person  
Will also insert contextual data indicated the bot it successfully returned lewd stuff (it'll see the tags)

### [NSFW] Eporner
Command: `!eporner mathematics`  
Along the same lines but for videos  
Will also insert contextual data indicated the bot it successfully returned lewd stuff (it'll see the tags and the name of the video)

### Prompt
Command: `!prompt <number of tokens to generate>\n<your prompt>`  
Will execute your prompt and return X tokens depending on your argument
  - This command can be used freely without the bot remembering either the command nor the output
  - It can be used as a tool to test evalbots, or just to use the AI model with your own prompt
  - First line should only contain the command and number tokens to generate (150 max)
Use like this:  
```
!prompt 150
This document is
```
The AI will complete your text and return the result

### Pause's Lore Generation Tool
Command: `!lgt (1-3) YOUR INPUT`  
Example 1: `!lgt Noli, male, developer, adventurer` will generate a result for the input `Noli, male, developer, adventurer`  
Example 2: `!lgt 3 Noli, male, developer, adventurer` will generate 3 results for the input `Noli, male, developer, adventurer`  
Will use a scripted version of Pause's Lore Generation Tool to generate a context using the given input  
Useful to create some lore for your personalities, you can then remember them using the `!remember` command  
Planned: ability to create different list of entries and switch between them to generate more specific things your own way 

# Prerequisites for NovelAI API (latest and current)
1. A paid NovelAI account (any tier should do)
2. Grab your NovelAI API key (you can use this simple [google colab](https://colab.research.google.com/drive/1TKRNYKxWTJXjZcFbhK3RnsuZBpPIdW8_))
3. Node version 14.x or more

# [DEPRECATED] Prerequisites for 6B parameters AI model

You have to run [this colab](https://colab.research.google.com/gist/nolialsea/ba93c54a09b95e3306b69fd2480183e7/gpt-j-6b-inference-demo.ipynb#scrollTo=bsIUxnOdBAYu)  
Then paste the generated API URL to the `conf.json` file `apiUrl` property

# [DEPRECATED] Prerequisites for 2.7B parameters AI model

This project uses my [Horni API](https://gitlab.com/nolialsea/horni-api) to generate the AI results  
You have to install and run it in order for simple prompt to work

# Install

1. `npm i` to install node modules
2. Copy `example.general.env`, name it `.env` (this is very important that the file is correctly named `.env`)
   - `.env` file contains the configs shared by all your bots
3. Edit the `.env` file and fill the necessary values
4. Copy `example.personality.env`, name it `YourBotName.env`
5. Edit the `YourBotName.env` and configure your bot
   - Each different bot should have its own copy of the `example.personality.env` file
6. If your bot isn't named Alice (or Lulune or Jarvis or any other current AIs on the official discord)
   - You need to create the AI own definition files in the `aiPersonalities` folder, see existing folders for example
   - Each Personality folder should contain only declinations of the same AI (its name should always be the same as the name of the folder and the BOTNAME)
   - The value `BOTNAME` and `TRANSLATION_FILE` of the `YourBotName.env` file decides which folder is loaded at startup: `./translations/aiPersonality/${BOTNAME}/${TRANSLATION_FILE}.json`

# Launch

### Discord
You can start one or multiple bots by having different `YourBotName.env` files and starting each one with:  
`node -r dotenv/config index_discord.js dotenv_config_path=YourBotName.env`

### IRC
`node ./index_irc.js` for irc version (most likely deprecated and broken)

# Translations and bot personality

Check out the files inside the `translations` folder   
Feel free to add your own languages and bot personalities  
Loaded folder for bot personality is the same as the `BOTNAME` in your `.env` file

```
const botMemory = require(`./translations/aiPersonality/${BOTNAME}/${TRANSLATION_FILE}.json`)
```

# Banned Tokens and Phrase Biases
You can create your own set of banned tokens and phrase biases by creating new JSON files in `./data/bannedTokens` and `./data/phraseBias`  
Then, you can specify the `BANNED_TOKENS_FILE` and `PHRASE_BIASES_FILE` properties in your `YourBotName.env` file