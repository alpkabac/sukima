import {config} from "dotenv";

config()
import http from "http";
import fs from "fs";
import {Server} from 'socket.io'

const server = http.createServer((req, res) => {
    res.writeHead(200, {'content-type': 'text/html'})
    fs.createReadStream('indexAliceLmi.html').pipe(res)
})
const io = new Server(server);

if (process.env.LMI_PORT) {
    io.on('connection', (socket) => {
        socket.emit('LMI', LmiService.lastPrompt, LmiService.lastMessage, LmiService.lastParsedMessage)
    })

    server.listen(parseInt(process.env.LMI_PORT))
}

class LmiService {
    static lastPrompt = ""
    static lastMessage = ""
    static lastParsedMessage = ""

    static emitLmi() {
        io.emit('LMI', this.lastPrompt, this.lastMessage, this.lastParsedMessage)
    }

    static updateLmi(lastPrompt, lastMessage, lastParsedMessage) {
        this.lastPrompt = lastPrompt
        this.lastMessage = lastMessage
        this.lastParsedMessage = lastParsedMessage
        this.emitLmi()
    }
}

export default LmiService