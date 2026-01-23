import fs from 'fs';
import path from 'path';
import pc from 'picocolors';

const RULES_PATH = '.aico/rules.json';
const DEFAULT_RULES_TEMPLATE = {
    version: "1.0",
    description: "Aico team rules configuration - Define your team's code quality standards",
    rules: {
        naming: {
            functions: "camelCase",
            classes: "PascalCase",
            constants: "UPPER_SNAKE_CASE",
            variables: "camelCase"
        },
        complexity: {
            maxFunctionLength: 50,
            maxCyclomaticComplexity: 10,
            maxNestingDepth: 4,
            maxFileLength: 500
        },
        forbidden: [
            {
                pattern: "console\\.log",
                severity: "warn",
                message: "Remove console.log before committing. Use a proper logging library instead.",
                exclude: ["*.test.js", "*.spec.ts"]
            },
            {
                pattern: "debugger",
                severity: "error",
                message: "Remove debugger statement before committing"
            },
            {
                pattern: "TODO:|FIXME:",
                severity: "warn",
                message: "Unresolved TODO/FIXME found. Please create a ticket or resolve it."
            }
        ],
        required: [
            {
                pattern: "^/\\*\\*[\\s\\S]*?\\*/\\s*(export\\s+)?(async\\s+)?function",
                severity: "warn",
                message: "Public functions should have JSDoc comments",
                filePattern: "*.js"
            }
        ],
        security: {
            noHardcodedSecrets: true,
            noEval: true,
            noInnerHTML: true,
            requireInputValidation: true
        }
    },
    ignore: [
        "*.test.js",
        "*.spec.ts",
        "*.test.tsx",
        "*.spec.jsx",
        "dist/**",
        "build/**",
        "coverage/**",
        "node_modules/**",
        "*.min.js",
        "*.bundle.js"
    ],
    teamStandards: {
        requireErrorHandling: true,
        requireTypeAnnotations: false,
        preferConst: true,
        noVarKeyword: true,
        requireStrictMode: false
    },
    aiPromptEnhancement: {
        enabled: true,
        customInstructions: "Focus on code maintainability, security, and performance. Follow our team's naming conventions and complexity limits."
    }
};

/**
 * Load team rules from .aico/rules.json
 * @returns {object|null} Rules object or null if not found
 */
export function loadTeamRules() {
    try {
        if (fs.existsSync(RULES_PATH)) {
            const content = fs.readFileSync(RULES_PATH, 'utf-8');
            return JSON.parse(content);
        }
    } catch (error) {
        console.error(pc.red('Error loading team rules:'), error.message);
    }
    return null;
}

/**
 * Save team rules to .aico/rules.json
 * @param {object} rules - Rules object to save
 */
