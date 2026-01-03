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

    const { provider } = await prompt({
        type: 'select',
        name: 'provider',
        message: 'Which AI provider would you like to use?',
        choices: [
            { name: 'groq', message: 'Groq (Fast & Free tier)' },
            { name: 'openai', message: 'OpenAI (GPT-4o, etc.)' },
            { name: 'deepseek', message: 'DeepSeek (Powerful & Cheap)' },
            { name: 'ollama', message: 'Ollama (Local & Private)' },
            { name: 'gemini', message: 'Google Gemini' }
        ]
    });

    let config = { provider, providers: {} };
    config.providers[provider] = {};

    if (provider === 'ollama') {
        const { baseUrl } = await prompt({
            type: 'input',
            name: 'baseUrl',
            message: 'Ollama Base URL:',
            initial: 'http://localhost:11434'
        });
        config.providers[provider].baseUrl = baseUrl;
    } else {
        const { apiKey } = await prompt({
            type: 'input',
            name: 'apiKey',
            message: `Enter your ${provider} API Key:`
        });
        config.providers[provider].apiKey = apiKey;
    }

    const { model } = await prompt({
        type: 'input',
        name: 'model',
        message: 'Model name (leave empty for default):',
        initial: ''
    });
    if (model) config.providers[provider].model = model;

    saveGlobalConfig(config);
    console.log(pc.green(`\nConfiguration saved globally in ~/.aicorc for ${provider}!`));

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

function displayHelp() {
    console.log(`
${pc.bold(pc.blue('Aico AI - Gatekeeper for your code'))}

${pc.bold('Usage:')}
  aico <command> [options]

${pc.bold('Commands:')}
  ${pc.cyan('review')}    Analyze staged changes and suggest improvements (default)
  ${pc.cyan('commit')}    Generate and apply an AI-suggested commit message
  ${pc.cyan('init')}      Setup AI providers and Git hooks
  ${pc.cyan('help')}      Display this help message

${pc.bold('Options:')}
  ${pc.cyan('--silent, -s')}    Run review without blocking the push
  ${pc.cyan('--version, -v')}   Display version number
  ${pc.cyan('--help, -h')}      Display this help message

${pc.bold('Examples:')}
  aico review --silent
  aico commit
    `);
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'review';
    const isSilent = args.includes('--silent') || args.includes('-s');

    if (args.includes('--help') || args.includes('-h') || command === 'help') {
        displayHelp();
        return;
    }

    if (args.includes('--version') || args.includes('-v')) {
        const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
        console.log(`aico-ai v${pkg.version}`);
        return;
    }

    if (command === 'init') {
        await init();
        return;
    }

    if (command !== 'review' && command !== 'commit') {
        console.error(pc.red(`Unknown command: ${command}`));
        console.log(`Run ${pc.cyan('aico help')} to see available commands.`);
        process.exit(1);
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
