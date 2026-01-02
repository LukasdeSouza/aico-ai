#!/usr/bin/env node
import { getStagedDiff, applyFix } from './lib/git-utils.js';
import { reviewCode, generateCommitMessage } from './lib/ai-service.js';
import { parseAIResponse, displayIssues } from './lib/reviewer.js';
import pc from 'picocolors';
import enquirer from 'enquirer';
import fs from 'fs';
const { prompt } = enquirer;

import { saveGlobalConfig } from './lib/config-utils.js';
import { execSync } from 'child_process';

async function init() {
    console.log(pc.bold(pc.blue('Aico: Initializing...')));

    const { apiKey } = await prompt({
        type: 'input',
        name: 'apiKey',
        message: 'Enter your Groq API Key:'
    });

    if (apiKey) {
        saveGlobalConfig({ GROQ_API_KEY: apiKey });
        console.log(pc.green('API Key saved globally in ~/.aicorc'));
    }

    const { setupHusky } = await prompt({
        type: 'confirm',
        name: 'setupHusky',
        message: 'Would you like to setup Aico as a pre-push git hook?',
        initial: true
    });

    if (setupHusky) {
        try {
            console.log(pc.blue('Setting up Husky...'));
            execSync('npx husky init', { stdio: 'inherit' });
            // Add aico to pre-push
            const huskyPath = '.husky/pre-push';
            const hookContent = '#!/bin/sh\nnpx aico review\n';
            fs.writeFileSync(huskyPath, hookContent, { mode: 0o755 });
            console.log(pc.green('Husky pre-push hook configured!'));
        } catch (e) {
            console.error(pc.red('Failed to setup Husky:'), e.message);
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'review';
    const isSilent = args.includes('--silent') || args.includes('-s');

    if (command === 'init') {
        await init();
        return;
    }

    if (command === 'commit') {
        console.log(pc.bold(pc.blue('Aico: Generating commit message...')));
        try {
            const diff = await getStagedDiff();
            if (!diff || diff.trim() === '') {
                console.log(pc.yellow('No staged changes found to commit.'));
                return;
            }

            let message = await generateCommitMessage(diff);

            while (true) {
                console.log(`\n${pc.bold('Suggested message:')} ${pc.green(message)}`);

                const { action } = await prompt({
                    type: 'select',
                    name: 'action',
                    message: 'What would you like to do?',
                    choices: [
                        { name: 'accept', message: 'Accept and commit', value: 'accept' },
                        { name: 'edit', message: 'Edit message', value: 'edit' },
                        { name: 'regenerate', message: 'Regenerate', value: 'regenerate' },
                        { name: 'abort', message: 'Abort', value: 'abort' }
                    ]
                });

                if (action === 'accept') {
                    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
                    console.log(pc.green('Committed successfully!'));
                    return;
                } else if (action === 'edit') {
                    const { newMessage } = await prompt({
                        type: 'input',
                        name: 'newMessage',
                        message: 'Edit commit message:',
                        initial: message
                    });
                    message = newMessage;
                } else if (action === 'regenerate') {
                    console.log(pc.blue('Regenerating...'));
                    message = await generateCommitMessage(diff);
                } else {
                    console.log(pc.red('Commit aborted.'));
                    return;
                }
            }
        } catch (error) {
            console.error(pc.red('Error during commit:'), error.message);
            process.exit(1);
        }
    }

    console.log(pc.bold(pc.blue('Aico: Analyzing your changes...')));

    try {
        const diff = await getStagedDiff();

        if (!diff || diff.trim() === '') {
            console.log(pc.yellow('No staged changes found to review.'));
            return;
        }

        const aiResponse = await reviewCode(diff);
        const issues = parseAIResponse(aiResponse);

        if (issues.length === 0) {
            console.log(pc.green('No issues found. Good job!'));
        } else {
            displayIssues(issues);

            for (const issue of issues) {
                console.log(pc.cyan(`\nReviewing issue in ${pc.bold(issue.file)}...`));
                console.log(`${pc.yellow('Issue:')} ${issue.issue}`);

                const choices = [
                    { name: 'skip', message: 'Skip this issue', value: 'skip' },
                ];

                if (issue.correctedCode) {
                    choices.unshift({ name: 'apply', message: 'Apply suggested fix', value: 'apply' });
                }

                const { action } = await prompt({
                    type: 'select',
                    name: 'action',
                    message: 'What would you like to do?',
                    choices: [...choices, { name: 'abort', message: 'Abort push', value: 'abort' }]
                });

                if (action === 'apply') {
                    const success = await applyFix(issue.file, issue.correctedCode);
                    if (success) {
                        console.log(pc.green(`Applied fix to ${issue.file}`));
                    }
                } else if (action === 'abort') {
                    if (isSilent) {
                        console.log(pc.yellow('Warning: Review aborted with issues, but proceeding anyway (Silent Mode).'));
                        break;
                    }
                    console.log(pc.red('Push aborted.'));
                    process.exit(1);
                }
            }
        }

        if (!isSilent) {
            const finalAction = await prompt({
                type: 'confirm',
                name: 'proceed',
                message: 'Would you like to proceed with the push?',
                initial: true
            });

            if (!finalAction.proceed) {
                console.log(pc.red('Push aborted.'));
                process.exit(1);
            }
        } else if (issues.length > 0) {
            console.log(pc.yellow('\nReview completed with issues, but proceeding anyway (Silent Mode).'));
        }

        console.log(pc.green('Proceeding with push...'));
    } catch (error) {
        console.error(pc.red('Error during review:'), error.message);
        process.exit(1);
    }
}

main();
