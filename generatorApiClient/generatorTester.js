import clientService from "../src/rest/generatorApiClientService.js"
import utils from "../src/utils.js";
import GeneratorRequest from "../src/rest/GeneratorRequest.js";

const conf = utils.loadJSONFile("./generatorApiClient/clientConfig.json")

function getRequest(generatorPath, submodule) {
    return new GeneratorRequest(
        utils.loadJSONFile(generatorPath),
        1,
        submodule,
        null,
        {},
        null
    )
}

async function generate(generator, submodule) {
    const answerSpawn = await clientService.generate(getRequest(generator, submodule), conf.GENERATOR_API_URL)

    if (answerSpawn?.status === "SUCCESS") {
        return answerSpawn?.results?.[0]?.object
    }
}

async function main() {
    if (await clientService.isServerIsOnline(conf.GENERATOR_API_URL)) {
        const [, , filepath, module] = process.argv
        setInterval(async () => {
            const object = await generate(filepath, module)
            console.log(JSON.stringify(object, null, 2)+',')
        }, 10000)
    }
}

main().then()