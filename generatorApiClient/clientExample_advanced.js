// Dependencies
import clientService from "../src/rest/generatorApiClientService.js"
import utils from "../src/utils.js";
import GeneratorRequest from "../src/rest/GeneratorRequest.js";

// Loads the generator as JSON object from .json file
const enemyGenerator = utils.loadJSONFile("./data/generator/rpg/enemyLight.json")
const conf = utils.loadJSONFile("./generatorApiClient/clientConfig.json")

// Defines the main function, that's where your code should be
async function main() {

    // Checks if the server is online, don't mind the "await" keyword if you don't know what it is yet
    // You'll only need the await keyword when using clientService.isServerIsOnline() and clientService.generate() for now
    if (await clientService.isServerIsOnline(conf.GENERATOR_API_URL)) {

        const nbResults = 1         // How many times you want to execute your generator
        const submoduleName = null  // If you have submodules in your generator and want to use them, else leave at null
        const args = {              // Your arguments, provide them as if you were using the command on discord
            difficulty: "hard",
            name: null,
            encounterDescription: null
        }

        // AI generation parameters, check out this quick tuto if you don't know their names https://imgur.com/a/7CasDuB
        const aiParameters = {
            temperature: 0.7
        }
        const aiModel = "euterpe-v0"

        // Builds the request with all settings
        const generatorRequest = new GeneratorRequest(enemyGenerator, nbResults, submoduleName, args, aiParameters, aiModel)

        // Sends the request to the generator API and returns the results
        const answer = await clientService.generate(generatorRequest, conf.GENERATOR_API_URL)

        // console.log(answer.status)       // value is either "SUCCESS" or "ERROR"
        // console.log(answer.module)       // modules are generators OR submodules AFTER they have been merged, don't overthink it, you won't ever use it
        // console.log(answer.aiParameters) // ai parameters AFTER they have been merged with default ones (you can override default by setting them to null)
        // console.log(answer.results)      // your generated results as a list

        if (answer?.status === "SUCCESS") {
            for (let result of answer.results) {
                // console.log(result.prompt)   // returns the generated prompt for each generation
                // console.log(result.result)   // returns generated result
                console.log(result.object)  // returns generated object, that's what you want to use in your code
            }
        }
    }
}

// Calls main function
main()