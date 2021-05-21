const http = require('http')
const fs = require('fs')
const {Server} = require("socket.io");
const conf = require('../conf.json')

const server = http.createServer((req, res) => {
    res.writeHead(200, {'content-type': 'text/html'})
    fs.createReadStream('indexAliceLmi.html').pipe(res)
})
const io = new Server(server);

io.on('connection', (socket) => {
    socket.emit('LMI', LmiService.lastPrompt, LmiService.lastMessage, LmiService.lastParsedMessage)
})

server.listen(parseInt(process.env.PORT) || conf.lniPort)

class LmiService {
    static lastPrompt = ""
    static lastMessage = ""
    static lastParsedMessage = ""

    static emitLmi(){
        io.emit('LMI', this.lastPrompt, this.lastMessage, this.lastParsedMessage)
    }

    static updateLmi(lastPrompt, lastMessage, lastParsedMessage){
        this.lastPrompt = lastPrompt
        this.lastMessage = lastMessage
        this.lastParsedMessage = lastParsedMessage
        this.emitLmi()
    }
}

module.exports = LmiService