import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setupTestBrain, plantBomb, markDormant, addDopamine, addContra, addMemory } from './fixtures/setup';
import { scanBrain } from '../src/scanner';
import { REGIONS } from '../src/constants';

describe('scanBrain', () => {
	it('detects all 7 regions', () => {
		const { root } = setupTestBrain();
		const brain = scanBrain(root);
		expect(brain.regions.length).toBe(7);
		const names = brain.regions.map((r: any) => r.name);
		for (const region of REGIONS) {
			expect(names).toContain(region);
		}
	});

	it('regions are sorted by priority P0→P6', () => {
		const { root } = setupTestBrain();
		const brain = scanBrain(root);
		for (let i = 0; i < brain.regions.length; i++) {
			expect(brain.regions[i].priority).toBe(i);
		}
	});

	it('counts neurons per region', () => {
		const { root } = setupTestBrain();
		const brain = scanBrain(root);
		const byName = Object.fromEntries(brain.regions.map((r: any) => [r.name, r]));

		expect(byName.brainstem.neurons.length).toBe(3);
		expect(byName.limbic.neurons.length).toBe(2);
		expect(byName.hippocampus.neurons.length).toBe(2);
		expect(byName.sensors.neurons.length).toBe(2);
		expect(byName.cortex.neurons.length).toBe(2);
		expect(byName.ego.neurons.length).toBe(2);
		expect(byName.prefrontal.neurons.length).toBe(2);
	});

	it('parses neuron counter from N.neuron filename', () => {
		const { root } = setupTestBrain();
		const brain = scanBrain(root);
		const brainstem = brain.regions.find((r: any) => r.name === 'brainstem');
		const fallback = brainstem.neurons.find((n: any) => n.name === '禁fallback');
		expect(fallback.counter).toBe(103);
	});

	it('parses contra from N.contra filename', () => {
		const { root } = setupTestBrain();
		addContra(root, 'cortex/frontend/禁console_log', 5);
		const brain = scanBrain(root);
		const cortex = brain.regions.find((r: any) => r.name === 'cortex');
		const n = cortex.neurons.find((n: any) => n.name === '禁console_log');
		expect(n.contra).toBe(5);
		expect(n.intensity).toBe(40 - 5 + 0);
	});

	it('parses dopamine from dopamineN.neuron', () => {
		const { root } = setupTestBrain();
		addDopamine(root, 'cortex/frontend/禁console_log', 3);
		const brain = scanBrain(root);
		const cortex = brain.regions.find((r: any) => r.name === 'cortex');
		const n = cortex.neurons.find((n: any) => n.name === '禁console_log');
		expect(n.dopamine).toBe(3);
	});

	it('detects memory signal', () => {
		const { root } = setupTestBrain();
		addMemory(root, 'hippocampus/error_patterns', 2);
		const brain = scanBrain(root);
		const hippo = brain.regions.find((r: any) => r.name === 'hippocampus');
		const n = hippo.neurons.find((n: any) => n.name === 'error_patterns');
		expect(n.hasMemory).toBe(true);
	});

	it('detects bomb.neuron', () => {
		const { root } = setupTestBrain();
		plantBomb(root, 'brainstem/禁fallback');
		const brain = scanBrain(root);
		const brainstem = brain.regions.find((r: any) => r.name === 'brainstem');
		expect(brainstem.hasBomb).toBe(true);
		const n = brainstem.neurons.find((n: any) => n.name === '禁fallback');
		expect(n.hasBomb).toBe(true);
	});

	it('detects dormant neurons', () => {
		const { root } = setupTestBrain();
		markDormant(root, 'cortex/frontend/禁console_log');
		const brain = scanBrain(root);
		const cortex = brain.regions.find((r: any) => r.name === 'cortex');
		const n = cortex.neurons.find((n: any) => n.name === '禁console_log');
		expect(n.isDormant).toBe(true);
	});

	it('computes polarity correctly', () => {
		const { root } = setupTestBrain();
		addContra(root, 'cortex/frontend/禁console_log', 10);
		addDopamine(root, 'cortex/frontend/禁console_log', 5);
		const brain = scanBrain(root);
		const cortex = brain.regions.find((r: any) => r.name === 'cortex');
		const n = cortex.neurons.find((n: any) => n.name === '禁console_log');
		// counter=40, contra=10, dopamine=5 → intensity=35, total=55
		expect(n.intensity).toBe(35);
		expect(n.polarity > 0.63 && n.polarity < 0.65).toBeTruthy();
	});

	it('reads .axon cross-region connections', () => {
		const { root } = setupTestBrain();
		const brain = scanBrain(root);
		const brainstem = brain.regions.find((r: any) => r.name === 'brainstem');
		expect(brainstem.axons).toContain('limbic');
		const limbic = brain.regions.find((r: any) => r.name === 'limbic');
		expect(limbic.axons).toContain('brainstem');
	});

	it('handles empty brain gracefully', () => {
		const root = mkdtempSync(join(tmpdir(), 'hebb-empty-'));
		const brain = scanBrain(root);
		expect(brain.regions.length).toBe(7);
		for (const region of brain.regions) {
			expect(region.neurons.length).toBe(0);
		}
	});

	it('ignores directories starting with _ or .', () => {
		const { root } = setupTestBrain();
		mkdirSync(join(root, 'cortex', '_internal'), { recursive: true });
		writeFileSync(join(root, 'cortex', '_internal', '5.neuron'), '');
		mkdirSync(join(root, 'cortex', '.hidden'), { recursive: true });
		writeFileSync(join(root, 'cortex', '.hidden', '5.neuron'), '');

		const brain = scanBrain(root);
		const cortex = brain.regions.find((r: any) => r.name === 'cortex');
		const names = cortex.neurons.map((n: any) => n.name);
		expect(names).not.toContain('_internal');
		expect(names).not.toContain('.hidden');
	});

	it('ignores non-region top-level folders', () => {
		const { root } = setupTestBrain();
		mkdirSync(join(root, 'random_folder'), { recursive: true });
		writeFileSync(join(root, 'random_folder', '10.neuron'), '');

		const brain = scanBrain(root);
		expect(brain.regions.length).toBe(7);
		const names = brain.regions.map((r: any) => r.name);
		expect(names).not.toContain('random_folder');
	});

	it('tracks depth within region', () => {
		const { root } = setupTestBrain();
		const brain = scanBrain(root);
		const cortex = brain.regions.find((r: any) => r.name === 'cortex');
		const n = cortex.neurons.find((n: any) => n.name === '禁console_log');
		expect(n.depth).toBe(2);
		const m = cortex.neurons.find((n: any) => n.name === 'plan_then_execute');
		expect(m.depth).toBe(2);
	});
});
