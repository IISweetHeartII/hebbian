// hebbian — Git Snapshot
//
// Creates a git commit of the current brain state for audit trail.
// Only commits if there are changes.

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Create a git snapshot of the brain directory.
 */
export function gitSnapshot(brainRoot: string): boolean {
	// Check if brain is inside a git repo
	if (!existsSync(join(brainRoot, '.git'))) {
		// Try parent directories
		try {
			execSync('git rev-parse --is-inside-work-tree', { cwd: brainRoot, stdio: 'pipe' });
		} catch {
			console.log('\u{26A0}\uFE0F  Not a git repository. Run `git init` in the brain directory first.');
			return false;
		}
	}

	try {
		// Check for changes
		const status = execSync('git status --porcelain .', { cwd: brainRoot, encoding: 'utf8' });
		if (!status.trim()) {
			console.log('\u{2705} No changes to snapshot.');
			return false;
		}

		// Stage and commit
		execSync('git add .', { cwd: brainRoot, stdio: 'pipe' });
		const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
		execSync(`git commit -m "hebbian snapshot ${ts}"`, { cwd: brainRoot, stdio: 'pipe' });

		console.log(`\u{1F4F8} snapshot: committed brain state at ${ts}`);
		return true;
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`\u{274C} snapshot failed: ${message}`);
		return false;
	}
}
