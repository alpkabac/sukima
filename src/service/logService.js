import fs from 'fs'

class LogService {
    static log(msg) {
        fs.writeFileSync('./debug.txt', msg, {flag: 'a'})
    }
}

export default LogService