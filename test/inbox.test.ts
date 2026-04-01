import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setupTestBrain } from './fixtures/setup';
import { processInbox, ensureInbox, appendCorrection, type Correction } from '../src/inbox';
import { getCurrentCounter } from '../src/fire';

function writeInbox(root: string, lines: string[]): void {
	const dir = join(root, '_inbox');
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'corrections.jsonl'), lines.join('\n'), 'utf8');
}

describe('inbox processing', () => {
	it('returns zero counts when no inbox exists', () => {
		const { root } = setupTestBrain();
		const result = processInbox(root);
		expect(result.processed).toBe(0);
		expect(result.skipped).toBe(0);
	});

	it('returns zero counts when inbox is empty', () => {
		const { root } = setupTestBrain();
		writeInbox(root, []);
		const result = processInbox(root);
		expect(result.processed).toBe(0);
	});

	it('grows new neuron as candidate (not permanent) from correction', () => {
		const { root } = setupTestBrain();
		writeInbox(root, [
			JSON.stringify({ ts: new Date().toISOString(), type: 'correction', text: 'test', path: 'cortex/new_rule', counter_add: 1, author: 'user' }),
		]);
		const result = processInbox(root);
		expect(result.processed).toBe(1);
		// New neurons go to _candidates/ — not directly to the region
		expect(existsSync(join(root, 'cortex/_candidates/new_rule'))).toBe(true);
		expect(existsSync(join(root, 'cortex/new_rule'))).toBe(false);
	});

	it('fires existing neuron from correction', () => {
		const { root } = setupTestBrain();
		const before = getCurrentCounter(join(root, 'cortex/frontend/禁console_log'));
		writeInbox(root, [
			JSON.stringify({ ts: new Date().toISOString(), type: 'correction', text: 'fire it', path: 'cortex/frontend/禁console_log', counter_add: 2, author: 'user' }),
		]);
		const result = processInbox(root);
		expect(result.processed).toBe(1);
		const after = getCurrentCounter(join(root, 'cortex/frontend/禁console_log'));
		expect(after).toBe(before + 2);
	});

	it('processes multiple corrections', () => {
		const { root } = setupTestBrain();
		writeInbox(root, [
			JSON.stringify({ ts: new Date().toISOString(), type: 'correction', text: 'a', path: 'cortex/rule_a', counter_add: 1, author: 'user' }),
			JSON.stringify({ ts: new Date().toISOString(), type: 'correction', text: 'b', path: 'cortex/rule_b', counter_add: 1, author: 'user' }),
			JSON.stringify({ ts: new Date().toISOString(), type: 'correction', text: 'c', path: 'cortex/rule_c', counter_add: 1, author: 'user' }),
		]);
		const result = processInbox(root);
		expect(result.processed).toBe(3);
	});

	it('clears inbox after processing', () => {
		const { root } = setupTestBrain();
		writeInbox(root, [
			JSON.stringify({ ts: new Date().toISOString(), type: 'correction', text: 'test', path: 'cortex/new_rule', counter_add: 1, author: 'user' }),
		]);
		processInbox(root);
		const content = readFileSync(join(root, '_inbox/corrections.jsonl'), 'utf8');
		expect(content).toBe('');
	});

	it('skips malformed JSON lines', () => {
		const { root } = setupTestBrain();
		writeInbox(root, [
			'not valid json',
			JSON.stringify({ ts: new Date().toISOString(), type: 'correction', text: 'ok', path: 'cortex/good_rule', counter_add: 1, author: 'user' }),
		]);
		const result = processInbox(root);
		expect(result.processed).toBe(1);
		expect(result.skipped).toBe(1);
		expect(result.errors.length).toBe(1);
	});

	it('blocks path traversal attacks', () => {
		const { root } = setupTestBrain();
		writeInbox(root, [
			JSON.stringify({ ts: new Date().toISOString(), type: 'correction', text: 'hack', path: '../../../etc/passwd', counter_add: 1, author: 'user' }),
			JSON.stringify({ ts: new Date().toISOString(), type: 'correction', text: 'hack', path: 'cortex/../../secrets', counter_add: 1, author: 'user' }),
		]);
		const result = processInbox(root);
		expect(result.skipped).toBe(2);
		expect(result.processed).toBe(0);
	});

	it('blocks absolute paths', () => {
		const { root } = setupTestBrain();
		writeInbox(root, [
			JSON.stringify({ ts: new Date().toISOString(), type: 'correction', text: 'hack', path: '/etc/passwd', counter_add: 1, author: 'user' }),
		]);
		const result = processInbox(root);
		expect(result.skipped).toBe(1);
	});

	it('blocks invalid regions', () => {
		const { root } = setupTestBrain();
		writeInbox(root, [
			JSON.stringify({ ts: new Date().toISOString(), type: 'correction', text: 'bad', path: 'nonexistent_region/rule', counter_add: 1, author: 'user' }),
		]);
		const result = processInbox(root);
		expect(result.skipped).toBe(1);
	});

	it('blocks dopamine from non-admin authors', () => {
		const { root } = setupTestBrain();
		writeInbox(root, [
			JSON.stringify({ ts: new Date().toISOString(), type: 'correction', text: 'reward', path: 'cortex/frontend/禁console_log', counter_add: 1, author: 'user', dopamine: 1 }),
		]);
		processInbox(root);
		// Check no dopamine file was added — user doesn't have PM/admin role
		const files = require('node:fs').readdirSync(join(root, 'cortex/frontend/禁console_log'));
		const dopamineFiles = files.filter((f: string) => f.startsWith('dopamine'));
		expect(dopamineFiles.length).toBe(0);
	});

	it('allows dopamine from PM/admin roles', () => {
		const { root } = setupTestBrain();
		writeInbox(root, [
			JSON.stringify({ ts: new Date().toISOString(), type: 'correction', text: 'reward', path: 'cortex/frontend/禁console_log', counter_add: 1, author: 'pm', dopamine: 1 }),
		]);
		processInbox(root);
		const files = require('node:fs').readdirSync(join(root, 'cortex/frontend/禁console_log'));
		const dopamineFiles = files.filter((f: string) => f.startsWith('dopamine'));
		expect(dopamineFiles.length).toBe(1);
	});

	it('ensureInbox creates _inbox directory and file', () => {
		const { root } = setupTestBrain();
		const filePath = ensureInbox(root);
		expect(existsSync(filePath)).toBe(true);
		expect(readFileSync(filePath, 'utf8')).toBe('');
	});

	it('appendCorrection adds line to inbox', () => {
		const { root } = setupTestBrain();
		const correction: Correction = {
			ts: new Date().toISOString(),
			type: 'correction',
			text: 'test append',
			path: 'cortex/appended_rule',
			counter_add: 1,
			author: 'user',
		};
		appendCorrection(root, correction);
		const filePath = join(root, '_inbox/corrections.jsonl');
		const content = readFileSync(filePath, 'utf8');
		expect(content).toContain('appended_rule');
	});
});
