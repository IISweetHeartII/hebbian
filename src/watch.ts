// hebbian — Watch Mode
//
// Watches the brain directory for filesystem changes and auto-recompiles
// all tiers when changes are detected. Uses hash-based change detection
// to avoid redundant writes.

import { watch } from 'node:fs';
import { scanBrain } from './scanner';
import { runSubsumption } from './subsumption';
import { writeAllTiers } from './emit';
import type { SubsumptionResult } from './types';

/**
 * Start watching a brain directory for changes.
 * Auto-recompiles tiers when neurons are added/modified/removed.
 */
export async function startWatch(brainRoot: string): Promise<void> {
	let lastHash = '';
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	/** Scan brain and recompile if state changed. */
	function recompile(): void {
		const brain = scanBrain(brainRoot);
		const result = runSubsumption(brain);
		const hash = computeHash(result);

		if (hash === lastHash) return;
		lastHash = hash;

		writeAllTiers(brainRoot, result, brain);
		const ts = new Date().toLocaleTimeString();
		console.log(`[${ts}] \u{1F504} recompiled — ${result.firedNeurons} neurons, activation ${result.totalCounter}${result.bombSource ? ` \u{1F4A3} BOMB: ${result.bombSource}` : ''}`);
	}

	// Initial compilation
	recompile();
	console.log(`\u{1F440} watching: ${brainRoot}`);
	console.log('   Press Ctrl+C to stop.\n');

	// Watch for filesystem changes
	try {
		const watcher = watch(brainRoot, { recursive: true }, (eventType, filename) => {
			if (!filename) return;
			// Ignore _index.md and _rules.md (our own output)
			if (filename.endsWith('_index.md') || filename.endsWith('_rules.md')) return;
			// Ignore hidden/internal
			if (filename.startsWith('.') || filename.includes('/_') || filename.includes('\\_')) return;

			// Debounce: wait 200ms after last change before recompiling
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(recompile, 200);
		});

		// Keep process alive
		await new Promise<void>((resolve) => {
			process.on('SIGINT', () => {
				watcher.close();
				console.log('\n\u{1F44B} watch stopped.');
				resolve();
			});
		});
	} catch (err: unknown) {
		if (err && typeof err === 'object' && 'code' in err && err.code === 'ERR_FEATURE_UNAVAILABLE_ON_PLATFORM') {
			console.error('Recursive fs.watch not supported on this platform. Use Node.js >= 22.');
		} else {
			throw err;
		}
	}
}

/**
 * Compute a simple hash from the subsumption result for change detection.
 */
function computeHash(result: SubsumptionResult): string {
	return `${result.firedNeurons}:${result.totalCounter}:${result.bombSource}:${result.activeRegions.length}`;
}
