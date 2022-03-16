import StreamZip from "node-stream-zip"
import envService from "../../util/envService.js";
import * as fs from "fs";
import utils from "../../utils.js";

class RpgService {
    static generators = null
    static workflows = null

    static loadDefaultGenerators(){
        const files = fs.readdirSync(`./data/generator/rpg2`)

        for (const file of files) {
            const json = utils.loadJSONFile(`./data/generator/rpg2/${file}`)
            if (file === "workflows.json") {
                RpgService.workflows = json
            } else {
                RpgService.generators[file.replace(/\.generator/gi, '')] = json
            }
        }
    }

    static loadAllGenerators() {
        if (!envService.getBotId()) return
        RpgService.generators = {}

        RpgService.loadDefaultGenerators()

        let zip
        zip = new StreamZip({
            file: `./bot/${envService.getBotId()}/rpg.zip`,
            storeEntries: true
        })

        zip.on('ready', () => {
            // Take a look at the files
            for (const entry of Object.values(zip.entries())) {
                if (entry.name === "workflows.json") {
                    RpgService.workflows = JSON.parse(zip.entryDataSync(entry.name).toString('utf8'))
                } else {
                    RpgService.generators[entry.name.replace(/\.generator/gi, '')] =
                        JSON.parse(zip.entryDataSync(entry.name).toString('utf8'))
                }
            }

            // Do not forget to close the file once you're done
            zip.close()
        })

        zip.on('error', () => {
            console.error(`Couldn't extract rpg.zip file for ${envService.getBotId()}`);
        })
    }

    static getGenerators() {
        return (RpgService.generators)
    }

    static getWorkflows() {
        return (RpgService.workflows)
    }

}

RpgService.loadAllGenerators()

export default RpgService