import pc from 'picocolors';

/**
 * Parses the AI response into a structured format.
 * @param {string} response 
 * @returns {Array<{file: string, issue: string, suggestion: string}>}
 */
export function parseAIResponse(response) {
    const issues = [];
    const blocks = response.split(/File: /i).filter(block => block.trim() !== '');

    for (const block of blocks) {
        const lines = block.split('\n');
        const file = lines[0]?.trim();
        const issueMatch = block.match(/Issue: (.*)/i);
        const suggestionMatch = block.match(/Suggestion: (.*)/i);

        if (file && issueMatch && suggestionMatch) {
            issues.push({
                file,
                issue: issueMatch[1].trim(),
                suggestion: suggestionMatch[1].trim(),
            });
        }
    }

    return issues;
}

/**
 * Displays the issues to the user in a formatted way.
 * @param {Array<{file: string, issue: string, suggestion: string}>} issues 
 */
export function displayIssues(issues) {
    if (issues.length === 0) {
        console.log(pc.green('No issues found. Good job!'));
        return;
    }

    console.log(pc.yellow(`Found ${issues.length} potential issues:\n`));

    issues.forEach((issue, index) => {
        console.log(pc.cyan(`--------------------------------------------------`));
        console.log(`${pc.bold('File:')} ${issue.file}`);
        console.log(`${pc.bold('Issue:')} ${issue.issue}`);
        console.log(`${pc.bold('Suggestion:')} ${issue.suggestion}`);
    });
    console.log(pc.cyan(`--------------------------------------------------\n`));
}
