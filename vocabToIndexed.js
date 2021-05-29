const vocab = require('./vocab.json')
const indexed = []

for (const [key, value] of Object.entries(vocab)) {
    indexed[value] = key
}

const fs = require('fs')
fs.writeFile('vocabIndexed.json', JSON.stringify(indexed), 'utf8', ()=>{});