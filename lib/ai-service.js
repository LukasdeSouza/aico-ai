import Groq from 'groq-sdk';
import dotenv from 'dotenv';

import { getApiKey } from './config-utils.js';

dotenv.config();

const groq = new Groq({
    apiKey: getApiKey(),
});

/**
 * Sends code diff to Groq for review.
 * @param {string} diff 
 * @returns {Promise<string>} AI review response.
 */
export async function reviewCode(diff) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not set. Run "aico init" to configure it.');
    }

    if (!diff || diff.trim() === '') {
        return 'No changes detected to review.';
    }

    const systemPrompt = `
You are an expert code reviewer. Analyze the following git diff and provide constructive feedback.
Focus on:
1. Security vulnerabilities.
2. Performance bottlenecks.
3. Code readability and clean code principles.
4. Potential bugs.

Format your response as a list of issues. For each issue, provide:
- File: [filename]
- Issue: [description]
- Suggestion: [how to fix it]
- CorrectedCode: [the FULL corrected content of the file, wrapped in triple backticks]

Keep it concise and professional. Do not use emojis.
`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Review this diff:\n\n${diff}` },
            ],
            model: 'llama-3.3-70b-versatile',
        });

        return chatCompletion.choices[0]?.message?.content || 'No feedback provided.';
    } catch (error) {
        console.error('Error during AI review:', error);
        throw error;
    }
}

/**
 * Generates a commit message based on the diff.
 * @param {string} diff 
 * @returns {Promise<string>} Suggested commit message.
 */
export async function generateCommitMessage(diff) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not set. Run "aico init" to configure it.');
    }

    if (!diff || diff.trim() === '') {
        return 'chore: update files';
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
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Generate a commit message for this diff:\n\n${diff}` },
            ],
            model: 'llama-3.3-70b-versatile',
        });

        return chatCompletion.choices[0]?.message?.content?.trim() || 'chore: update files';
    } catch (error) {
        console.error('Error generating commit message:', error);
        throw error;
    }
}
