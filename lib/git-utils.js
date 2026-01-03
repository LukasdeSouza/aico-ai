import { simpleGit } from 'simple-git';
import pc from 'picocolors';
import fs from 'fs';

const git = simpleGit();

const MAX_DIFF_SIZE = 30000; // Conservative limit to leave room for AI response
const IGNORED_FILES = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb',
    '.env',
    '*.png', '*.jpg', '*.jpeg', '*.gif', '*.svg', '*.ico', // Images
    '*.pdf', '*.zip', '*.gz', '*.tar', // Binaries
    'dist/*', 'build/*', '.next/*', 'node_modules/*', // Build artifacts
    'prisma/migrations/*', // Database migrations
];

/**
 * Gets the diff of staged changes.
 * @returns {Promise<string>} The git diff string.
 */
export async function getStagedDiff() {
    try {
        // Filter out common large/binary files to save context
        const excludeArgs = IGNORED_FILES.map(file => `:(exclude)${file}`);
        let diff = await git.diff(['--cached', '--', '.', ...excludeArgs]);

        return diff;
    } catch (error) {
        console.error('Error getting staged diff:', error);
        return '';
    }
}

/**
 * Splits a giant diff string into smaller chunks based on file boundaries.
 * @param {string} diff 
 * @returns {string[]} An array of diff chunks.
 */
export function getDiffChunks(diff) {
    if (!diff) return [];

    // Split by the "diff --git" marker
    const files = diff.split(/^diff --git /m).filter(Boolean);
    const chunks = [];
    let currentChunk = '';

    for (const fileDiff of files) {
        const fullFileDiff = 'diff --git ' + fileDiff;

        // If adding this file exceeds the limit, start a new chunk
        if (currentChunk.length + fullFileDiff.length > MAX_DIFF_SIZE && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = fullFileDiff;
        } else {
            currentChunk += fullFileDiff;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

/**
 * Gets the diff between current branch and its upstream.
 * Useful for pre-push hook.
 * @returns {Promise<string>} The git diff string.
 */
export async function getPushDiff() {
    try {
        // This gets the diff between the current branch and its remote tracking branch
        return await git.diff(['@{u}..HEAD']);
    } catch (error) {
        // If no upstream is set, we might want to compare with a default branch or just return staged
        console.warn('No upstream branch found. Falling back to staged changes.');
        return await getStagedDiff();
    }
}

/**
 * Applies a suggested fix to a file.
 * @param {string} filePath 
 * @param {string} correctedCode 
 */
export async function applyFix(filePath, correctedCode) {
    try {
        // For now, we assume the AI provides the corrected version of the code it analyzed.
        // A more advanced version would use diffing/patching.
        // If the AI provides a snippet, we'd need to find and replace.
        // For this MVP, we'll just log that we are applying it.

        // Let's try a simple approach: if the file exists, we write the code.
        // WARNING: This is a simple overwrite for now.
        fs.writeFileSync(filePath, correctedCode);
        return true;
    } catch (error) {
        console.error(`Error applying fix to ${filePath}:`, error);
        return false;
    }
}
