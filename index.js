#!/usr/bin/env node
import { getStagedDiff, applyFix, getDiffChunks } from './lib/git-utils.js';
import { reviewCode, generateCommitMessage, generatePRDescription, explainCode } from './lib/ai-service.js';
import { parseAIResponse, displayIssues } from './lib/reviewer.js';
import { 
    initializeTeamRules, 
    loadTeamRules, 
    validateAgainstRules, 
    displayViolations,
    listRules,
    generateEnhancedPrompt
} from './lib/rules-engine.js';
import {
    formatJSON,
    formatXML,
    formatGitHubActions,
    formatText,
    saveToFile,
    getExitCode,
    filterBySeverity
} from './lib/ci-formatter.js';
import {
    scanDependencies,
    scanCode,
    scanConfiguration,
    displaySecurityResults,
    generateSecurityReport,
    detectPackageManager
} from './lib/security-scanner.js';
import pc from 'picocolors';
import enquirer from 'enquirer';
import fs from 'fs';
const { prompt } = enquirer;

import { saveGlobalConfig } from './lib/config-utils.js';
import { execSync } from 'child_process';
import { getActiveProvider } from './lib/config-utils.js';

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
    console.log(pc.bold(pc.blue('\n🚀 Welcome to Aico AI - Your Code Quality Gatekeeper!\n')));
    console.log(pc.dim('This wizard will help you set up Aico in a few simple steps.\n'));

    // Provider selection with helpful links
    const providerLinks = {
        groq: 'https://console.groq.com/keys',
        openai: 'https://platform.openai.com/api-keys',
        deepseek: 'https://platform.deepseek.com/api_keys',
        gemini: 'https://makersuite.google.com/app/apikey',
        ollama: 'https://ollama.ai'
    };

    const { provider } = await prompt({
        type: 'select',
        name: 'provider',
        message: 'Which AI provider would you like to use?',
        choices: [
            { name: 'groq', message: 'Groq (Fast & Free tier) - Recommended for getting started' },
            { name: 'openai', message: 'OpenAI (GPT-4o, etc.) - High quality, paid' },
            { name: 'deepseek', message: 'DeepSeek (Powerful & Cheap) - Great value' },
            { name: 'ollama', message: 'Ollama (Local & Private) - Complete privacy' },
            { name: 'gemini', message: 'Google Gemini - Free tier available' }
        ]
    });

    let config = { provider, providers: {} };
    config.providers[provider] = {};

    if (provider === 'ollama') {
        console.log(pc.dim(`\n💡 Tip: Make sure Ollama is running locally first!`));
        console.log(pc.dim(`   Install: https://ollama.ai\n`));
        
        const { baseUrl } = await prompt({
            type: 'input',
            name: 'baseUrl',
            message: 'Ollama Base URL:',
            initial: 'http://localhost:11434'
        });
        config.providers[provider].baseUrl = baseUrl;
    } else {
        console.log(pc.dim(`\n💡 Get your API key: ${pc.cyan(providerLinks[provider])}\n`));
        
        const { apiKey } = await prompt({
            type: 'password',
            name: 'apiKey',
            message: `Enter your ${provider} API Key:`,
            validate: (value) => {
                if (!value || value.trim() === '') {
                    return 'API Key is required';
                }
                return true;
            }
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

    console.log(pc.dim(`\n💡 Default model: ${defaultModels[provider]}`));
    console.log(pc.dim(`   Press Enter to use default, or type a different model name.\n`));

    const { model } = await prompt({
        type: 'input',
        name: 'model',
        message: `Model name:`,
        initial: defaultModels[provider]
    });
    
    if (model && model !== defaultModels[provider]) {
        config.providers[provider].model = model;
    }

    saveGlobalConfig(config);
    console.log(pc.green(`\n✓ Configuration saved globally in ~/.aicorc for ${provider}!`));

    // Git hooks setup
    console.log(pc.dim('\n💡 Git hooks allow Aico to automatically review your code before pushing.'));
    const { setupHusky } = await prompt({
        type: 'confirm',
        name: 'setupHusky',
        message: 'Would you like to setup Aico as a pre-push git hook?',
        initial: true
    });

    if (setupHusky) {
        try {
            console.log(pc.blue('\n⚙️  Setting up Husky...'));
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
            console.log(pc.green('✓ Husky pre-push hook configured!'));
        } catch (e) {
            console.error(pc.red('✗ Failed to setup Husky:'), e.message);
            console.log(pc.yellow('\n⚠️  You can set up hooks manually later with: npx husky init'));
        }
    }

    // Success message with next steps
    console.log(pc.bold(pc.green('\n🎉 Aico is ready to use!\n')));
    console.log(pc.bold('📚 Next Steps:\n'));
    console.log(`  ${pc.cyan('1.')} Set up team rules (recommended):`);
    console.log(`     ${pc.dim('aico rules init')}\n`);
    console.log(`  ${pc.cyan('2.')} Review your code:`);
    console.log(`     ${pc.dim('git add .')}`);
    console.log(`     ${pc.dim('aico review')}\n`);
    console.log(`  ${pc.cyan('3.')} Run a security scan:`);
    console.log(`     ${pc.dim('aico security scan')}\n`);
    console.log(`  ${pc.cyan('4.')} Generate AI commit messages:`);
    console.log(`     ${pc.dim('git add .')}`);
    console.log(`     ${pc.dim('aico commit')}\n`);
    console.log(pc.dim('💡 Run "aico help" to see all available commands.\n'));
}

async function handleRulesCommand(subcommand) {
    if (!subcommand || subcommand === 'init') {
        // Initialize team rules
        const result = initializeTeamRules();
        
        if (result.exists) {
            console.log(pc.yellow(`Team rules already exist at ${result.path}`));
            const { overwrite } = await prompt({
                type: 'confirm',
                name: 'overwrite',
                message: 'Would you like to overwrite with the default template?',
                initial: false
            });
            
            if (overwrite) {
                fs.unlinkSync(result.path);
                const newResult = initializeTeamRules();
                if (newResult.created) {
                    console.log(pc.green(`✓ Team rules initialized at ${newResult.path}`));
                    console.log(pc.blue('\nEdit this file to customize your team\'s code quality standards.'));
                }
            }
        } else if (result.created) {
            console.log(pc.green(`✓ Team rules initialized at ${result.path}`));
            console.log(pc.blue('\nEdit this file to customize your team\'s code quality standards.'));
            console.log(pc.dim('\nExample rules include:'));
            console.log(pc.dim('  - Naming conventions (camelCase, PascalCase, etc.)'));
            console.log(pc.dim('  - Complexity limits (max function length, nesting depth)'));
            console.log(pc.dim('  - Forbidden patterns (console.log, debugger, TODO)'));
            console.log(pc.dim('  - Security checks (hardcoded secrets, eval usage)'));
        }
        return;
    }

    if (subcommand === 'list') {
        // List all active rules
        const result = listRules();
        
        if (!result) {
            console.log(pc.yellow('No team rules found. Run "aico rules init" to create them.'));
            return;
        }

        const { rules, summary } = result;
        
        console.log(pc.bold(pc.blue('\n📋 Team Rules Configuration\n')));
        console.log(`${pc.bold('Version:')} ${summary.version}`);
        console.log(`${pc.bold('Description:')} ${summary.description}`);
        console.log(`${pc.bold('Total Rules:')} ${summary.totalRules}\n`);

        console.log(pc.bold('Categories:'));
        for (const [category, count] of Object.entries(summary.categories)) {
            console.log(`  ${pc.cyan('•')} ${category}: ${count} rule(s)`);
        }

        console.log(pc.bold('\n🚫 Forbidden Patterns:'));
        if (rules.rules.forbidden && rules.rules.forbidden.length > 0) {
            for (const rule of rules.rules.forbidden) {
                const icon = rule.severity === 'error' ? '❌' : '⚠️';
                console.log(`  ${icon} ${rule.pattern}`);
                console.log(`     ${pc.dim(rule.message)}`);
            }
        } else {
            console.log(pc.dim('  None configured'));
        }

        console.log(pc.bold('\n📏 Complexity Limits:'));
        if (rules.rules.complexity) {
            for (const [rule, value] of Object.entries(rules.rules.complexity)) {
                console.log(`  ${pc.cyan('•')} ${rule}: ${value}`);
            }
        } else {
            console.log(pc.dim('  None configured'));
        }

        console.log(pc.bold('\n🛡️  Security Rules:'));
        if (rules.rules.security) {
            for (const [rule, enabled] of Object.entries(rules.rules.security)) {
                if (enabled) {
                    console.log(`  ${pc.green('✓')} ${rule}`);
                }
            }
        } else {
            console.log(pc.dim('  None configured'));
        }

        console.log('');
        return;
    }

    if (subcommand === 'validate') {
        // Validate current changes against team rules
        console.log(pc.bold(pc.blue('Validating against team rules...\n')));

        const rules = loadTeamRules();
        if (!rules) {
            console.log(pc.yellow('No team rules found. Run "aico rules init" to create them.'));
            return;
        }

        const diff = await getStagedDiff();
        if (!diff || diff.trim() === '') {
            console.log(pc.yellow('No staged changes found to validate.'));
            return;
        }

        // Parse diff to get file contents
        const files = diff.split(/^diff --git /m).filter(Boolean);
        let allViolations = [];

        for (const fileDiff of files) {
            // Extract file path
            const pathMatch = fileDiff.match(/a\/(.*?) b\//);
            if (!pathMatch) continue;
            
            const filePath = pathMatch[1];
            
            // Try to read the actual file content
            try {
                if (fs.existsSync(filePath)) {
                    const fileContent = fs.readFileSync(filePath, 'utf-8');
                    const violations = validateAgainstRules(fileDiff, fileContent, filePath);
                    allViolations.push(...violations);
                }
            } catch (error) {
                // Skip files that can't be read
                continue;
            }
        }

        displayViolations(allViolations);

        if (allViolations.length > 0) {
            const errorCount = allViolations.filter(v => v.severity === 'error').length;
            const warnCount = allViolations.filter(v => v.severity === 'warn').length;
            
            console.log(pc.bold(`Summary: ${errorCount} error(s), ${warnCount} warning(s)\n`));
            
            if (errorCount > 0) {
                process.exit(1);
            }
        }
        return;
    }

    console.error(pc.red(`Unknown rules subcommand: ${subcommand}`));
    console.log(`Run ${pc.cyan('aico help')} to see available commands.`);
    process.exit(1);
}

async function handleSecurityCommand(subcommand, args) {
    if (!subcommand || subcommand === 'scan') {
        // Full security scan
        console.log(pc.bold(pc.blue('🛡️  Running security scan...\n')));
        
        startSpinner('Scanning dependencies...');
        const dependencies = scanDependencies();
        stopSpinner();
        
        startSpinner('Scanning code...');
        const codeIssues = [];
        const configIssues = scanConfiguration();
        
        // Scan all JavaScript/TypeScript files
        const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
        const scanFiles = (dir) => {
            if (!fs.existsSync(dir)) return;
            const files = fs.readdirSync(dir);
            
            for (const file of files) {
                const filePath = `${dir}/${file}`;
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                    // Skip node_modules, dist, build, etc.
                    if (!['node_modules', 'dist', 'build', '.git', '.next', 'coverage'].includes(file)) {
                        scanFiles(filePath);
                    }
                } else if (extensions.some(ext => file.endsWith(ext))) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const issues = scanCode(content, filePath);
                        codeIssues.push(...issues);
                    } catch (error) {
                        // Skip files that can't be read
                    }
                }
            }
        };
        
        scanFiles('.');
        stopSpinner();
        
        // Prepare results
        const results = {
            dependencies,
            code: codeIssues,
            configuration: configIssues,
            summary: {
                total: dependencies.vulnerabilities.length + codeIssues.length + configIssues.length,
                critical: dependencies.summary.critical + codeIssues.filter(i => i.severity === 'critical').length + configIssues.filter(i => i.severity === 'critical').length,
                high: dependencies.summary.high + codeIssues.filter(i => i.severity === 'high').length + configIssues.filter(i => i.severity === 'high').length,
                moderate: dependencies.summary.moderate + codeIssues.filter(i => i.severity === 'moderate').length + configIssues.filter(i => i.severity === 'moderate').length,
                low: dependencies.summary.low + codeIssues.filter(i => i.severity === 'low').length + configIssues.filter(i => i.severity === 'low').length
            }
        };
        
        // Display results
        displaySecurityResults(results);
        
        // Save report if requested
        if (args.includes('--output')) {
            const outputIndex = args.indexOf('--output');
            const outputFile = args[outputIndex + 1];
            const report = generateSecurityReport(results);
            saveToFile(JSON.stringify(report, null, 2), outputFile);
            console.log(pc.green(`Report saved to ${outputFile}`));
        }
        
        // Exit with error code if critical or high severity issues found
        if (results.summary.critical > 0 || results.summary.high > 0) {
            process.exit(1);
        }
        
        return;
    }
    
    if (subcommand === 'check') {
        const checkType = args.includes('--dependencies') ? 'dependencies' : 
                         args.includes('--code') ? 'code' : 'all';
        
        if (checkType === 'dependencies' || checkType === 'all') {
            console.log(pc.bold(pc.blue('Checking dependencies...\n')));
            const dependencies = scanDependencies();
            
            if (dependencies.vulnerabilities.length === 0) {
                console.log(pc.green('✓ No dependency vulnerabilities found'));
            } else {
                displaySecurityResults({ dependencies, summary: dependencies.summary });
            }
        }
        
        if (checkType === 'code' || checkType === 'all') {
            console.log(pc.bold(pc.blue('\nChecking code...\n')));
            // Similar to scan but only code
            const codeIssues = [];
            const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
            
            const scanFiles = (dir) => {
                if (!fs.existsSync(dir)) return;
                const files = fs.readdirSync(dir);
                
                for (const file of files) {
                    const filePath = `${dir}/${file}`;
                    const stat = fs.statSync(filePath);
                    
                    if (stat.isDirectory()) {
                        if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
                            scanFiles(filePath);
                        }
                    } else if (extensions.some(ext => file.endsWith(ext))) {
                        try {
                            const content = fs.readFileSync(filePath, 'utf-8');
                            const issues = scanCode(content, filePath);
                            codeIssues.push(...issues);
                        } catch (error) {
                            // Skip
                        }
                    }
                }
            };
            
            scanFiles('.');
            
            if (codeIssues.length === 0) {
                console.log(pc.green('✓ No code vulnerabilities found'));
            } else {
                const summary = {
                    total: codeIssues.length,
                    critical: codeIssues.filter(i => i.severity === 'critical').length,
                    high: codeIssues.filter(i => i.severity === 'high').length,
                    moderate: codeIssues.filter(i => i.severity === 'moderate').length,
                    low: codeIssues.filter(i => i.severity === 'low').length
                };
                displaySecurityResults({ code: codeIssues, summary });
            }
        }
        
        return;
    }
    
    if (subcommand === 'report') {
        // Generate detailed security report
        console.log(pc.bold(pc.blue('Generating security report...\n')));
        
        const dependencies = scanDependencies();
        const codeIssues = [];
        const configIssues = scanConfiguration();
        
        // Scan code
        const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
        const scanFiles = (dir) => {
            if (!fs.existsSync(dir)) return;
            const files = fs.readdirSync(dir);
            
            for (const file of files) {
                const filePath = `${dir}/${file}`;
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                    if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
                        scanFiles(filePath);
                    }
                } else if (extensions.some(ext => file.endsWith(ext))) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const issues = scanCode(content, filePath);
                        codeIssues.push(...issues);
                    } catch (error) {
                        // Skip
                    }
                }
            }
        };
        
        scanFiles('.');
        
        const results = {
            dependencies,
            code: codeIssues,
            configuration: configIssues,
            summary: {
                total: dependencies.vulnerabilities.length + codeIssues.length + configIssues.length,
                critical: dependencies.summary.critical + codeIssues.filter(i => i.severity === 'critical').length,
                high: dependencies.summary.high + codeIssues.filter(i => i.severity === 'high').length,
                moderate: dependencies.summary.moderate + codeIssues.filter(i => i.severity === 'moderate').length,
                low: dependencies.summary.low + codeIssues.filter(i => i.severity === 'low').length
            }
        };
        
        const report = generateSecurityReport(results);
        const outputFile = 'security-report.json';
        saveToFile(JSON.stringify(report, null, 2), outputFile);
        
        console.log(pc.green(`✓ Security report generated: ${outputFile}`));
        console.log(pc.dim(`\nSummary: ${results.summary.total} issues found`));
        console.log(pc.dim(`  Critical: ${results.summary.critical}`));
        console.log(pc.dim(`  High: ${results.summary.high}`));
        console.log(pc.dim(`  Moderate: ${results.summary.moderate}`));
        console.log(pc.dim(`  Low: ${results.summary.low}`));
        
        return;
    }
    
    console.error(pc.red(`Unknown security subcommand: ${subcommand}`));
    console.log(`Run ${pc.cyan('aico help')} to see available commands.`);
    process.exit(1);
}

