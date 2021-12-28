import {config} from "dotenv";
import utils from "../utils.js";

config()

class EnvService {
    static getInt(envVariable, defaultValue = null) {
        const parsed = parseInt(process.env[envVariable])
        if (isNaN(parsed)) return defaultValue
        return parsed
    }

    static getString(envVariable) {
        return process.env[envVariable]
    }


    static getTokenLimit() {
        return this.getInt("TOKEN_LIMIT", 2048)
    }

    static isRpgModeEnabled() {
        return utils.getBoolFromString(process.env.ENABLE_RPG_MODE)
    }

    static getRpgAttackCoolDown() {
        return this.getInt("RPG_ATTACK_COOLDOWN", 60)
    }

    static getRpgSpawnCoolDown() {
        const min = this.getInt("RPG_SPAWN_COOLDOWN_MIN", 300)
        const max = this.getInt("RPG_SPAWN_COOLDOWN_MAX", 600)
        return Math.random() * (max - min) + min
    }

    static getRpgRespawnCoolDown() {
        const min = this.getInt("RPG_RESPAWN_COOLDOWN_MIN", 1800)
        const max = this.getInt("RPG_RESPAWN_COOLDOWN_MAX", 3600)
        return Math.random() * (max - min) + min
    }
}

export default EnvService