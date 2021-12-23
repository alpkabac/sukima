import {config} from "dotenv";
config()

class EnvService {
    static getInt(envVariable, defaultValue = null) {
        const parsed = parseInt(process.env[envVariable])
        if (isNaN(parsed)) return defaultValue
        return parsed
    }

    static getString(envVariable){
        return process.env[envVariable]
    }


    static getTokenLimit(){
        return this.getInt("TOKEN_LIMIT", 2048)
    }
}

export default EnvService