import utils from "../utils.js";
import envService from "../util/envService.js";
import {encode} from "gpt-3-encoder";

class GeneratorService {
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
            values[property.name] = split.find(l => l.startsWith(replaceBy))?.replace(replaceBy, '')?.trim()
        }
        return values
    }

    /**
     *
     * @param generator {name: String, description: String, properties: [{name: String, replaceBy: String}], context: String, list: List} Generic generator in parsed JSON
     * @param args {[{name: String, value: String}]} List of arguments, defines the order of the properties too (will stop at first null value)
     * @return {string}
     */
    static #buildPlaceholder(generator, args) {
        let placeholderPrompt = ""
        for (let arg of args) {
            const property = generator.properties.find(p => p.name === arg.name)
            if (!property) throw new Error(`No property ${arg.name} in generator ${generator.name}`)

            const replaceBy = property.replaceBy ? property.replaceBy : property.name
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
     * @return {string}
     */
    static #buildList(generator, args, list, placeholderPrompt, prompt) {
        const tokenLimit = envService.getTokenLimit() - 150
        let elemsPrompt = ""
        for (let elem of list) {
            let elemPrompt = ""
            for (let arg of args) {
                const property = generator.properties.find(p => p.name === arg.name)
                if (!property) throw new Error(`No property ${arg.name} in element ${JSON.stringify(elem, null, 4)}`)

                let value = elem[property.name]
                for (let placeholder of generator.placeholders){
                    value = value.replace("${"+placeholder[0]+"}", placeholder[1])
                }
                const replaceBy = property.replaceBy ? property.replaceBy : property.name
                elemPrompt += `${replaceBy} ${value}\n`
            }
            elemPrompt += `⁂\n`

            if (encode(prompt + elemsPrompt + elemPrompt + placeholderPrompt).length < tokenLimit) {
                elemsPrompt += elemPrompt
            }
        }
        return elemsPrompt
    }
}

export default GeneratorService