async function handleCICommand(args) {
    // Parse CI-specific options
    const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 
                   (args.includes('--format') ? args[args.indexOf('--format') + 1] : 'text');
    const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1] ||
                   (args.includes('--output') ? args[args.indexOf('--output') + 1] : null);
    const failOnError = args.includes('--fail-on-error');
    const failOnWarn = args.includes('--fail-on-warn');
    const severity = args.find(arg => arg.startsWith('--severity='))?.split('=')[1] ||
                     (args.includes('--severity') ? args[args.indexOf('--severity') + 1] : null);

    const startTime = Date.now();

    try {
        // Get staged diff
        const fullDiff = await getStagedDiff();

        if (!fullDiff || fullDiff.trim() === '') {
            const emptyResult = {
                summary: { totalIssues: 0, errors: 0, warnings: 0, info: 0 },
                issues: [],
                metadata: {
                    timestamp: new Date().toISOString(),
                    duration: 0,
                    provider: null,
                    model: null
                }
            };

            if (format === 'json') {
                const jsonOutput = JSON.stringify(emptyResult, null, 2);
                if (output) {
                    saveToFile(jsonOutput, output);
                } else {
                    console.log(jsonOutput);
                }
            } else {
                console.log('No staged changes found to review.');
            }
            process.exit(0);
            return;
        }

        // Get chunks and review
        const chunks = getDiffChunks(fullDiff);
        const allIssues = [];
        const CONCURRENCY_LIMIT = 3;

        // Process chunks in parallel
        for (let i = 0; i < chunks.length; i += CONCURRENCY_LIMIT) {
            const currentBatch = chunks.slice(i, i + CONCURRENCY_LIMIT);
            
            try {
                const batchResults = await Promise.all(currentBatch.map(chunk => reviewCode(chunk)));
                
                for (const aiResponse of batchResults) {
                    const chunkIssues = parseAIResponse(aiResponse);
                    allIssues.push(...chunkIssues);
                }

                // Small delay between batches
                if (i + CONCURRENCY_LIMIT < chunks.length) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            } catch (error) {
                console.error(`Error during review: ${error.message}`);
                process.exit(1);
            }
        }

        // Also run team rules validation if available
        const teamRules = loadTeamRules();
        if (teamRules) {
            const files = fullDiff.split(/^diff --git /m).filter(Boolean);
            
            for (const fileDiff of files) {
                const pathMatch = fileDiff.match(/a\/(.*?) b\//);
                if (!pathMatch) continue;
                
                const filePath = pathMatch[1];
                
                try {
                    if (fs.existsSync(filePath)) {
                        const fileContent = fs.readFileSync(filePath, 'utf-8');
                        const violations = validateAgainstRules(fileDiff, fileContent, filePath);
                        
                        // Convert violations to issue format
                        for (const violation of violations) {
                            allIssues.push({
                                file: violation.file,
                                severity: violation.severity,
                                issue: violation.message,
                                suggestion: null,
                                rule: violation.type
                            });
                        }
                    }
                } catch (error) {
                    // Skip files that can't be read
                    continue;
                }
            }
        }

        // Filter by severity if specified
        let filteredIssues = severity ? filterBySeverity(allIssues, severity) : allIssues;

        // Calculate duration
        const duration = (Date.now() - startTime) / 1000;

        // Get provider info
        const { provider, model } = getActiveProvider();

        // Prepare metadata
        const metadata = {
            timestamp: new Date().toISOString(),
            duration,
            provider,
            model,
            version: '1.1.0'
        };

        // Format output
        let formattedOutput;
        switch (format.toLowerCase()) {
            case 'json':
                formattedOutput = formatJSON(filteredIssues, metadata);
                break;
            case 'xml':
                formattedOutput = formatXML(filteredIssues, metadata);
                break;
            case 'github':
            case 'github-actions':
                formattedOutput = formatGitHubActions(filteredIssues);
                break;
            case 'text':
            default:
                formattedOutput = formatText(filteredIssues, metadata);
                break;
        }

        // Output to file or console
        if (output) {
            saveToFile(formattedOutput, output);
            console.log(`Report saved to ${output}`);
        } else {
            console.log(formattedOutput);
        }

        // Determine exit code
        const exitCode = getExitCode(filteredIssues, { failOnError, failOnWarn, severity });
        process.exit(exitCode);

    } catch (error) {
        console.error(`Error during CI review: ${error.message}`);
        process.exit(1);
    }
}

