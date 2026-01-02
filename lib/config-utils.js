import os from 'os';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(os.homedir(), '.aicorc');

/**
 * Saves the API key to a global config file in the user's home directory.
 * @param {string} apiKey 
 */
export function saveGlobalConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Loads the global config.
 * @returns {object|null}
 */
export function loadGlobalConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * Gets the API key from environment variables or global config.
 * @returns {string|null}
 */
export function getApiKey() {
    // Priority: Process Env > Local .env (handled by dotenv) > Global Config
    if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;

    const globalConfig = loadGlobalConfig();
    return globalConfig?.GROQ_API_KEY || null;
}
