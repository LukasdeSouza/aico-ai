import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Sends code diff to Groq for review.
 * @param {string} diff 
 * @returns {Promise<string>} AI review response.
 */
export async function reviewCode(diff) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY is not set in environment variables.');
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

Keep it concise and professional. Do not use emojis.
`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Review this diff:\n\n${diff}` },
            ],
            model: 'llama3-70b-8192',
        });

        return chatCompletion.choices[0]?.message?.content || 'No feedback provided.';
    } catch (error) {
        console.error('Error during AI review:', error);
        throw error;
    }
}
