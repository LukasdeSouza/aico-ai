import os from 'os';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(os.homedir(), '.aicorc');

/**
 * Saves the global config.
 * @param {object} config 
 */
export function saveGlobalConfig(config) {
    const currentConfig = loadGlobalConfig() || {};
    const newConfig = { ...currentConfig, ...config };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
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
 * Gets the active provider configuration.
 * @returns {object} { provider, apiKey, model, baseUrl }
 */
export function getActiveProvider() {
    const config = loadGlobalConfig();
    const provider = process.env.AICO_PROVIDER || config?.provider || 'groq';

    // Priority: Process Env > Global Config
    const providers = config?.providers || {};
    const providerConfig = providers[provider] || {};

    const apiKeyEnvMap = {
        groq: 'GROQ_API_KEY',
        openai: 'OPENAI_API_KEY',
        gemini: 'GEMINI_API_KEY',
        deepseek: 'DEEPSEEK_API_KEY',
        anthropic: 'ANTHROPIC_API_KEY'
    };

    const apiKey = process.env[apiKeyEnvMap[provider]] || providerConfig.apiKey;

    return {
        provider,
        apiKey,
        model: providerConfig.model,
        baseUrl: providerConfig.baseUrl
    };
}
