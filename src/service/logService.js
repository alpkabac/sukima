import fs from 'fs'

class LogService {
    static log(msg) {
        console.log(msg)
        fs.writeFileSync(
            './logs.txt',
            `[${process.env.BOT_ID}] `
            + `[${(new Date()).toLocaleDateString()} ${(new Date()).toLocaleTimeString()}] `
            + `${msg}\n`,
            {flag: 'a'}
        )
    }

    static error(msg, err) {
        console.error(msg)
        if (err) {
            fs.writeFileSync(
                './debug.txt',
                `[${process.env.BOT_ID}] `
                + `[${(new Date()).toLocaleDateString()} ${(new Date()).toLocaleTimeString()}] `
                + `${msg}: ${JSON.stringify(err, null, 4)}\n`,
                {flag: 'a'}
            )
        }
    }
}

export default LogService