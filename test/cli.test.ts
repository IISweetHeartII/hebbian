import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI = join(import.meta.dirname, '..', 'dist', 'bin', 'hebbian.js');

function run(args: string[], opts: Record<string, any> = {}): string {
	return execFileSync('node', [CLI, ...args], {
		encoding: 'utf8',
		timeout: 10000,
		...opts,
	});
}

describe('CLI', () => {
	it('--help shows usage', () => {
		const output = run(['--help']);
		expect(output).toContain('hebbian');
		expect(output).toContain('COMMANDS');
		expect(output).toContain('init');
		expect(output).toContain('emit');
		expect(output).toContain('fire');
		expect(output).toContain('grow');
	});

	it('--version shows version', () => {
		const output = run(['--version']);
		expect(output).toContain('hebbian v');
	});

	it('no command shows help', () => {
		const output = run([]);
		expect(output).toContain('COMMANDS');
	});

	it('unknown command exits with error', () => {
		expect(() => run(['nonexistent'])).toThrow();
	});

	it('init creates 7 region directories', () => {
		const dir = mkdtempSync(join(tmpdir(), 'hebb-cli-init-'));
		const brainDir = join(dir, 'brain');
		run(['init', brainDir]);

		const regions = ['brainstem', 'limbic', 'hippocampus', 'sensors', 'cortex', 'ego', 'prefrontal'];
		for (const r of regions) {
			expect(existsSync(join(brainDir, r))).toBeTruthy();
			expect(existsSync(join(brainDir, r, '_rules.md'))).toBeTruthy();
		}
	});

	it('grow creates a neuron', () => {
		const dir = mkdtempSync(join(tmpdir(), 'hebb-cli-grow-'));
		const brainDir = join(dir, 'brain');
		run(['init', brainDir]);

		const output = run(['grow', 'cortex/backend/禁raw_sql', '--brain', brainDir]);
		expect(output).toContain('grew');
		expect(existsSync(join(brainDir, 'cortex/backend/禁raw_sql', '1.neuron'))).toBeTruthy();
	});

	it('fire increments counter', () => {
		const dir = mkdtempSync(join(tmpdir(), 'hebb-cli-fire-'));
		const brainDir = join(dir, 'brain');
		run(['init', brainDir]);
		run(['grow', 'cortex/test_rule', '--brain', brainDir]);

		const output = run(['fire', 'cortex/test_rule', '--brain', brainDir]);
		expect(output).toContain('fired');
		expect(existsSync(join(brainDir, 'cortex/test_rule', '2.neuron'))).toBeTruthy();
	});

	it('emit claude creates CLAUDE.md', () => {
		const dir = mkdtempSync(join(tmpdir(), 'hebb-cli-emit-'));
		const brainDir = join(dir, 'brain');
		run(['init', brainDir]);

		run(['emit', 'claude', '--brain', brainDir], { cwd: dir });
		expect(existsSync(join(dir, 'CLAUDE.md'))).toBeTruthy();
	});

	it('diag shows brain diagnostics', () => {
		const dir = mkdtempSync(join(tmpdir(), 'hebb-cli-diag-'));
		const brainDir = join(dir, 'brain');
		run(['init', brainDir]);

		const output = run(['diag', '--brain', brainDir]);
		expect(output).toContain('Brain Diagnostics');
		expect(output).toContain('brainstem');
	});

	it('rollback decrements counter', () => {
		const dir = mkdtempSync(join(tmpdir(), 'hebb-cli-rb-'));
		const brainDir = join(dir, 'brain');
		run(['init', brainDir]);
		run(['grow', 'cortex/test_rule', '--brain', brainDir]);
		run(['fire', 'cortex/test_rule', '--brain', brainDir]);
		// Now counter=2, rollback to 1
		const output = run(['rollback', 'cortex/test_rule', '--brain', brainDir]);
		expect(output).toContain('rollback');
	});

	it('signal adds dopamine', () => {
		const dir = mkdtempSync(join(tmpdir(), 'hebb-cli-sig-'));
		const brainDir = join(dir, 'brain');
		run(['init', brainDir]);
		run(['grow', 'cortex/test_rule', '--brain', brainDir]);

		const output = run(['signal', 'dopamine', 'cortex/test_rule', '--brain', brainDir]);
		expect(output).toContain('dopamine');
		expect(existsSync(join(brainDir, 'cortex/test_rule', 'dopamine1.neuron'))).toBeTruthy();
	});

	it('decay runs dormancy sweep', () => {
		const dir = mkdtempSync(join(tmpdir(), 'hebb-cli-decay-'));
		const brainDir = join(dir, 'brain');
		run(['init', brainDir]);

		const output = run(['decay', '--days', '0', '--brain', brainDir]);
		expect(output).toContain('decay');
	});

	it('dedup runs batch merge', () => {
		const dir = mkdtempSync(join(tmpdir(), 'hebb-cli-dedup-'));
		const brainDir = join(dir, 'brain');
		run(['init', brainDir]);

		const output = run(['dedup', '--brain', brainDir]);
		expect(output).toContain('dedup');
	});

	it('stats is alias for diag', () => {
		const dir = mkdtempSync(join(tmpdir(), 'hebb-cli-stats-'));
		const brainDir = join(dir, 'brain');
		run(['init', brainDir]);

		const output = run(['stats', '--brain', brainDir]);
		expect(output).toContain('Brain Diagnostics');
	});

	it('init warns when brain already exists', () => {
		const dir = mkdtempSync(join(tmpdir(), 'hebb-cli-reinit-'));
		const brainDir = join(dir, 'brain');
		run(['init', brainDir]);
		// Second init should warn
		const output = run(['init', brainDir]);
		expect(output).toContain('already exists');
	});

	it('missing arg for fire exits with error', () => {
		expect(() => run(['fire'])).toThrow();
	});

	it('missing arg for grow exits with error', () => {
		expect(() => run(['grow'])).toThrow();
	});

	it('missing arg for emit exits with error', () => {
		expect(() => run(['emit'])).toThrow();
	});

	it('missing arg for rollback exits with error', () => {
		expect(() => run(['rollback'])).toThrow();
	});

	it('missing arg for signal exits with error', () => {
		expect(() => run(['signal'])).toThrow();
	});

	it('missing arg for init exits with error', () => {
		expect(() => run(['init'])).toThrow();
	});
});
