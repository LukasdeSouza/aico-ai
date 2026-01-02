#!/usr/bin/env node
import { getStagedDiff } from './lib/git-utils.js';
import { reviewCode } from './lib/ai-service.js';
import { parseAIResponse, displayIssues } from './lib/reviewer.js';
import pc from 'picocolors';
import { Enquirer } from 'enquirer';

const enquirer = new Enquirer();

async function main() {
    console.log(pc.bold(pc.blue('Aico: Analyzing your changes...')));

    try {
        const diff = await getStagedDiff();

        if (!diff || diff.trim() === '') {
            console.log(pc.yellow('No staged changes found to review.'));
            return;
        }

        const aiResponse = await reviewCode(diff);
        const issues = parseAIResponse(aiResponse);

        displayIssues(issues);

        if (issues.length > 0) {
            const answer = await enquirer.prompt({
                type: 'select',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    { name: 'push', message: 'Push anyway', value: 'push' },
                    { name: 'abort', message: 'Abort and fix manually', value: 'abort' },
                ],
            });

            if (answer.action === 'abort') {
                console.log(pc.red('Push aborted. Please fix the issues and try again.'));
                process.exit(1);
            }
        }

        console.log(pc.green('Proceeding with push...'));
    } catch (error) {
        console.error(pc.red('Error during review:'), error.message);
        process.exit(1);
    }
}

main();
