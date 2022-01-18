import path from 'path';
import {fileURLToPath} from 'url'
import axios from "axios";
import GeneratorRequest from "./dto/GeneratorRequest.js";
import utils from "../utils.js";

const POST_CONFIG = {
    headers: {
        'Content-Type': 'application/json'
    }
}

const generatorRequest = new GeneratorRequest(
    utils.loadJSONFile(`./data/generator/rpg/errorGenerator.json`),
    2,
    null,
    {
        username: "Mary",
        action: "buy item",
        error: "not enough gold",
        message: null
    },
    {temperature: 3},
    null
)

function generate(generatorRequest, nbGenerationLeft = 1) {
    if (nbGenerationLeft === 0) process.exit(1)

    axios
        .post('http://localhost:5000/api/v1/generator', generatorRequest, POST_CONFIG)
        .then((e) => {
            console.log(e.data?.results?.map(r=>r.object?.message)?.join('\n'))
            generate(generatorRequest, --nbGenerationLeft)
        })
}

// IF MAIN
const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url))
const isRunningDirectlyViaCLI = nodePath === modulePath
if (isRunningDirectlyViaCLI) {
    axios
        .post('http://localhost:5000/api/v1/test', {}, POST_CONFIG)
        .then((e) => {
            console.log(e.status, e.data)
            if (e.status === 200) {
                generate(generatorRequest, 10)
            } else {
                console.log(e)
                process.exit(1)
            }
        })
}