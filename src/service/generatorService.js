import {config} from "dotenv";
import utils from "../utils.js";
import envService from "../util/envService.js";
import {encode} from "gpt-3-encoder";
import lmiService from "./lmiService.js";
import aiService from "./aiService.js";
import rpgService from "./rpg/rpgService.js";

config()

const DEFAULT_PARAMETERS_GENERATOR = utils.loadJSONFile("./data/aiParameters/generator_default.json")

class GeneratorService {
    static mergeSubmodule(generator, submoduleName = null) {
        const module = JSON.parse(JSON.stringify(generator))

        if (!generator.submodules?.[submoduleName]) return module

        const submodule = generator.submodules[submoduleName]

        if (submodule.context) {
            module.context = submodule.context
        }

        if (submodule.properties) {
            module.properties = submodule.properties
        }

        if (submodule.placeholders) {
            module.placeholders = submodule.placeholders
        }

        if (submodule.list) {
            module.list = submodule.list
        }

        return module
    }

    /**
     *
     * @param generator
     * @param args
     * @param preventLMI
     * @param submoduleName
     * @param workflowName
     * @return {Promise<{Object}>}
     */
    static async generator(generator, args, preventLMI, submoduleName = null) {

        const module = this.mergeSubmodule(generator, submoduleName)

        const prompt = this.getPrompt(
            module,
            args,
            true
        )

        if (module.placeholders) {
            for (let placeholderName in module.placeholders) {
                prompt.completePrompt = prompt.completePrompt.replace(new RegExp("\\$\\{" + placeholderName + "}", 'g'), module.placeholders[placeholderName])
            }
        }

        const result = await this.executePrompt(generator, submoduleName, prompt.completePrompt, preventLMI)

        return {
            object: this.parseResult(module, prompt.placeholderPrompt, result),
            prompt: prompt.completePrompt,
            result,
            module,
        }
    }

    static async newWorkflow(workflowName, input) {
        const workflows = rpgService.getWorkflows()
        if (!workflows?.[workflowName]) {
            return console.error(`Workflow ${workflowName} doesn't exist`)
        }

        const persistentObject = {}
        for (let i of input){
            persistentObject[i.name] = i.value
        }

        for (let w of workflows[workflowName]) {
            await GeneratorService.workflowGenerator(w, persistentObject)
        }

        return persistentObject
    }

    static async workflowGenerator(generatorName, persistentObject) {
        const generators = rpgService.getGenerators()

        if (Array.isArray(generatorName)) {
            const calledGeneratorNames = generatorName.map(cgn => generators[cgn])
            const promises = calledGeneratorNames.map(
                cgn => GeneratorService.workflowGenerator(cgn, persistentObject)
            )
            await Promise.all(promises)
        } else {
            const inputPropertyNames = Object.keys(persistentObject)

            const submoduleInputs = generators[generatorName].properties
                .filter(p => p.input)
                .map(p => p.name)

            const submodulesContainsAllInput = submoduleInputs.every(sip => inputPropertyNames.includes(sip))

            if (!submodulesContainsAllInput) {
                // console.error(`Not every input are provided inside the generator ${generatorName}!`)
            }

            let orderedProperties = []
            for (let poPropName of inputPropertyNames) {
                for (let geProp of generators[generatorName].properties) {
                    if (poPropName === geProp.name) {
                        orderedProperties.push({
                            name: poPropName,
                            value: persistentObject[poPropName]
                        })
                    }
                }
            }

            for (let geProp of generators[generatorName].properties) {
                if (!inputPropertyNames.includes(geProp.name)){
                    orderedProperties.push({
                        name: geProp.name,
                        value: null
                    })
                }
            }

            const {
                object,
                prompt,
                result
            } = await GeneratorService.generator(generators[generatorName], orderedProperties, true)

            for (let o in object) {
                persistentObject[o] = object[o]
            }
        }
    }


    /**
     * Generates a prompt given a generic generator
     * @param generator {name: String, description: String, properties: [{name: String, replaceBy: String}], context: String, list: List} Generic generator in parsed JSON
     * @param args {[{name: String, value: String}]} List of arguments, defines the order of the properties too (will stop at first null value)
     * @param shuffle Boolean Whether or not to shuffle the list (useful when there are too many entries to fit in the prompt)
     */
    static getPrompt(generator, args, shuffle = false) {
        const list = shuffle ? utils.shuffleArray(generator.list) : generator.list
        let prompt = generator.context ? generator.context + "\n***\n" : ""

        // Build placeholder prompt
        let placeholderPrompt = this.#buildPlaceholder(generator, args)

        // Build list prompt
        let elemsPrompt = this.#buildList(generator, args, list, placeholderPrompt, prompt)

        return {
            prompt,
            elemsPrompt,
            placeholderPrompt,
            completePrompt: prompt + elemsPrompt + placeholderPrompt
        }
    }

