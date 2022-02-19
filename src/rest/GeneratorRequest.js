class GeneratorRequest {
    generator;
    submoduleName;
    aiParameters;
    arguments;
    nbResults;
    apiKey;

    constructor(generator, nbResults = 1, submoduleName = null, args = null, aiParameters = null, aiModel = null, apiKey = null) {
        this.generator = generator
        this.submoduleName = submoduleName
        this.arguments = args
        this.aiParameters = aiParameters
        this.aiModel = aiModel
        this.nbResults = Math.max(1, Math.min(10, nbResults))
        this.apiKey = apiKey
    }
}

export default GeneratorRequest