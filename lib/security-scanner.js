import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import pc from 'picocolors';

/**
 * Security vulnerability scanner
 * Integrates with npm audit, yarn audit, pnpm audit
 * Scans code for common security issues
 */

/**
 * Detect package manager
 * @returns {string} Package manager name (npm, yarn, pnpm)
 */
export function detectPackageManager() {
    if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm';
    if (fs.existsSync('yarn.lock')) return 'yarn';
    if (fs.existsSync('package-lock.json')) return 'npm';
    return 'npm'; // default
}

/**
 * Run dependency vulnerability scan
 * @param {string} packageManager - Package manager to use
 * @returns {Object} Scan results
 */
export function scanDependencies(packageManager = null) {
    const pm = packageManager || detectPackageManager();
    const vulnerabilities = [];

    try {
        let auditCommand;
        let parseFunction;

        switch (pm) {
            case 'npm':
                auditCommand = 'npm audit --json';
                parseFunction = parseNpmAudit;
                break;
            case 'yarn':
                auditCommand = 'yarn audit --json';
                parseFunction = parseYarnAudit;
                break;
            case 'pnpm':
                auditCommand = 'pnpm audit --json';
                parseFunction = parsePnpmAudit;
                break;
            default:
                throw new Error(`Unknown package manager: ${pm}`);
        }

        const output = execSync(auditCommand, { 
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const parsed = parseFunction(output);
        vulnerabilities.push(...parsed);

    } catch (error) {
        // npm audit returns non-zero exit code when vulnerabilities found
        if (error.stdout) {
            try {
                const parsed = parseNpmAudit(error.stdout);
                vulnerabilities.push(...parsed);
            } catch (parseError) {
                console.error('Error parsing audit output:', parseError.message);
            }
        }
    }

    return {
        packageManager: pm,
        vulnerabilities,
        summary: {
            total: vulnerabilities.length,
            critical: vulnerabilities.filter(v => v.severity === 'critical').length,
            high: vulnerabilities.filter(v => v.severity === 'high').length,
            moderate: vulnerabilities.filter(v => v.severity === 'moderate').length,
            low: vulnerabilities.filter(v => v.severity === 'low').length
        }
    };
}

/**
 * Parse npm audit output
 * @param {string} output - JSON output from npm audit
 * @returns {Array} Vulnerabilities
 */
function parseNpmAudit(output) {
    const vulnerabilities = [];
    
    try {
        const data = JSON.parse(output);
        
        // npm audit v7+ format
        if (data.vulnerabilities) {
            for (const [packageName, vuln] of Object.entries(data.vulnerabilities)) {
                vulnerabilities.push({
                    package: packageName,
                    severity: vuln.severity,
                    title: vuln.via?.[0]?.title || 'Unknown vulnerability',
                    cve: vuln.via?.[0]?.cve || null,
                    url: vuln.via?.[0]?.url || null,
                    range: vuln.range,
                    fixAvailable: vuln.fixAvailable ? true : false,
                    fixVersion: vuln.fixAvailable?.version || null
                });
            }
        }
        // npm audit v6 format
        else if (data.advisories) {
            for (const advisory of Object.values(data.advisories)) {
                vulnerabilities.push({
                    package: advisory.module_name,
                    severity: advisory.severity,
                    title: advisory.title,
                    cve: advisory.cves?.[0] || null,
                    url: advisory.url,
                    range: advisory.vulnerable_versions,
                    fixAvailable: advisory.patched_versions !== '<0.0.0',
                    fixVersion: advisory.patched_versions
                });
            }
        }
    } catch (error) {
        console.error('Error parsing npm audit:', error.message);
    }

    return vulnerabilities;
}

/**
 * Parse yarn audit output
 * @param {string} output - JSON output from yarn audit
 * @returns {Array} Vulnerabilities
 */
function parseYarnAudit(output) {
    const vulnerabilities = [];
    
    try {
        const lines = output.trim().split('\n');
        for (const line of lines) {
            try {
                const data = JSON.parse(line);
                if (data.type === 'auditAdvisory' && data.data?.advisory) {
                    const advisory = data.data.advisory;
                    vulnerabilities.push({
                        package: advisory.module_name,
                        severity: advisory.severity,
                        title: advisory.title,
                        cve: advisory.cves?.[0] || null,
                        url: advisory.url,
                        range: advisory.vulnerable_versions,
                        fixAvailable: advisory.patched_versions !== '<0.0.0',
                        fixVersion: advisory.patched_versions
                    });
                }
            } catch (e) {
                // Skip invalid JSON lines
                continue;
            }
        }
    } catch (error) {
        console.error('Error parsing yarn audit:', error.message);
    }

    return vulnerabilities;
}

/**
 * Parse pnpm audit output
 * @param {string} output - JSON output from pnpm audit
 * @returns {Array} Vulnerabilities
 */
function parsePnpmAudit(output) {
    const vulnerabilities = [];
    
    try {
        const data = JSON.parse(output);
        
        if (data.advisories) {
            for (const advisory of Object.values(data.advisories)) {
                vulnerabilities.push({
                    package: advisory.module_name,
                    severity: advisory.severity,
                    title: advisory.title,
                    cve: advisory.cves?.[0] || null,
                    url: advisory.url,
                    range: advisory.vulnerable_versions,
                    fixAvailable: advisory.patched_versions !== '<0.0.0',
                    fixVersion: advisory.patched_versions
                });
            }
        }
    } catch (error) {
        console.error('Error parsing pnpm audit:', error.message);
    }

    return vulnerabilities;
}

/**
 * Scan code for security vulnerabilities
 * @param {string} content - File content to scan
 * @param {string} filePath - File path
 * @returns {Array} Security issues found
 */
export function scanCode(content, filePath) {
    const issues = [];

    // 1. Hardcoded secrets (API keys, tokens, passwords)
    const secretPatterns = [
        {
            pattern: /(?:api[_-]?key|apikey|api[_-]?secret|access[_-]?token|auth[_-]?token|secret[_-]?key)[\s]*[=:]\s*['"]([^'"]{20,})['"]|['"]([A-Za-z0-9_\-]{32,})['"](?=\s*[;,)])/gi,
            message: 'Potential hardcoded API key or secret detected',
            severity: 'critical',
            cwe: 'CWE-798'
        },
        {
            pattern: /password[\s]*[=:]\s*['"](?!.*\$\{|.*process\.env)[^'"]{3,}['"]/gi,
            message: 'Hardcoded password detected',
            severity: 'critical',
            cwe: 'CWE-798'
        },
        {
            pattern: /(?:private[_-]?key|secret[_-]?key)[\s]*[=:]\s*['"][^'"]{20,}['"]/gi,
            message: 'Hardcoded private key detected',
            severity: 'critical',
            cwe: 'CWE-798'
        }
    ];

    // 2. SQL Injection vulnerabilities
    const sqlPatterns = [
        {
            pattern: /(?:execute|query|exec)\s*\(\s*['"`].*?\$\{|(?:execute|query|exec)\s*\(\s*.*?\+\s*.*?\)/gi,
            message: 'Potential SQL injection vulnerability - use parameterized queries',
            severity: 'high',
            cwe: 'CWE-89'
        },
        {
            pattern: /(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE).*?(?:\$\{|`\$\{|\+\s*\w+)/gi,
            message: 'SQL query with string concatenation - potential SQL injection',
            severity: 'high',
            cwe: 'CWE-89'
        }
    ];

    // 3. XSS vulnerabilities
    const xssPatterns = [
        {
            pattern: /\.innerHTML\s*=\s*(?!['"`])[^;]+/gi,
            message: 'Potential XSS vulnerability - innerHTML with dynamic content',
            severity: 'high',
            cwe: 'CWE-79'
        },
        {
            pattern: /dangerouslySetInnerHTML\s*=\s*\{\{/gi,
            message: 'Using dangerouslySetInnerHTML - ensure content is sanitized',
            severity: 'moderate',
            cwe: 'CWE-79'
        },
        {
            pattern: /document\.write\s*\(/gi,
            message: 'document.write() can lead to XSS vulnerabilities',
            severity: 'moderate',
            cwe: 'CWE-79'
        }
    ];

    // 4. Command Injection
    const commandPatterns = [
        {
            pattern: /(?:exec|spawn|execSync|spawnSync)\s*\([^)]*(?:\$\{|`\$\{|\+)/gi,
            message: 'Potential command injection - avoid dynamic command execution',
            severity: 'critical',
            cwe: 'CWE-78'
        },
        {
            pattern: /child_process\.exec\([^)]*\+/gi,
            message: 'Command injection risk with string concatenation',
            severity: 'critical',
            cwe: 'CWE-78'
        }
    ];

    // 5. Path Traversal
    const pathPatterns = [
        {
            pattern: /(?:readFile|writeFile|unlink|rmdir|mkdir)\s*\([^)]*(?:\$\{|`\$\{|\+).*?\.\.\/|(?:readFile|writeFile|unlink|rmdir|mkdir)\s*\([^)]*req\./gi,
            message: 'Potential path traversal vulnerability',
            severity: 'high',
            cwe: 'CWE-22'
        }
    ];

    // 6. Insecure Cryptography
    const cryptoPatterns = [
        {
            pattern: /crypto\.createCipher\(/gi,
            message: 'Deprecated crypto.createCipher() - use crypto.createCipheriv() instead',
            severity: 'moderate',
            cwe: 'CWE-327'
        },
        {
            pattern: /md5|sha1(?!.*hmac)/gi,
            message: 'Weak cryptographic algorithm (MD5/SHA1) - use SHA-256 or better',
            severity: 'moderate',
            cwe: 'CWE-327'
        }
    ];

    // 7. Insecure Random
    const randomPatterns = [
        {
            pattern: /Math\.random\(\)/gi,
            message: 'Math.random() is not cryptographically secure - use crypto.randomBytes()',
            severity: 'low',
            cwe: 'CWE-338'
        }
    ];

    // 8. Eval usage
    const evalPatterns = [
        {
            pattern: /\beval\s*\(/gi,
            message: 'eval() usage detected - major security risk',
            severity: 'critical',
            cwe: 'CWE-95'
        },
        {
            pattern: /new\s+Function\s*\(/gi,
            message: 'new Function() is similar to eval() - security risk',
            severity: 'high',
            cwe: 'CWE-95'
        }
    ];

    // 9. Insecure Deserialization
    const deserializationPatterns = [
        {
            pattern: /JSON\.parse\([^)]*req\./gi,
            message: 'Parsing user input directly - validate before parsing',
            severity: 'moderate',
            cwe: 'CWE-502'
        }
    ];

    // 10. SSRF vulnerabilities
    const ssrfPatterns = [
        {
            pattern: /(?:fetch|axios|request|http\.get|https\.get)\s*\([^)]*(?:\$\{|`\$\{|req\.)/gi,
            message: 'Potential SSRF vulnerability - validate URLs before making requests',
            severity: 'high',
            cwe: 'CWE-918'
        }
    ];

    // Combine all patterns
    const allPatterns = [
        ...secretPatterns,
        ...sqlPatterns,
        ...xssPatterns,
        ...commandPatterns,
        ...pathPatterns,
        ...cryptoPatterns,
        ...randomPatterns,
        ...evalPatterns,
        ...deserializationPatterns,
        ...ssrfPatterns
    ];

    // Scan content
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        for (const { pattern, message, severity, cwe } of allPatterns) {
            pattern.lastIndex = 0; // Reset regex
            if (pattern.test(line)) {
                issues.push({
                    file: filePath,
                    line: i + 1,
                    severity,
                    message,
                    cwe,
                    type: 'code-vulnerability',
                    code: line.trim()
                });
            }
        }
    }

    return issues;
}

/**
 * Scan configuration files for security issues
 * @returns {Array} Configuration issues
 */
export function scanConfiguration() {
    const issues = [];

    // Check for exposed .env files
    if (fs.existsSync('.env')) {
        const gitignore = fs.existsSync('.gitignore') ? fs.readFileSync('.gitignore', 'utf-8') : '';
        if (!gitignore.includes('.env')) {
            issues.push({
                file: '.env',
                severity: 'critical',
                message: '.env file not in .gitignore - secrets may be exposed',
                cwe: 'CWE-540',
                type: 'configuration',
                suggestion: 'Add .env to .gitignore'
            });
        }
    }

    // Check for debug mode in production configs
    const configFiles = ['config.js', 'config.json', '.env', 'package.json'];
    for (const file of configFiles) {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf-8');
            if (/debug\s*[=:]\s*true|NODE_ENV\s*[=:]\s*['"]development['"]/gi.test(content)) {
                issues.push({
                    file,
                    severity: 'moderate',
                    message: 'Debug mode or development environment detected in config',
                    cwe: 'CWE-489',
                    type: 'configuration',
                    suggestion: 'Ensure debug mode is disabled in production'
                });
            }
        }
    }

    return issues;
}

/**
 * Display security scan results
 * @param {Object} results - Scan results
 */
export function displaySecurityResults(results) {
    const { dependencies, code, configuration, summary } = results;

    console.log(pc.bold(pc.blue('\n🛡️  Security Scan Results\n')));

    // Dependencies
    if (dependencies && dependencies.vulnerabilities.length > 0) {
        console.log(pc.bold('Dependencies:'));
        for (const vuln of dependencies.vulnerabilities.slice(0, 10)) {
            const icon = vuln.severity === 'critical' ? '🔴' : 
                        vuln.severity === 'high' ? '❌' : 
                        vuln.severity === 'moderate' ? '⚠️' : 'ℹ️';
            
            console.log(`  ${icon} ${pc.bold(vuln.package)} - ${vuln.severity.toUpperCase()}`);
            console.log(`     ${vuln.title}`);
            if (vuln.cve) console.log(`     ${pc.dim('CVE:')} ${vuln.cve}`);
            if (vuln.fixAvailable) {
                console.log(`     ${pc.green('Fix:')} Update to ${vuln.fixVersion || 'latest version'}`);
            }
            console.log();
        }
        
        if (dependencies.vulnerabilities.length > 10) {
            console.log(`  ${pc.dim(`... and ${dependencies.vulnerabilities.length - 10} more`)}\n`);
        }
    }

    // Code vulnerabilities
    if (code && code.length > 0) {
        console.log(pc.bold('Code Issues:'));
        const grouped = code.reduce((acc, issue) => {
            if (!acc[issue.file]) acc[issue.file] = [];
            acc[issue.file].push(issue);
            return acc;
        }, {});

        for (const [file, fileIssues] of Object.entries(grouped)) {
            console.log(`  ${pc.cyan(file)}:`);
            for (const issue of fileIssues.slice(0, 5)) {
                const icon = issue.severity === 'critical' ? '🔴' : 
                            issue.severity === 'high' ? '❌' : 
                            issue.severity === 'moderate' ? '⚠️' : 'ℹ️';
                
                console.log(`    ${icon} Line ${issue.line}: ${issue.message}`);
                if (issue.cwe) console.log(`       ${pc.dim(issue.cwe)}`);
            }
            if (fileIssues.length > 5) {
                console.log(`    ${pc.dim(`... and ${fileIssues.length - 5} more in this file`)}`);
            }
            console.log();
        }
    }

    // Configuration issues
    if (configuration && configuration.length > 0) {
        console.log(pc.bold('Configuration Issues:'));
        for (const issue of configuration) {
            const icon = issue.severity === 'critical' ? '🔴' : 
                        issue.severity === 'high' ? '❌' : 
                        issue.severity === 'moderate' ? '⚠️' : 'ℹ️';
            
            console.log(`  ${icon} ${issue.file}`);
            console.log(`     ${issue.message}`);
            if (issue.suggestion) {
                console.log(`     ${pc.green('Suggestion:')} ${issue.suggestion}`);
            }
            console.log();
        }
    }

    // Summary
    console.log(pc.bold('Summary:'));
    console.log(`  Total Issues: ${summary.total}`);
    if (summary.critical > 0) console.log(`  ${pc.red('Critical:')} ${summary.critical}`);
    if (summary.high > 0) console.log(`  ${pc.red('High:')} ${summary.high}`);
    if (summary.moderate > 0) console.log(`  ${pc.yellow('Moderate:')} ${summary.moderate}`);
    if (summary.low > 0) console.log(`  ${pc.blue('Low:')} ${summary.low}`);
    console.log();
}

/**
 * Generate security report
 * @param {Object} results - Scan results
 * @returns {Object} Report data
 */
export function generateSecurityReport(results) {
    const { dependencies, code, configuration, summary } = results;

    return {
        timestamp: new Date().toISOString(),
        summary,
        dependencies: dependencies?.vulnerabilities || [],
        codeVulnerabilities: code || [],
        configurationIssues: configuration || [],
        recommendations: generateRecommendations(results)
    };
}

/**
 * Generate security recommendations
 * @param {Object} results - Scan results
 * @returns {Array} Recommendations
 */
function generateRecommendations(results) {
    const recommendations = [];

    if (results.summary.critical > 0) {
        recommendations.push('🔴 CRITICAL: Address critical vulnerabilities immediately');
    }

    if (results.dependencies?.vulnerabilities.length > 0) {
        recommendations.push('Update vulnerable dependencies to patched versions');
    }

    if (results.code?.some(i => i.cwe === 'CWE-798')) {
        recommendations.push('Remove hardcoded secrets and use environment variables');
    }

    if (results.code?.some(i => i.cwe === 'CWE-89')) {
        recommendations.push('Use parameterized queries to prevent SQL injection');
    }

    if (results.code?.some(i => i.cwe === 'CWE-79')) {
        recommendations.push('Sanitize user input to prevent XSS attacks');
    }

    if (results.configuration?.length > 0) {
        recommendations.push('Review and secure configuration files');
    }

    return recommendations;
}
