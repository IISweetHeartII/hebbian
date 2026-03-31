import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkForUpdates, formatUpdateBanner } from '../src/update-check';

function makeTempDir(): string {
	const dir = mkdtempSync(join(tmpdir(), 'hebb-update-'));
	return dir;
}

describe('update-check', () => {
	describe('formatUpdateBanner', () => {
		it('returns banner for upgrade_available', () => {
			const banner = formatUpdateBanner({
				type: 'upgrade_available',
				current: '0.3.0',
				latest: '0.4.0',
			});
			expect(banner).toContain('v0.4.0');
			expect(banner).toContain('v0.3.0');
			expect(banner).toContain('npm i -g hebbian@latest');
		});

		it('returns null for up_to_date', () => {
			expect(formatUpdateBanner({ type: 'up_to_date' })).toBeNull();
		});

		it('returns null for skipped', () => {
			expect(formatUpdateBanner({ type: 'skipped' })).toBeNull();
		});
	});

	describe('checkForUpdates', () => {
		it('respects HEBBIAN_UPDATE_CHECK=false', async () => {
			const prev = process.env.HEBBIAN_UPDATE_CHECK;
			process.env.HEBBIAN_UPDATE_CHECK = 'false';
			try {
				const status = await checkForUpdates('0.3.2');
				expect(status.type).toBe('skipped');
			} finally {
				if (prev === undefined) delete process.env.HEBBIAN_UPDATE_CHECK;
				else process.env.HEBBIAN_UPDATE_CHECK = prev;
			}
		});

		it('returns up_to_date when cache says UP_TO_DATE', async () => {
			const stateDir = makeTempDir();
			const prev = process.env.HOME;
			// Redirect state dir by setting HOME
			const fakeHome = makeTempDir();
			const hebbianDir = join(fakeHome, '.hebbian');
			mkdirSync(hebbianDir, { recursive: true });
			writeFileSync(join(hebbianDir, 'last-update-check'), 'UP_TO_DATE 0.3.2', 'utf8');

			process.env.HOME = fakeHome;
			try {
				const status = await checkForUpdates('0.3.2');
				expect(status.type).toBe('up_to_date');
			} finally {
				process.env.HOME = prev;
			}
		});

		it('returns upgrade_available from cache', async () => {
			const fakeHome = makeTempDir();
			const hebbianDir = join(fakeHome, '.hebbian');
			mkdirSync(hebbianDir, { recursive: true });
			writeFileSync(join(hebbianDir, 'last-update-check'), 'UPGRADE_AVAILABLE 0.3.2 0.4.0', 'utf8');

			const prev = process.env.HOME;
			process.env.HOME = fakeHome;
			try {
				const status = await checkForUpdates('0.3.2');
				expect(status.type).toBe('upgrade_available');
				if (status.type === 'upgrade_available') {
					expect(status.latest).toBe('0.4.0');
				}
			} finally {
				process.env.HOME = prev;
			}
		});
	});
});
