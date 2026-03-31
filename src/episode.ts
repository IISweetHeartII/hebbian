// hebbian — Episode Logging (Circular Buffer)
//
// Writes events to hippocampus/session_log/ as memoryN.neuron files.
// Circular buffer: max 100 entries. When full, overwrites oldest.
//
// Port from: NeuronFS/runtime/main.go lines 1300-1342

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MAX_EPISODES = 100;
const SESSION_LOG_DIR = 'hippocampus/session_log';

export interface Episode {
	ts: string;
	type: string;
	path: string;
	detail: string;
}

/**
 * Log an episode to the hippocampus session log.
 * Circular buffer — writes to memoryN.neuron, wraps at MAX_EPISODES.
 */
export function logEpisode(brainRoot: string, type: string, path: string, detail: string): void {
	const logDir = join(brainRoot, SESSION_LOG_DIR);
	if (!existsSync(logDir)) {
		mkdirSync(logDir, { recursive: true });
	}

	const nextSlot = getNextSlot(logDir);
	const episode: Episode = {
		ts: new Date().toISOString(),
		type,
		path,
		detail,
	};

	writeFileSync(
		join(logDir, `memory${nextSlot}.neuron`),
		JSON.stringify(episode),
		'utf8',
	);
}

/**
 * Read all episodes from the session log, sorted by timestamp.
 */
export function readEpisodes(brainRoot: string): Episode[] {
	const logDir = join(brainRoot, SESSION_LOG_DIR);
	if (!existsSync(logDir)) return [];

	const episodes: Episode[] = [];
	let entries;
	try {
		entries = readdirSync(logDir);
	} catch {
		return [];
	}

	for (const entry of entries) {
		if (!entry.startsWith('memory') || !entry.endsWith('.neuron')) continue;
		try {
			const content = readFileSync(join(logDir, entry), 'utf8');
			if (content.trim()) {
				episodes.push(JSON.parse(content) as Episode);
			}
		} catch {
			// skip malformed entries
		}
	}

	episodes.sort((a, b) => a.ts.localeCompare(b.ts));
	return episodes;
}

/**
 * Find the next circular buffer slot (1-based, wraps at MAX_EPISODES).
 */
function getNextSlot(logDir: string): number {
	let maxSlot = 0;
	try {
		for (const entry of readdirSync(logDir)) {
			if (entry.startsWith('memory') && entry.endsWith('.neuron')) {
				const n = parseInt(entry.replace('memory', '').replace('.neuron', ''), 10);
				if (!isNaN(n) && n > maxSlot) maxSlot = n;
			}
		}
	} catch {}

	const next = maxSlot + 1;
	// Wrap around: if we exceed max, start overwriting from 1
	return next > MAX_EPISODES ? ((maxSlot % MAX_EPISODES) + 1) : next;
}
