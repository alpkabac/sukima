# AliceBot
IRC chatbot that uses an AI API to generate messages

# Prerequisites
The AI API is not part of this project, but it's basically a gpt-neo API endpoint that takes this as JSON parameters:
```
{
    prompt,        // Prompt to process
    generate_num,  // Number of tokens to generate
    temp           // Temperature
}
```

# Install
1. `npm i` to install node modules  
2. Edit `.env.example`, rename it `.env`  
3. Edit `conf.json`

# Translations and bot personality
Check out the files inside the `translations` folder
Possible values for `translationFile`: `default`, `en-EN` or `fr-FR`  
`default` is english  
Feel free to add your own languages and bot personalities  
Loaded folder for bot personality is the same as the `botName` in `conf.json`
```
const translations = require(`./translations/${options.translationFile}.json`)
const botMemory = require(`./translations/aiPersonality/${options.botName}/${options.translationFile}.json`)
```

# Launch
`node ./index.js`
