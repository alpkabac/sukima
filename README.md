# AliceBot
IRC chatbot that uses an AI API to generate messages

The AI API is not part of this project, but it's basically a gpt-neo API endpoint that takes this as parameters:
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
