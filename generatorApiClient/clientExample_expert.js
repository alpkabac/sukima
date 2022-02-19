import clientService from "../src/rest/generatorApiClientService.js"
import utils from "../src/utils.js";
import GeneratorRequest from "../src/rest/GeneratorRequest.js";

const enemyGenerator = utils.loadJSONFile("./data/generator/rpg/enemyLight.json")
const conf = utils.loadJSONFile("./generatorApiClient/clientConfig.json")

const requestSpawn = new GeneratorRequest(
    enemyGenerator,
    1,
    "spawn",
    null,
    {},
    null
)


const requestLoot = new GeneratorRequest(
    enemyGenerator,
    1,
    "loot",
    null,
    {},
    null
)

async function spawnEnemy() {
    const answerSpawn = await clientService.generate(requestSpawn, conf.GENERATOR_API_URL)

    if (answerSpawn?.status === "SUCCESS") {
        return answerSpawn?.results?.[0]?.object
    }
}

async function lootEnemy(enemy) {
    requestLoot.arguments = {
        name: enemy.name,
        difficulty: enemy.difficulty,
        item: null,
        type: null,
        rarity: null
    }
    const answerLoot = await clientService.generate(requestLoot)

    if (answerLoot?.status === "SUCCESS") {
        return answerLoot?.results?.[0]?.object
    }
}

async function main() {
    if (await clientService.isServerIsOnline(conf.GENERATOR_API_URL)) {
        const enemy = await spawnEnemy()
        const loot = await lootEnemy(enemy)
        console.log(`Spawned enemy: ${JSON.stringify(enemy, null, 4)}`)
        console.log(`Loot: ${JSON.stringify(loot, null, 4)}`)
    }
}

main().then()