    static buildParams(generator, submoduleName = null) {
        const defaultParams = JSON.parse(JSON.stringify(DEFAULT_PARAMETERS_GENERATOR))

        if (!generator) throw new Error("No generator provided")

        if (!submoduleName && !generator.aiParameters) return defaultParams

        // Applies aiParameters from global generator
        if (generator.aiParameters) {
            for (let aiParameter in generator.aiParameters) {
                defaultParams[aiParameter] = generator.aiParameters[aiParameter]
            }
        }

        // Applies aiParameters from submodule
        if (generator.submodules?.[submoduleName]?.aiParameters) {
            for (let aiParameter in generator.submodules[submoduleName].aiParameters) {
                defaultParams[aiParameter] = generator.submodules[submoduleName].aiParameters[aiParameter]
            }
        }

        return defaultParams
    }

    static buildModel(generator, submodule = null) {
        if (!generator) throw new Error("No generator provided")

        let model = "euterpe-v2"

        if (!submodule && !generator.aiModel) return model

        if (generator.aiModel) model = generator.aiModel

        if (submodule && generator.submodules?.[submodule] && generator.submodules[submodule].aiModel)
            model = generator.submodules[submodule].aiModel

        return model
    }

    static
    async executePrompt(generator, moduleName, prompt, preventLMI = false) {
        const params = this.buildParams(generator, moduleName)
        const model = this.buildModel(generator, moduleName)
        const result = await aiService.executePrompt(prompt, params, model)
        if (!preventLMI) {
            lmiService.updateLmi(prompt, result, result)
        }
        return result
    }

    /**
     *
     * @param generator {name: String, description: String, properties: [{name: String, replaceBy: String}], context: String, list: List} Generic generator in parsed JSON
     * @param placeholderPrompt
     * @param result
     * @return {Object}
     */
    static parseResult(generator, placeholderPrompt, result) {
        const r = placeholderPrompt + result
        const split = r.split('\n')
        const values = {}
        for (let property of generator.properties) {
            const replaceBy = property.replaceBy ? property.replaceBy : property.name
            values[property.name] = split
                .find(l => l.startsWith(replaceBy))
                ?.replace(replaceBy, '')
                ?.replace(/<\|endoftext\|>.*/g, '')
                ?.trim()
        }
        return values
    }

    /**
     *
     * @param generator {name: String, description: String, properties: [{name: String, replaceBy: String}], context: String, list: List} Generic generator in parsed JSON
     * @param args {[{name: String, value: String}]} List of arguments, defines the order of the properties too (will stop at first null value)
     * @return {string}
     */
    static
    #buildPlaceholder(generator, args) {
        let placeholderPrompt = ""
        for (let arg of args) {
            const property = generator.properties.find(p => p["name"] === arg["name"])
            if (!property) continue

            const replaceBy = property.replaceBy ? property.replaceBy : property["name"]
            if (!arg.value) {
                placeholderPrompt += `${replaceBy}`
                break
            } else {
                placeholderPrompt += `${replaceBy} ${arg.value}\n`
            }
        }
        return placeholderPrompt
    }

    /**
     *
     * @param generator {name: String, description: String, placeholders: [], properties: [{name: String, replaceBy: String}], context: String, list: List} Generic generator in parsed JSON
     * @param args {[{name: String, value: String}]} List of arguments, defines the order of the properties too (will stop at first null value)
     * @param list {[Object]}
     * @param placeholderPrompt {String}
     * @param prompt {String}
     * @return {string}
     */
    static
    #buildList(generator, args, list, placeholderPrompt, prompt) {
        const tokenLimit = envService.getTokenLimit() - (process.env.TOKEN_LIMIT === "2048" ? 150 : 100)
        let elemsPrompt = ""
        for (let elem of list) {
            let elemPrompt = ""
            for (let arg of args) {
                const property = generator.properties.find(p => p["name"] === arg["name"])
                if (!property) continue

                let value = elem[property.name]
                const replaceBy = property.replaceBy ? property.replaceBy : property.name
                elemPrompt += `${replaceBy} ${value}\n`
            }
            elemPrompt += `***\n`

            if (encode(prompt + elemsPrompt + elemPrompt + placeholderPrompt).length < tokenLimit) {
                elemsPrompt += elemPrompt
            }
        }
        return elemsPrompt
    }
}

export default GeneratorService