function displayHelp() {
    console.log(`
${pc.bold(pc.blue('Aico AI - Gatekeeper for your code'))}

${pc.bold('Usage:')}
  aico <command> [options]

${pc.bold('Commands:')}
  ${pc.cyan('review')}           Analyze staged changes and suggest improvements (default)
  ${pc.cyan('commit')}           Generate and apply an AI-suggested commit message
  ${pc.cyan('pr')}               Generate Pull Request description from diff
  ${pc.cyan('ci')}               Run in CI/CD mode with machine-readable output
  ${pc.cyan('explain <file>')}   Explain a specific file
  ${pc.cyan('security <subcommand>')} Security vulnerability scanning
    ${pc.dim('scan')}            Full security scan (dependencies + code + config)
    ${pc.dim('check')}           Check specific areas (--dependencies or --code)
    ${pc.dim('report')}          Generate detailed security report
  ${pc.cyan('init')}             Setup AI providers and Git hooks
  ${pc.cyan('rules <subcommand>')} Manage team rules
    ${pc.dim('init')}            Initialize team rules configuration
    ${pc.dim('list')}            List all active rules
    ${pc.dim('validate')}        Validate code against team rules
  ${pc.cyan('help')}             Display this help message

${pc.bold('Options:')}
  ${pc.cyan('--silent, -s')}     Run review without blocking the push
  ${pc.cyan('--format <type>')}  Output format: json, xml, github, text (CI mode)
  ${pc.cyan('--output <file>')}  Save output to file (CI/CD and security modes)
  ${pc.cyan('--fail-on-error')}  Exit with code 1 if errors found (CI mode)
  ${pc.cyan('--fail-on-warn')}   Exit with code 1 if warnings found (CI mode)
  ${pc.cyan('--severity <level>')} Filter by severity: error, warn, info (CI mode)
  ${pc.cyan('--dependencies')}   Check dependencies only (security mode)
  ${pc.cyan('--code')}           Check code only (security mode)
  ${pc.cyan('--version, -v')}    Display version number
  ${pc.cyan('--help, -h')}       Display this help message

${pc.bold('Examples:')}
  aico review --silent
  aico commit
  aico pr
  aico explain src/utils.js
  aico ci --format json --output report.json
  aico security scan
  aico security check --dependencies
  aico security report --output security-report.json
  aico rules init
  aico rules list
  aico rules validate
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

    if (command === 'rules') {
        const subcommand = args[1];
        await handleRulesCommand(subcommand);
        return;
    }

    if (command === 'ci') {
        await handleCICommand(args);
        return;
    }

    if (command === 'security') {
        const subcommand = args[1];
        await handleSecurityCommand(subcommand, args);
        return;
    }

    if (command === 'pr') {
        try {
            const currentBranch = execSync('git branch --show-current').toString().trim();
            
            // Try to detect base branch (main, master, or develop)
            let baseBranch = 'main';
            const branches = ['main', 'master', 'develop', 'dev'];
            for (const branch of branches) {
                try {
                    execSync(`git rev-parse --verify origin/${branch}`, { stdio: 'ignore' });
                    baseBranch = branch;
                    break;
                } catch (e) {
                    continue;
                }
            }

            console.log(pc.dim(`Comparing ${currentBranch} with origin/${baseBranch}...`));
            const diff = execSync(`git diff origin/${baseBranch}...${currentBranch}`).toString();

            if (!diff || diff.trim() === '') {
                console.log(pc.yellow(`No differences found between ${currentBranch} and origin/${baseBranch}.`));
                return;
            }

            startSpinner('Generating PR description...');
            const description = await generatePRDescription(diff);
            stopSpinner();

            console.log(pc.bold('\n📝 Suggested PR Description:\n'));
            console.log(description);
        } catch (error) {
            stopSpinner();
            console.error(pc.red('Error generating PR description:'), error.message);
            process.exit(1);
        }
        return;
    }

    if (command === 'explain') {
        const filePath = args[1];
        if (!filePath) {
            console.error(pc.red('Please provide a file path: aico explain <file>'));
            return;
        }

        if (!fs.existsSync(filePath)) {
            console.error(pc.red(`File not found: ${filePath}`));
            return;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            startSpinner(`Analyzing ${filePath}...`);
            const explanation = await explainCode(content, filePath);
            stopSpinner();

            console.log(pc.bold(`\n📘 Explanation for ${filePath}:\n`));
            console.log(explanation);
        } catch (error) {
            stopSpinner();
            console.error(pc.red('Error explaining file:'), error.message);
            process.exit(1);
        }
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
