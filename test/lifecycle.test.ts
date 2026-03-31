import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setupTestBrain, neuron } from './fixtures/setup';
import { fireNeuron, getCurrentCounter } from '../src/fire';
import { rollbackNeuron } from '../src/rollback';
import { signalNeuron } from '../src/signal';
import { growNeuron } from '../src/grow';
import { runDecay } from '../src/decay';

describe('fireNeuron', () => {
	it('increments counter from 40 to 41', () => {
		const { root } = setupTestBrain();
		const result = fireNeuron(root, 'cortex/frontend/禁console_log');
		expect(result).toBe(41);
		expect(existsSync(join(root, 'cortex/frontend/禁console_log', '41.neuron'))).toBeTruthy();
		expect(existsSync(join(root, 'cortex/frontend/禁console_log', '40.neuron'))).toBeFalsy();
	});

	it('auto-grows if neuron does not exist', () => {
		const { root } = setupTestBrain();
		const result = fireNeuron(root, 'cortex/new_rule');
		expect(result).toBe(1);
		expect(existsSync(join(root, 'cortex/new_rule', '1.neuron'))).toBeTruthy();
	});
});

describe('rollbackNeuron', () => {
	it('decrements counter from 40 to 39', () => {
		const { root } = setupTestBrain();
		const result = rollbackNeuron(root, 'cortex/frontend/禁console_log');
		expect(result).toBe(39);
		expect(existsSync(join(root, 'cortex/frontend/禁console_log', '39.neuron'))).toBeTruthy();
	});

	it('throws at minimum counter (1)', () => {
		const root = mkdtempSync(join(tmpdir(), 'hebb-rb-'));
		neuron(root, 'cortex/test_rule', 1);
		expect(() => rollbackNeuron(root, 'cortex/test_rule')).toThrow(/minimum/i);
	});

	it('throws for nonexistent neuron', () => {
		const { root } = setupTestBrain();
		expect(() => rollbackNeuron(root, 'cortex/nonexistent')).toThrow(/not found/i);
	});
});

describe('signalNeuron', () => {
	it('creates bomb.neuron', () => {
		const { root } = setupTestBrain();
		signalNeuron(root, 'cortex/frontend/禁console_log', 'bomb');
		expect(existsSync(join(root, 'cortex/frontend/禁console_log', 'bomb.neuron'))).toBeTruthy();
	});

	it('creates dopamineN.neuron', () => {
		const { root } = setupTestBrain();
		signalNeuron(root, 'cortex/frontend/禁console_log', 'dopamine');
		expect(existsSync(join(root, 'cortex/frontend/禁console_log', 'dopamine1.neuron'))).toBeTruthy();
	});

	it('creates memoryN.neuron', () => {
		const { root } = setupTestBrain();
		signalNeuron(root, 'cortex/frontend/禁console_log', 'memory');
		expect(existsSync(join(root, 'cortex/frontend/禁console_log', 'memory1.neuron'))).toBeTruthy();
	});

	it('increments signal level on repeated signals', () => {
		const { root } = setupTestBrain();
		signalNeuron(root, 'cortex/frontend/禁console_log', 'dopamine');
		signalNeuron(root, 'cortex/frontend/禁console_log', 'dopamine');
		expect(existsSync(join(root, 'cortex/frontend/禁console_log', 'dopamine1.neuron'))).toBeTruthy();
		expect(existsSync(join(root, 'cortex/frontend/禁console_log', 'dopamine2.neuron'))).toBeTruthy();
	});

	it('throws for invalid signal type', () => {
		const { root } = setupTestBrain();
		expect(
			() => signalNeuron(root, 'cortex/frontend/禁console_log', 'invalid'),
		).toThrow(/invalid signal type/i);
	});

	it('throws for nonexistent neuron', () => {
		const { root } = setupTestBrain();
		expect(
			() => signalNeuron(root, 'cortex/nonexistent', 'dopamine'),
		).toThrow(/not found/i);
	});
});

describe('growNeuron', () => {
	it('creates folder + 1.neuron', () => {
		const { root } = setupTestBrain();
		const result = growNeuron(root, 'cortex/backend/禁raw_sql');
		expect(result.action).toBe('grew');
		expect(result.counter).toBe(1);
		expect(existsSync(join(root, 'cortex/backend/禁raw_sql', '1.neuron'))).toBeTruthy();
	});

	it('fires existing neuron if already exists', () => {
		const { root } = setupTestBrain();
		const result = growNeuron(root, 'cortex/frontend/禁console_log');
		expect(result.action).toBe('fired');
		expect(result.counter).toBe(41);
	});

	it('consolidates similar neurons (Jaccard >= 0.6)', () => {
		const { root } = setupTestBrain();
		// "data_driven_approach" vs existing "data_driven" → jaccard=0.67
		const result = growNeuron(root, 'ego/tone/data_driven_approach');
		expect(result.action).toBe('fired');
		expect(result.path).toContain('data_driven');
	});

	it('throws for invalid region', () => {
		const { root } = setupTestBrain();
		expect(() => growNeuron(root, 'invalid_region/test')).toThrow(/invalid region/i);
	});
});

describe('runDecay', () => {
	it('marks old neurons as dormant', () => {
		const root = mkdtempSync(join(tmpdir(), 'hebb-decay-'));
		// Create neuron with old modification time (60 days ago)
		const neuronDir = join(root, 'cortex', 'old_rule');
		mkdirSync(neuronDir, { recursive: true });
		const neuronFile = join(neuronDir, '5.neuron');
		writeFileSync(neuronFile, '');
		const oldTime = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
		utimesSync(neuronFile, oldTime, oldTime);

		const { scanned, decayed } = runDecay(root, 30);
		expect(scanned).toBe(1);
		expect(decayed).toBe(1);
		expect(existsSync(join(neuronDir, 'decay.dormant'))).toBeTruthy();
	});

	it('skips already dormant neurons', () => {
		const root = mkdtempSync(join(tmpdir(), 'hebb-decay2-'));
		const neuronDir = join(root, 'cortex', 'old_rule');
		mkdirSync(neuronDir, { recursive: true });
		const neuronFile = join(neuronDir, '5.neuron');
		writeFileSync(neuronFile, '');
		writeFileSync(join(neuronDir, 'decay.dormant'), 'already dormant');
		const oldTime = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
		utimesSync(neuronFile, oldTime, oldTime);

		const { decayed } = runDecay(root, 30);
		expect(decayed).toBe(0);
	});

	it('keeps recently active neurons alive', () => {
		const { root } = setupTestBrain();
		// All neurons were just created (mtime = now)
		const { decayed } = runDecay(root, 30);
		expect(decayed).toBe(0);
	});
});
