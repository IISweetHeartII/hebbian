// hebbian — Update Check
//
// Checks npm registry for newer versions. Cache-first with TTL.
// Designed for hook context: fast path (cache hit) is sync, slow path (fetch) is async.
//
// State files live in ~/.hebbian/:
//   last-update-check  — cached result + TTL
//   update-snoozed     — snooze state (version + level + epoch)

import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGE_NAME = 'hebbian';
const NPM_REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;
const FETCH_TIMEOUT_MS = 5000;

// Cache TTL in minutes
const TTL_UP_TO_DATE = 60;       // check again in 1 hour
const TTL_UPGRADE_AVAILABLE = 720; // keep nagging for 12 hours

// Snooze durations in seconds
const SNOOZE_DURATIONS: Record<number, number> = {
	1: 86400,   // 24h
	2: 172800,  // 48h
	3: 604800,  // 7d (and beyond)
};

export type UpdateStatus =
	| { type: 'upgrade_available'; current: string; latest: string }
	| { type: 'up_to_date' }
	| { type: 'skipped' };

/** Get hebbian state directory */
function getStateDir(): string {
	return join(process.env.HOME || '~', '.hebbian');
}

/** Ensure state directory exists */
function ensureStateDir(stateDir: string): void {
	if (!existsSync(stateDir)) {
		mkdirSync(stateDir, { recursive: true });
	}
}

/** Check if cache file is stale based on its type */
function isCacheStale(cachePath: string, type: 'UP_TO_DATE' | 'UPGRADE_AVAILABLE'): boolean {
	try {
		const mtime = statSync(cachePath).mtimeMs;
		const ageMinutes = (Date.now() - mtime) / 1000 / 60;
		const ttl = type === 'UP_TO_DATE' ? TTL_UP_TO_DATE : TTL_UPGRADE_AVAILABLE;
		return ageMinutes > ttl;
	} catch {
		return true;
	}
}

/** Read cached update status (sync, fast) */
function readCache(stateDir: string): { type: string; current?: string; latest?: string } | null {
	const cachePath = join(stateDir, 'last-update-check');
	if (!existsSync(cachePath)) return null;

	try {
		const line = readFileSync(cachePath, 'utf8').trim();

		if (line.startsWith('UP_TO_DATE')) {
			if (isCacheStale(cachePath, 'UP_TO_DATE')) return null;
			const ver = line.split(/\s+/)[1];
			return { type: 'UP_TO_DATE', current: ver };
		}

		if (line.startsWith('UPGRADE_AVAILABLE')) {
			if (isCacheStale(cachePath, 'UPGRADE_AVAILABLE')) return null;
			const [, current, latest] = line.split(/\s+/);
			return { type: 'UPGRADE_AVAILABLE', current, latest };
		}

		return null;
	} catch {
		return null;
	}
}

/** Write cache file */
function writeCache(stateDir: string, line: string): void {
	ensureStateDir(stateDir);
	writeFileSync(join(stateDir, 'last-update-check'), line, 'utf8');
}

/** Check if upgrade is snoozed */
function isSnoozed(stateDir: string, remoteVersion: string): boolean {
	const snoozePath = join(stateDir, 'update-snoozed');
	if (!existsSync(snoozePath)) return false;

	try {
		const [ver, levelStr, epochStr] = readFileSync(snoozePath, 'utf8').trim().split(/\s+/);
		if (ver !== remoteVersion) {
			// New version resets snooze
			unlinkSync(snoozePath);
			return false;
		}
		const level = parseInt(levelStr || '1', 10);
		const epoch = parseInt(epochStr || '0', 10);
		const now = Math.floor(Date.now() / 1000);
		const duration = SNOOZE_DURATIONS[Math.min(level, 3)] ?? SNOOZE_DURATIONS[3]!;
		return now < epoch + duration;
	} catch {
		return false;
	}
}

/** Fetch latest version from npm registry */
async function fetchLatestVersion(): Promise<string | null> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		const res = await fetch(NPM_REGISTRY_URL, {
			signal: controller.signal,
			headers: { Accept: 'application/json' },
		});
		clearTimeout(timeout);

		if (!res.ok) return null;
		const data = (await res.json()) as { version?: string };
		const version = data.version;
		if (!version || !/^\d+\.\d+[\d.]*$/.test(version)) return null;
		return version;
	} catch {
		return null;
	}
}

/**
 * Check for updates. Fast path uses cache (sync), slow path fetches npm registry.
 */
export async function checkForUpdates(currentVersion: string): Promise<UpdateStatus> {
	// Disabled via env
	if (process.env.HEBBIAN_UPDATE_CHECK === 'false') {
		return { type: 'skipped' };
	}

	const stateDir = getStateDir();

	// Fast path: cache hit
	const cached = readCache(stateDir);
	if (cached) {
		if (cached.type === 'UP_TO_DATE') {
			return { type: 'up_to_date' };
		}
		if (cached.type === 'UPGRADE_AVAILABLE' && cached.current && cached.latest) {
			if (cached.current === currentVersion && !isSnoozed(stateDir, cached.latest)) {
				return { type: 'upgrade_available', current: currentVersion, latest: cached.latest };
			}
		}
	}

	// Slow path: fetch from npm
	const latest = await fetchLatestVersion();
	if (!latest) {
		// Network failure — assume up to date, cache briefly
		writeCache(stateDir, `UP_TO_DATE ${currentVersion}`);
		return { type: 'up_to_date' };
	}

	if (latest === currentVersion) {
		writeCache(stateDir, `UP_TO_DATE ${currentVersion}`);
		return { type: 'up_to_date' };
	}

	// New version available
	writeCache(stateDir, `UPGRADE_AVAILABLE ${currentVersion} ${latest}`);

	if (isSnoozed(stateDir, latest)) {
		return { type: 'up_to_date' };
	}

	return { type: 'upgrade_available', current: currentVersion, latest };
}

/** Format update notification for terminal output */
export function formatUpdateBanner(status: UpdateStatus): string | null {
	if (status.type !== 'upgrade_available') return null;
	return [
		``,
		`  ⚡ hebbian v${status.latest} available (current: v${status.current})`,
		`     npm i -g hebbian@latest`,
		``,
	].join('\n');
}
