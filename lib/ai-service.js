import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { getActiveProvider } from './config-utils.js';
import { loadTeamRules, generateEnhancedPrompt } from './rules-engine.js';

dotenv.config();

/**
 * Generic AI Client Wrapper
 */
class AIClient {
    constructor() {
        this.client = null;
        this.provider = null;
        this.apiKey = null;
        this.model = null;
        this.baseUrl = null;
    }

    updateConfig() {
        const { provider, apiKey, model, baseUrl } = getActiveProvider();
        this.provider = provider;
        this.apiKey = apiKey;
        this.model = model || this.getDefaultModel(provider);
        this.baseUrl = baseUrl;

        if (!apiKey && provider !== 'ollama') {
            this.client = null;
            return;
        }

        if (provider === 'groq') {
            try {
                this.client = new Groq({ apiKey });
            } catch (e) {
                this.client = null;
            }
        } else if (provider === 'openai' || provider === 'deepseek' || provider === 'ollama') {
            // OpenAI compatible APIs
            const url = provider === 'ollama' ? (baseUrl || 'http://localhost:11434/v1') :
                provider === 'deepseek' ? 'https://api.deepseek.com' : undefined;

            this.client = {
                chat: {
                    completions: {
                        create: async (params) => {
                            const res = await fetch(`${url || 'https://api.openai.com/v1'}/chat/completions`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${apiKey}`
                                },
                                body: JSON.stringify(params)
                            });
                            if (!res.ok) {
                                const err = await res.json();
                                throw new Error(err.error?.message || 'AI API Error');
                            }
                            return res.json();
                        }
                    }
                }
            };
        }
    }

    getDefaultModel(provider) {
        const models = {
            groq: 'llama-3.3-70b-versatile',
            openai: 'gpt-4o-mini',
            deepseek: 'deepseek-chat',
            ollama: 'llama3'
        };
        return models[provider] || 'gpt-3.5-turbo';
    }

    async createChatCompletion(messages) {
        if (!this.client) this.updateConfig();

        if (!this.client) {
            throw new Error(`AI Client for ${this.provider} could not be initialized. Check your API Key.`);
        }

        return this.client.chat.completions.create({
            messages,
            model: this.model,
        });
    }
}

const ai = new AIClient();

export async function reviewCode(diff) {
    const { apiKey, provider } = getActiveProvider();
    if (!apiKey && provider !== 'ollama') {
        throw new Error(`API Key for ${provider} is not set. Run "aico init" to configure it.`);
    }

    if (!diff || diff.trim() === '') {
        throw new Error('No diff provided for review.');
    }

    // Load team rules and generate enhanced prompt
    const teamRules = loadTeamRules();
    const enhancedPrompt = teamRules ? generateEnhancedPrompt(teamRules) : '';

    const systemPrompt = `
You are a senior code reviewer. Analyze the git diff and identify potential bugs, security issues, or performance bottlenecks.
Be concise. Only report significant issues.

CRITICAL: If the same issue occurs in multiple places or files (e.g., generic variable names, missing error handling), GROUP them into a single issue entry and list all affected files/lines.

For each issue, provide:
1. File: The filename(s) affected.
2. Issue: A concise description.
3. Suggestion: How to fix it.
4. CorrectedCode: The FULL corrected content of the file (only if a fix is suggested and only for the primary file affected).

Format:
[FILE] filename
[ISSUE] description
[SUGGESTION] how to fix
[CORRECTED_CODE]
\`\`\`
full file content
\`\`\`
${enhancedPrompt}
`;

    try {
        const chatCompletion = await ai.createChatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Review this diff:\n\n${diff}` },
        ]);

        return chatCompletion.choices[0]?.message?.content || 'No feedback provided.';
    } catch (error) {
        console.error('Error during AI review:', error);
        throw error;
    }
}

export async function generateCommitMessage(diff) {
    const { apiKey, provider } = getActiveProvider();
    if (!apiKey && provider !== 'ollama') {
        throw new Error(`API Key for ${provider} is not set. Run "aico init" to configure it.`);
    }

    const systemPrompt = `
You are an expert at writing git commit messages following the Conventional Commits specification.
Analyze the diff and provide a single, concise commit message.
Format: <type>(<scope>): <description>
Types: feat, fix, docs, style, refactor, test, chore.
Description: Imperative, present tense, no period at the end.
Do not include any other text, only the commit message itself. Do not use emojis.
`;

    try {
        const chatCompletion = await ai.createChatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate a commit message for this diff:\n\n${diff}` },
        ]);

        return chatCompletion.choices[0]?.message?.content?.trim() || 'chore: update files';
    } catch (error) {
        console.error('Error generating commit message:', error);
        throw error;
    }
}
