import path from 'path';
import {fileURLToPath} from 'url'
import generatorService from "../service/generatorService.js";
import express from "express";


async function generate(generatorRequest) {
    const generator = generatorRequest.generator
    const aiParameters = generatorRequest.aiParameters
    const aiModel = generatorRequest.aiModel
    let argsJSON = generatorRequest.arguments

    let args = []
    const submoduleName = generatorRequest.submoduleName
    if (argsJSON) {
        for (let name in argsJSON) {
            args.push({name, value: argsJSON[name]})
        }
    }

    let properties
    if (submoduleName && generator["submodules"]?.[submoduleName]?.properties) {
        properties = generator["submodules"][submoduleName].properties.map(p => {
            return {name: p.name}
        })
        for (let argument of args) {
            if (argument.value) {
                const property = properties.find(p => p.name === argument.name)
                if (property) {
                    property.value = argument.value
                }
            }
        }
    } else {
        properties = args.length > 0 ? args : generator["properties"]
    }

    const module = (submoduleName && generator["submodules"]?.[submoduleName]) ? generator["submodules"][submoduleName] : generator
    if (aiParameters) {
        module.aiParameters = aiParameters
    }
    if (aiModel) {
        module.aiModel = aiModel
    }

    let results = []
    for (let i = 0; i < generatorRequest.nbResults; i++) {
        /*const {
            object,
            result,
            prompt,
            module
        } = await generatorService.generator(generator, properties, true, submoduleName)*/
        const result = await generatorService.generator(generator, properties, true, submoduleName)
        results.push(result)
    }

    const completeAiParameters = generatorService.buildParams(generator, submoduleName)

    return {
        status: 'SUCCESS',
        results,
        module,
        aiParameters: completeAiParameters
    }
}

// IF MAIN
const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url))
const isRunningDirectlyViaCLI = nodePath === modulePath
if (isRunningDirectlyViaCLI) {
    const app = express()
    app.use(express.json())

    app.post('/api/v1/test', function (req, res, next) {
        res.json('{"status": "SUCCESS"}')
    })

    app.post('/api/v1/generator', async function (req, res, next) {
        try {
            res.json(await generate(req.body))
        } catch (e) {
            res.json({status: 'ERROR', error: e})
        }
    })

    app.listen(5000)
}

export default generate