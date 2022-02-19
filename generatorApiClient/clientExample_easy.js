// Dependencies
import clientService from "../src/rest/generatorApiClientService.js"
import utils from "../src/utils.js";
import GeneratorRequest from "../src/rest/GeneratorRequest.js";

// Loads the generator as JSON object from .json file
const enemyGenerator = utils.loadJSONFile("./data/generator/rpg/errorGenerator.json")
const conf = utils.loadJSONFile("./generatorApiClient/clientConfig.json")

// Defines the main function, that's where your code should be
async function main() {

    // Checks if the server is online, don't mind the "await" keyword if you don't know what it is yet
    // You'll only need the await keyword when using clientService.isServerIsOnline() and clientService.generate() for now
    if (await clientService.isServerIsOnline(conf.GENERATOR_API_URL)) {

        // Builds the request with all settings
        const generatorRequest = new GeneratorRequest(enemyGenerator)

        // Sends the request to the generator API and returns the results
        const answer = await clientService.generate(generatorRequest, conf.GENERATOR_API_URL)

        // Checks if request succeeded
        if (answer?.status === "SUCCESS") {
            // Prints your generated object
            console.log(answer.results[0].object)
        }
    }
}

// Calls main function
main()