export function saveTeamRules(rules) {
    try {
        const dir = path.dirname(RULES_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(RULES_PATH, JSON.stringify(rules, null, 2));
        return true;
    } catch (error) {
        console.error(pc.red('Error saving team rules:'), error.message);
        return false;
    }
}

/**
 * Initialize team rules with default template
 */
export function initializeTeamRules() {
    if (fs.existsSync(RULES_PATH)) {
        return { exists: true, path: RULES_PATH };
    }
    
    const success = saveTeamRules(DEFAULT_RULES_TEMPLATE);
    return { exists: false, created: success, path: RULES_PATH };
}

/**
 * Validate code against team rules
 * @param {string} diff - Git diff to validate
 * @param {string} fileContent - Full file content
 * @param {string} filePath - Path to the file
 * @returns {Array} Array of rule violations
 */
export function validateAgainstRules(diff, fileContent, filePath) {
    const rules = loadTeamRules();
    if (!rules) return [];

    const violations = [];

    // Check if file should be ignored
    if (shouldIgnoreFile(filePath, rules.ignore)) {
        return [];
    }

    // Check forbidden patterns
    if (rules.rules.forbidden) {
        for (const forbiddenRule of rules.rules.forbidden) {
            // Check if this file is excluded from this rule
            if (forbiddenRule.exclude && shouldIgnoreFile(filePath, forbiddenRule.exclude)) {
                continue;
            }

            const regex = new RegExp(forbiddenRule.pattern, 'g');
            const matches = [...fileContent.matchAll(regex)];
            
            if (matches.length > 0) {
                violations.push({
                    type: 'forbidden',
                    severity: forbiddenRule.severity || 'error',
                    message: forbiddenRule.message,
                    pattern: forbiddenRule.pattern,
                    occurrences: matches.length,
                    file: filePath
                });
            }
        }
    }

    // Check required patterns
    if (rules.rules.required) {
        for (const requiredRule of rules.rules.required) {
            // Check if this rule applies to this file type
            if (requiredRule.filePattern && !matchesPattern(filePath, requiredRule.filePattern)) {
                continue;
            }

            const regex = new RegExp(requiredRule.pattern, 'g');
            const matches = [...fileContent.matchAll(regex)];
            
            // For required patterns, we need to check if they're missing
            // This is a simplified check - in practice, you'd want more sophisticated analysis
            if (matches.length === 0 && fileContent.includes('function')) {
                violations.push({
                    type: 'required',
                    severity: requiredRule.severity || 'warn',
                    message: requiredRule.message,
                    pattern: requiredRule.pattern,
                    file: filePath
                });
            }
        }
    }

    // Check complexity rules
    if (rules.rules.complexity) {
        const complexityViolations = checkComplexity(fileContent, filePath, rules.rules.complexity);
        violations.push(...complexityViolations);
    }

    // Check security rules
    if (rules.rules.security) {
        const securityViolations = checkSecurity(fileContent, filePath, rules.rules.security);
        violations.push(...securityViolations);
    }

    // Check team standards
    if (rules.teamStandards) {
        const standardViolations = checkTeamStandards(fileContent, filePath, rules.teamStandards);
        violations.push(...standardViolations);
    }

    return violations;
}

/**
 * Check if file should be ignored based on patterns
 * @param {string} filePath - Path to check
 * @param {Array} ignorePatterns - Array of ignore patterns
 * @returns {boolean}
 */
function shouldIgnoreFile(filePath, ignorePatterns) {
    if (!ignorePatterns) return false;
    
    for (const pattern of ignorePatterns) {
        if (matchesPattern(filePath, pattern)) {
            return true;
        }
    }
    return false;
}

/**
 * Check if path matches a glob-like pattern
 * @param {string} filePath - Path to check
 * @param {string} pattern - Pattern to match
 * @returns {boolean}
 */
function matchesPattern(filePath, pattern) {
    // Convert glob pattern to regex
    const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
}

/**
 * Check complexity rules
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @param {object} complexityRules - Complexity rules
 * @returns {Array} Violations
 */
function checkComplexity(content, filePath, complexityRules) {
    const violations = [];

    // Check file length
    if (complexityRules.maxFileLength) {
        const lines = content.split('\n').length;
        if (lines > complexityRules.maxFileLength) {
            violations.push({
                type: 'complexity',
                severity: 'warn',
                message: `File exceeds maximum length of ${complexityRules.maxFileLength} lines (current: ${lines})`,
                file: filePath
            });
        }
    }

    // Check function length (simplified)
    if (complexityRules.maxFunctionLength) {
        const functionRegex = /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g;
        const functions = content.match(functionRegex) || [];
        
        for (const func of functions) {
            const lines = func.split('\n').length;
            if (lines > complexityRules.maxFunctionLength) {
                violations.push({
                    type: 'complexity',
                    severity: 'warn',
                    message: `Function exceeds maximum length of ${complexityRules.maxFunctionLength} lines (current: ${lines})`,
                    file: filePath
                });
            }
        }
    }

    // Check nesting depth (simplified)
    if (complexityRules.maxNestingDepth) {
        const lines = content.split('\n');
        let maxDepth = 0;
        let currentDepth = 0;

        for (const line of lines) {
            const openBraces = (line.match(/\{/g) || []).length;
            const closeBraces = (line.match(/\}/g) || []).length;
            currentDepth += openBraces - closeBraces;
            maxDepth = Math.max(maxDepth, currentDepth);
        }

        if (maxDepth > complexityRules.maxNestingDepth) {
            violations.push({
                type: 'complexity',
                severity: 'warn',
                message: `Code exceeds maximum nesting depth of ${complexityRules.maxNestingDepth} (current: ${maxDepth})`,
                file: filePath
            });
        }
    }

    return violations;
}

/**
 * Check security rules
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @param {object} securityRules - Security rules
 * @returns {Array} Violations
 */
function checkSecurity(content, filePath, securityRules) {
    const violations = [];

    // Check for hardcoded secrets
    if (securityRules.noHardcodedSecrets) {
        const secretPatterns = [
            /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
            /password\s*=\s*['"][^'"]+['"]/gi,
            /secret\s*=\s*['"][^'"]+['"]/gi,
            /token\s*=\s*['"][^'"]+['"]/gi,
            /aws[_-]?access[_-]?key/gi,
            /private[_-]?key/gi
        ];

        for (const pattern of secretPatterns) {
            if (pattern.test(content)) {
                violations.push({
                    type: 'security',
                    severity: 'error',
                    message: 'Potential hardcoded secret detected. Use environment variables instead.',
                    file: filePath
                });
                break;
            }
        }
    }

    // Check for eval usage
    if (securityRules.noEval) {
        if (/\beval\s*\(/.test(content)) {
            violations.push({
                type: 'security',
                severity: 'error',
                message: 'Usage of eval() detected. This is a security risk.',
                file: filePath
            });
        }
    }

    // Check for innerHTML usage
    if (securityRules.noInnerHTML) {
        if (/\.innerHTML\s*=/.test(content)) {
            violations.push({
                type: 'security',
                severity: 'warn',
                message: 'Usage of innerHTML detected. Consider using textContent or a sanitization library to prevent XSS.',
                file: filePath
            });
        }
    }

    return violations;
}

/**
 * Check team standards
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @param {object} standards - Team standards
 * @returns {Array} Violations
 */
function checkTeamStandards(content, filePath, standards) {
    const violations = [];

    // Check for var keyword
    if (standards.noVarKeyword) {
        if (/\bvar\s+/.test(content)) {
            violations.push({
                type: 'standard',
                severity: 'warn',
                message: 'Usage of "var" keyword detected. Use "const" or "let" instead.',
                file: filePath
            });
        }
    }

    // Check for const preference
    if (standards.preferConst) {
        // This is a simplified check - proper implementation would need AST analysis
        const letMatches = content.match(/\blet\s+\w+\s*=/g) || [];
        if (letMatches.length > 0) {
            violations.push({
                type: 'standard',
                severity: 'info',
                message: 'Consider using "const" instead of "let" for variables that are not reassigned.',
                file: filePath
            });
        }
    }

    return violations;
}

/**
 * Generate enhanced AI prompt based on team rules
 * @param {object} rules - Team rules
 * @returns {string} Enhanced prompt
 */
export function generateEnhancedPrompt(rules) {
    if (!rules || !rules.aiPromptEnhancement?.enabled) {
        return '';
    }

    let prompt = '\n\nTEAM-SPECIFIC RULES:\n';

    // Add custom instructions
    if (rules.aiPromptEnhancement.customInstructions) {
        prompt += `${rules.aiPromptEnhancement.customInstructions}\n\n`;
    }

    // Add naming conventions
    if (rules.rules.naming) {
        prompt += 'Naming Conventions:\n';
        for (const [type, convention] of Object.entries(rules.rules.naming)) {
            prompt += `- ${type}: ${convention}\n`;
        }
        prompt += '\n';
    }

    // Add complexity limits
    if (rules.rules.complexity) {
        prompt += 'Complexity Limits:\n';
        for (const [rule, value] of Object.entries(rules.rules.complexity)) {
            prompt += `- ${rule}: ${value}\n`;
        }
        prompt += '\n';
    }

    // Add forbidden patterns
    if (rules.rules.forbidden && rules.rules.forbidden.length > 0) {
        prompt += 'Forbidden Patterns:\n';
        for (const forbidden of rules.rules.forbidden) {
            prompt += `- ${forbidden.pattern}: ${forbidden.message}\n`;
        }
        prompt += '\n';
    }

    // Add team standards
    if (rules.teamStandards) {
        prompt += 'Team Standards:\n';
        for (const [standard, enabled] of Object.entries(rules.teamStandards)) {
            if (enabled) {
                prompt += `- ${standard}: enabled\n`;
            }
        }
    }

    return prompt;
}

/**
 * List all active rules
 * @returns {object} Formatted rules summary
 */
export function listRules() {
    const rules = loadTeamRules();
    if (!rules) {
        return null;
    }

    const summary = {
        version: rules.version,
        description: rules.description,
        totalRules: 0,
        categories: {}
    };

    // Count forbidden rules
    if (rules.rules.forbidden) {
        summary.categories.forbidden = rules.rules.forbidden.length;
        summary.totalRules += rules.rules.forbidden.length;
    }

    // Count required rules
    if (rules.rules.required) {
        summary.categories.required = rules.rules.required.length;
        summary.totalRules += rules.rules.required.length;
    }

    // Count complexity rules
    if (rules.rules.complexity) {
        summary.categories.complexity = Object.keys(rules.rules.complexity).length;
        summary.totalRules += Object.keys(rules.rules.complexity).length;
    }

    // Count security rules
    if (rules.rules.security) {
        summary.categories.security = Object.values(rules.rules.security).filter(v => v === true).length;
        summary.totalRules += summary.categories.security;
    }

    // Count team standards
    if (rules.teamStandards) {
        summary.categories.teamStandards = Object.values(rules.teamStandards).filter(v => v === true).length;
        summary.totalRules += summary.categories.teamStandards;
    }

    return { rules, summary };
}

/**
 * Display rule violations in a formatted way
 * @param {Array} violations - Array of violations
 */
export function displayViolations(violations) {
    if (violations.length === 0) {
        console.log(pc.green('✓ No rule violations found!'));
        return;
    }

    console.log(pc.yellow(`\n⚠️  Found ${violations.length} rule violation(s):\n`));

    const groupedByFile = violations.reduce((acc, violation) => {
        if (!acc[violation.file]) {
            acc[violation.file] = [];
        }
        acc[violation.file].push(violation);
        return acc;
    }, {});

    for (const [file, fileViolations] of Object.entries(groupedByFile)) {
        console.log(pc.cyan(`\n${file}:`));
        
        for (const violation of fileViolations) {
            const icon = violation.severity === 'error' ? '❌' : 
                        violation.severity === 'warn' ? '⚠️' : 'ℹ️';
            const color = violation.severity === 'error' ? pc.red : 
                         violation.severity === 'warn' ? pc.yellow : pc.blue;
            
            console.log(`  ${icon} ${color(`[${violation.severity.toUpperCase()}]`)} ${violation.message}`);
            
            if (violation.occurrences) {
                console.log(`     Found ${violation.occurrences} occurrence(s)`);
            }
        }
    }

    console.log('');
}
