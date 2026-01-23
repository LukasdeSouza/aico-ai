import fs from 'fs';
import pc from 'picocolors';

/**
 * Format issues for CI/CD output
 */

/**
 * Generate JSON output format
 * @param {Array} issues - Array of issues
 * @param {Object} metadata - Metadata about the review
 * @returns {string} JSON string
 */
export function formatJSON(issues, metadata = {}) {
    const summary = {
        totalIssues: issues.length,
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warn' || i.severity === 'warning').length,
        info: issues.filter(i => i.severity === 'info').length
    };

    const formattedIssues = issues.map(issue => ({
        file: issue.file,
        line: issue.line || null,
        column: issue.column || null,
        severity: issue.severity,
        message: issue.issue || issue.message,
        suggestion: issue.suggestion || null,
        rule: issue.rule || issue.type || 'unknown'
    }));

    const output = {
        summary,
        issues: formattedIssues,
        metadata: {
            timestamp: new Date().toISOString(),
            duration: metadata.duration || null,
            provider: metadata.provider || null,
            model: metadata.model || null,
            version: metadata.version || '1.0.16'
        }
    };

    return JSON.stringify(output, null, 2);
}

/**
 * Generate XML output format (JUnit compatible)
 * @param {Array} issues - Array of issues
 * @param {Object} metadata - Metadata about the review
 * @returns {string} XML string
 */
export function formatXML(issues, metadata = {}) {
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warn' || i.severity === 'warning');
    const totalTests = issues.length;
    const failures = errors.length;
    const skipped = warnings.length;

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<testsuites>\n';
    xml += `  <testsuite name="aico-review" tests="${totalTests}" failures="${failures}" errors="0" skipped="${skipped}" time="${metadata.duration || 0}">\n`;

    // Group issues by file
    const issuesByFile = issues.reduce((acc, issue) => {
        const file = issue.file || 'unknown';
        if (!acc[file]) acc[file] = [];
        acc[file].push(issue);
        return acc;
    }, {});

    for (const [file, fileIssues] of Object.entries(issuesByFile)) {
        for (const issue of fileIssues) {
            xml += `    <testcase name="${escapeXml(file)}" classname="code-review">\n`;
            
            if (issue.severity === 'error') {
                xml += `      <failure message="${escapeXml(issue.issue || issue.message)}" type="${escapeXml(issue.rule || issue.type || 'error')}">\n`;
                xml += `        File: ${escapeXml(file)}\n`;
                if (issue.line) xml += `        Line: ${issue.line}\n`;
                xml += `        ${escapeXml(issue.issue || issue.message)}\n`;
                if (issue.suggestion) xml += `        Suggestion: ${escapeXml(issue.suggestion)}\n`;
                xml += `      </failure>\n`;
            } else if (issue.severity === 'warn' || issue.severity === 'warning') {
                xml += `      <skipped message="${escapeXml(issue.issue || issue.message)}" />\n`;
            }
            
            xml += `    </testcase>\n`;
        }
    }

    xml += '  </testsuite>\n';
    xml += '</testsuites>';

    return xml;
}

/**
 * Generate GitHub Actions annotations format
 * @param {Array} issues - Array of issues
 * @returns {string} Annotations string
 */
export function formatGitHubActions(issues) {
    let output = '';
    
    for (const issue of issues) {
        const file = issue.file || 'unknown';
        const line = issue.line || 1;
        const message = issue.issue || issue.message;
        const severity = issue.severity === 'error' ? 'error' : 'warning';
        
        // GitHub Actions annotation format
        output += `::${severity} file=${file},line=${line}::${message}\n`;
    }
    
    return output;
}

/**
 * Generate plain text summary
 * @param {Array} issues - Array of issues
 * @param {Object} metadata - Metadata about the review
 * @returns {string} Plain text summary
 */
export function formatText(issues, metadata = {}) {
    const summary = {
        totalIssues: issues.length,
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warn' || i.severity === 'warning').length,
        info: issues.filter(i => i.severity === 'info').length
    };

    let output = '\n=== Aico Code Review Summary ===\n\n';
    output += `Total Issues: ${summary.totalIssues}\n`;
    output += `  Errors: ${summary.errors}\n`;
    output += `  Warnings: ${summary.warnings}\n`;
    output += `  Info: ${summary.info}\n\n`;

    if (issues.length > 0) {
        output += '=== Issues ===\n\n';
        
        // Group by file
        const issuesByFile = issues.reduce((acc, issue) => {
            const file = issue.file || 'unknown';
            if (!acc[file]) acc[file] = [];
            acc[file].push(issue);
            return acc;
        }, {});

        for (const [file, fileIssues] of Object.entries(issuesByFile)) {
            output += `${file}:\n`;
            for (const issue of fileIssues) {
                const icon = issue.severity === 'error' ? '[ERROR]' : 
                            issue.severity === 'warn' || issue.severity === 'warning' ? '[WARN]' : '[INFO]';
                output += `  ${icon} ${issue.issue || issue.message}\n`;
                if (issue.suggestion) {
                    output += `    Suggestion: ${issue.suggestion}\n`;
                }
            }
            output += '\n';
        }
    }

    if (metadata.duration) {
        output += `Duration: ${metadata.duration.toFixed(2)}s\n`;
    }

    return output;
}

/**
 * Save output to file
 * @param {string} content - Content to save
 * @param {string} filepath - Path to save to
 */
export function saveToFile(content, filepath) {
    try {
        fs.writeFileSync(filepath, content, 'utf-8');
        return true;
    } catch (error) {
        console.error(pc.red(`Error saving to file ${filepath}:`), error.message);
        return false;
    }
}

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&apos;');
}

/**
 * Determine exit code based on issues and options
 * @param {Array} issues - Array of issues
 * @param {Object} options - Options (failOnError, failOnWarn, severity)
 * @returns {number} Exit code (0 = success, 1 = failure)
 */
export function getExitCode(issues, options = {}) {
    const { failOnError = false, failOnWarn = false, severity = null } = options;

    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warn' || i.severity === 'warning').length;

    // If severity filter is set, only check that severity
    if (severity === 'error' && errors > 0) {
        return 1;
    }
    if (severity === 'warn' && warnings > 0) {
        return 1;
    }

    // Check fail-on options
    if (failOnError && errors > 0) {
        return 1;
    }
    if (failOnWarn && (warnings > 0 || errors > 0)) {
        return 1;
    }

    return 0;
}

/**
 * Filter issues by severity
 * @param {Array} issues - Array of issues
 * @param {string} severity - Severity to filter by (error, warn, info)
 * @returns {Array} Filtered issues
 */
export function filterBySeverity(issues, severity) {
    if (!severity) return issues;
    
    const severityMap = {
        'error': ['error'],
        'warn': ['warn', 'warning'],
        'warning': ['warn', 'warning'],
        'info': ['info']
    };

    const allowedSeverities = severityMap[severity.toLowerCase()] || [severity.toLowerCase()];
    return issues.filter(issue => allowedSeverities.includes(issue.severity));
}
