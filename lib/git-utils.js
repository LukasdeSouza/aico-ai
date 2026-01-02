import { simpleGit } from 'simple-git';

const git = simpleGit();

/**
 * Gets the diff of staged changes.
 * @returns {Promise<string>} The git diff string.
 */
export async function getStagedDiff() {
    try {
        return await git.diff(['--cached']);
    } catch (error) {
        console.error('Error getting staged diff:', error);
        return '';
    }
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

import fs from 'fs';

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
