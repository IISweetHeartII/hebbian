// hebbian — Governance Benchmark Tests
//
// Two axes:
//   SCC (Subsumption Cascade Correctness) — 20 scenarios
//   MLA (Memory Lifecycle Accuracy) — 15 scenarios
//
// Pass criteria: SCC >= 95%, MLA >= 90%

import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setupTestBrain, neuron, plantBomb, removeBomb, markDormant, addDopamine } from './fixtures/setup';
import { scanBrain } from '../src/scanner';
import { runSubsumption } from '../src/subsumption';
import { fireNeuron } from '../src/fire';
import { rollbackNeuron } from '../src/rollback';
import { growNeuron } from '../src/grow';
import { signalNeuron } from '../src/signal';
import { runDecay } from '../src/decay';
import { REGIONS } from '../src/constants';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCC: Subsumption Cascade Correctness (20 scenarios)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('SCC: Subsumption Cascade Correctness', () => {
	// S-01: No bomb → all 7 active
	it('S-01: no bomb → all 7 regions active', () => {
		const { root } = setupTestBrain();
		const result = runSubsumption(scanBrain(root));
		expect(result.activeRegions.length).toBe(7);
		expect(result.bombSource).toBe('');
	});

	// S-02 through S-08: bomb in each region
	for (let i = 0; i < REGIONS.length; i++) {
		const region = REGIONS[i];
		it(`S-0${i + 2}: bomb in ${region} → ${i} active regions`, () => {
			const { root } = setupTestBrain();
			// Plant bomb in a neuron in this region
			const brain = scanBrain(root);
			const r = brain.regions.find((r: any) => r.name === region);
			if (r.neurons.length > 0) {
				plantBomb(root, `${region}/${r.neurons[0].path}`);
			} else {
				plantBomb(root, `${region}/bomb_test`);
				neuron(root, `${region}/bomb_test`, 1);
			}
			const result = runSubsumption(scanBrain(root));
			expect(result.bombSource).toBe(region);
			expect(result.activeRegions.length).toBe(i);
		});
	}

	// S-09: bomb source identification
	it('S-09: bombSource correctly identifies the bombing region', () => {
		const { root } = setupTestBrain();
		plantBomb(root, 'hippocampus/error_patterns');
		const result = runSubsumption(scanBrain(root));
		expect(result.bombSource).toBe('hippocampus');
	});

	// S-10: P0 bomb → firedNeurons = 0
	it('S-10: P0 bomb → firedNeurons = 0', () => {
		const { root } = setupTestBrain();
		plantBomb(root, 'brainstem/禁fallback');
		const result = runSubsumption(scanBrain(root));
		expect(result.firedNeurons).toBe(0);
	});

	// S-11: bomb removed → full recovery
	it('S-11: bomb removed → full recovery', () => {
		const { root } = setupTestBrain();
		plantBomb(root, 'cortex/frontend/禁console_log');
		let result = runSubsumption(scanBrain(root));
		expect(result.bombSource).toBe('cortex');

		removeBomb(root, 'cortex/frontend/禁console_log');
		result = runSubsumption(scanBrain(root));
		expect(result.bombSource).toBe('');
		expect(result.activeRegions.length).toBe(7);
	});

	// S-12: dormant neurons excluded from firedNeurons
	it('S-12: dormant neurons excluded from fired count', () => {
		const { root } = setupTestBrain();
		markDormant(root, 'ego/tone/concise');
		const result = runSubsumption(scanBrain(root));
		expect(result.firedNeurons).toBe(14);
	});

	// S-13: dormant does NOT affect totalNeurons
	it('S-13: dormant does not change totalNeurons', () => {
		const { root } = setupTestBrain();
		markDormant(root, 'ego/tone/concise');
		const result = runSubsumption(scanBrain(root));
		expect(result.totalNeurons).toBe(15);
	});

	// S-14: empty brain → 0 active neurons, 7 active regions
	it('S-14: empty brain → 0 neurons, 7 regions', () => {
		const root = mkdtempSync(join(tmpdir(), 'hebb-scc14-'));
		const result = runSubsumption(scanBrain(root));
		expect(result.activeRegions.length).toBe(7);
		expect(result.firedNeurons).toBe(0);
	});

	// S-15: lower P (brainstem) suppresses higher P (prefrontal)
	it('S-15: subsumption order is P0→P6', () => {
		const { root } = setupTestBrain();
		const result = runSubsumption(scanBrain(root));
		expect(result.activeRegions[0].name).toBe('brainstem');
		expect(result.activeRegions[6].name).toBe('prefrontal');
	});

	// S-16: totalCounter sums only active non-dormant
	it('S-16: totalCounter sums active non-dormant only', () => {
		const { root } = setupTestBrain();
		markDormant(root, 'cortex/frontend/禁console_log'); // counter=40
		const result = runSubsumption(scanBrain(root));
		expect(result.totalCounter).toBe(621 - 40);
	});

	// S-17: bomb in P2 → P0, P1 active
	it('S-17: bomb in hippocampus → brainstem + limbic active', () => {
		const { root } = setupTestBrain();
		plantBomb(root, 'hippocampus/error_patterns');
		const result = runSubsumption(scanBrain(root));
		const active = result.activeRegions.map((r: any) => r.name);
		expect(active).toEqual(['brainstem', 'limbic']);
	});
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MLA: Memory Lifecycle Accuracy (15 scenarios)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('MLA: Memory Lifecycle Accuracy', () => {
	// M-01: fire increments counter
	it('M-01: fire increments counter (40 → 41)', () => {
		const { root } = setupTestBrain();
		const result = fireNeuron(root, 'cortex/frontend/禁console_log');
		expect(result).toBe(41);
	});

	// M-02: rollback decrements counter
	it('M-02: rollback decrements counter (40 → 39)', () => {
		const { root } = setupTestBrain();
		const result = rollbackNeuron(root, 'cortex/frontend/禁console_log');
		expect(result).toBe(39);
	});

	// M-03: rollback minimum boundary (counter=1)
	it('M-03: rollback enforces minimum counter=1', () => {
		const root = mkdtempSync(join(tmpdir(), 'hebb-mla3-'));
		neuron(root, 'cortex/test', 1);
		expect(() => rollbackNeuron(root, 'cortex/test')).toThrow(/minimum/i);
	});

	// M-04: grow creates counter=1
	it('M-04: grow creates neuron with counter=1', () => {
		const { root } = setupTestBrain();
		const result = growNeuron(root, 'cortex/new_concept');
		expect(result.counter).toBe(1);
		expect(result.action).toBe('grew');
	});

	// M-05: invalid region rejected
	it('M-05: invalid region rejected', () => {
		const { root } = setupTestBrain();
		expect(() => growNeuron(root, 'invalid_region/test')).toThrow(/invalid region/i);
	});

	// M-06: dopamine signal
	it('M-06: dopamine signal creates dopamine1.neuron', () => {
		const { root } = setupTestBrain();
		signalNeuron(root, 'cortex/frontend/禁console_log', 'dopamine');
		expect(existsSync(join(root, 'cortex/frontend/禁console_log', 'dopamine1.neuron'))).toBeTruthy();
	});

	// M-07: bomb signal
	it('M-07: bomb signal creates bomb.neuron', () => {
		const { root } = setupTestBrain();
		signalNeuron(root, 'cortex/frontend/禁console_log', 'bomb');
		expect(existsSync(join(root, 'cortex/frontend/禁console_log', 'bomb.neuron'))).toBeTruthy();
	});

	// M-08: memory signal
	it('M-08: memory signal creates memory1.neuron', () => {
		const { root } = setupTestBrain();
		signalNeuron(root, 'cortex/frontend/禁console_log', 'memory');
		expect(existsSync(join(root, 'cortex/frontend/禁console_log', 'memory1.neuron'))).toBeTruthy();
	});

	// M-09: bomb triggers cascade
	it('M-09: bomb signal triggers subsumption cascade', () => {
		const { root } = setupTestBrain();
		signalNeuron(root, 'cortex/frontend/禁console_log', 'bomb');
		const result = runSubsumption(scanBrain(root));
		expect(result.bombSource).toBe('cortex');
	});

	// M-10: unknown signal rejected
	it('M-10: unknown signal type rejected', () => {
		const { root } = setupTestBrain();
		expect(
			() => signalNeuron(root, 'cortex/frontend/禁console_log', 'invalid'),
		).toThrow(/invalid signal/i);
	});

	// M-11: dormant neuron excluded from firedNeurons
	it('M-11: dormant neuron excluded from fired count', () => {
		const { root } = setupTestBrain();
		markDormant(root, 'cortex/frontend/禁console_log');
		const result = runSubsumption(scanBrain(root));
		expect(result.firedNeurons).toBe(14);
	});

	// M-12: synaptic merge (Jaccard >= 0.6)
	it('M-12: similar neuron consolidated via Jaccard merge', () => {
		const { root } = setupTestBrain();
		const result = growNeuron(root, 'ego/tone/data_driven_approach');
		expect(result.action).toBe('fired');
	});

	// M-13: deduplication no-crash (grow existing)
	it('M-13: growing existing neuron fires instead', () => {
		const { root } = setupTestBrain();
		const result = growNeuron(root, 'cortex/frontend/禁console_log');
		expect(result.action).toBe('fired');
		expect(result.counter).toBe(41);
	});

	// M-14: decay marks dormant
	it('M-14: decay marks inactive neurons dormant', () => {
		const root = mkdtempSync(join(tmpdir(), 'hebb-mla14-'));
		const neuronDir = join(root, 'cortex', 'old_rule');
		mkdirSync(neuronDir, { recursive: true });
		const file = join(neuronDir, '5.neuron');
		writeFileSync(file, '');
		const oldTime = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
		utimesSync(file, oldTime, oldTime);

		const { decayed } = runDecay(root, 30);
		expect(decayed).toBe(1);
		expect(existsSync(join(neuronDir, 'decay.dormant'))).toBeTruthy();
	});

	// M-15: fire auto-grows nonexistent neuron
	it('M-15: fire auto-grows nonexistent neuron', () => {
		const { root } = setupTestBrain();
		const result = fireNeuron(root, 'cortex/brand_new_rule');
		expect(result).toBe(1);
		expect(existsSync(join(root, 'cortex/brand_new_rule', '1.neuron'))).toBeTruthy();
	});
});
