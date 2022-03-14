import utils from "../../utils.js"
import envService from "../../util/envService.js"
import StreamZip from "node-stream-zip"

class RpgService {
    static generators = {}

    static loadAllGenerators() {

        RpgService.generators = {}

        const zip = new StreamZip({
            file: 'archive.zip',
            storeEntries: true
        })
        zip.on('ready', () => {
            // Take a look at the files
            console.log('Entries read: ' + zip.entriesCount);
            for (const entry of Object.values(zip.entries())) {
                RpgService.generators[entry.name.replace(/\.generator/gi, '')] =
                    JSON.parse(zip.entryDataSync(entry.name).toString('utf8'))
            }

            // Do not forget to close the file once you're done
            zip.close()
        });

        const generatorAttackNew = utils.fileExists(`./bot/${envService.getBotId()}/generator/attack.json`) ?
            utils.loadJSONFile(`./bot/${envService.getBotId()}/generator/attack.json`)
            : utils.loadJSONFile("./data/generator/rpg/attack.json")
    }
}


export default RpgService