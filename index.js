#!/usr/bin/env node
import { getStagedDiff, applyFix, getDiffChunks } from './lib/git-utils.js';
import { reviewCode, generateCommitMessage } from './lib/ai-service.js';
import { parseAIResponse, displayIssues } from './lib/reviewer.js';
import pc from 'picocolors';
import enquirer from 'enquirer';
import fs from 'fs';
const { prompt } = enquirer;

import { saveGlobalConfig } from './lib/config-utils.js';
import { execSync } from 'child_process';

// Spinner utility
let spinnerInterval;
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let frameIndex = 0;

function startSpinner(text) {
    frameIndex = 0;
    process.stdout.write('\x1B[?25l'); // Hide cursor
    spinnerInterval = setInterval(() => {
        process.stdout.write(`\r${pc.cyan(spinnerFrames[frameIndex++ % spinnerFrames.length])} ${text}`);
    }, 80);
}

function stopSpinner() {
    if (spinnerInterval) {
        clearInterval(spinnerInterval);
        spinnerInterval = null;
        process.stdout.write('\r\x1b[K'); // Clear line
        process.stdout.write('\x1B[?25h'); // Show cursor
    }
}

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

    const defaultModels = {
        groq: 'llama-3.3-70b-versatile',
        openai: 'gpt-4o-mini',
        deepseek: 'deepseek-chat',
        ollama: 'llama3',
        gemini: 'gemini-1.5-flash'
    };

    const { model } = await prompt({
        type: 'input',
        name: 'model',
        message: `Model name (default: ${defaultModels[provider]}):`,
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

            // Remove the default pre-commit hook that runs "npm test"
            const preCommitPath = '.husky/pre-commit';
            if (fs.existsSync(preCommitPath)) {
                fs.unlinkSync(preCommitPath);
            }

            // Add aico to pre-push
            const huskyPath = '.husky/pre-push';
            const hookContent = '#!/bin/sh\naico review\n';
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
        try {
            const diff = await getStagedDiff();
            if (!diff || diff.trim() === '') {
                console.log(pc.yellow('No staged changes found to commit.'));
                return;
            }

            // For commit messages, we use a truncated diff if it's too large to save tokens
            const commitDiff = diff.length > 20000 ? diff.substring(0, 20000) + '\n... [Diff truncated for summary] ...' : diff;

            startSpinner('Generating commit message...');
            let message = await generateCommitMessage(commitDiff);
            stopSpinner();

            while (true) {
                console.log(`${pc.bold('Suggested message:')} ${pc.green(message)}`);

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
                    message = await generateCommitMessage(commitDiff);
                } else {
                    console.log(pc.red('Commit aborted.'));
                    return;
                }
            }
        } catch (error) {
            stopSpinner();
            console.error(pc.red('Error during commit:'), error.message);
            process.exit(1);
        }
    }

    console.log(pc.bold(pc.blue('Aico: Analyzing your changes...')));

    try {
        const fullDiff = await getStagedDiff();

        if (!fullDiff || fullDiff.trim() === '') {
            console.log(pc.yellow('No staged changes found to review.'));
            return;
        }

        let chunks = getDiffChunks(fullDiff);

        // Handle exceptionally large diffs interactively
        if (chunks.length > 5 && !isSilent) {
            console.log(pc.yellow(`\nWarning: Giant diff detected (${chunks.length} chunks).`));
            const { strategy } = await prompt({
                type: 'select',
                name: 'strategy',
                message: 'How would you like to proceed?',
                choices: [
                    { name: 'all', message: `Review everything (Parallel, ~${chunks.length * 2}s)`, value: 'all' },
                    { name: 'top', message: 'Review only the first 5 chunks (Faster)', value: 'top' },
                    { name: 'skip', message: 'Skip review and proceed', value: 'skip' }
                ]
            });

            if (strategy === 'skip') {
                console.log(pc.green('Skipping review. Proceeding with push...'));
                return;
            } else if (strategy === 'top') {
                chunks = chunks.slice(0, 5);
            }
        }

        const allIssues = [];
        const CONCURRENCY_LIMIT = 3;

        // Process chunks in parallel with a concurrency limit
        for (let i = 0; i < chunks.length; i += CONCURRENCY_LIMIT) {
            const currentBatch = chunks.slice(i, i + CONCURRENCY_LIMIT);
            const batchIndex = Math.floor(i / CONCURRENCY_LIMIT) + 1;
            const totalBatches = Math.ceil(chunks.length / CONCURRENCY_LIMIT);

            const statusText = chunks.length > 1
                ? `Analyzing changes (Batch ${batchIndex}/${totalBatches})...`
                : 'Analyzing your changes...';

            startSpinner(statusText);

            try {
                const batchResults = await Promise.all(currentBatch.map(chunk => reviewCode(chunk)));
                stopSpinner();

                for (const aiResponse of batchResults) {
                    const chunkIssues = parseAIResponse(aiResponse);
                    allIssues.push(...chunkIssues);
                }

                // Small delay between batches to avoid rate limits
                if (i + CONCURRENCY_LIMIT < chunks.length) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            } catch (error) {
                stopSpinner();
                console.error(pc.red(`\nError during batch ${batchIndex} review:`), error.message);
                if (chunks.length <= CONCURRENCY_LIMIT) throw error;
            }
        }

        if (allIssues.length === 0) {
            console.log(pc.green('No issues found. Good job!'));
        } else {
            displayIssues(allIssues);

            for (const issue of allIssues) {
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
                message: 'Would you like to proceed?',
                initial: true
            });

            if (!finalAction.proceed) {
                console.log(pc.red('Aborted.'));
                process.exit(1);
            }
        } else if (allIssues.length > 0) {
            console.log(pc.yellow('\nReview completed with issues, but proceeding anyway (Silent Mode).'));
        }

        console.log(pc.green('Done!'));
    } catch (error) {
        stopSpinner();
        console.error(pc.red('Error during review:'), error.message);
        process.exit(1);
    }
}

main();
