import { describe, it, expect } from 'vitest';
import { setupTestBrain, plantBomb, removeBomb, markDormant } from './fixtures/setup';
import { scanBrain } from '../src/scanner';
import { runSubsumption } from '../src/subsumption';

describe('runSubsumption', () => {
	it('all regions active when no bomb', () => {
		const { root } = setupTestBrain();
		const brain = scanBrain(root);
		const result = runSubsumption(brain);

		expect(result.activeRegions.length).toBe(7);
		expect(result.blockedRegions.length).toBe(0);
		expect(result.bombSource).toBe('');
	});

	it('P0 (brainstem) bomb blocks ALL regions', () => {
		const { root } = setupTestBrain();
		plantBomb(root, 'brainstem/禁fallback');
		const brain = scanBrain(root);
		const result = runSubsumption(brain);

		expect(result.bombSource).toBe('brainstem');
		expect(result.activeRegions.length).toBe(0);
		expect(result.blockedRegions.length).toBe(7);
	});

	it('P1 (limbic) bomb → only brainstem active', () => {
		const { root } = setupTestBrain();
		plantBomb(root, 'limbic/dopamine_reward');
		const brain = scanBrain(root);
		const result = runSubsumption(brain);

		expect(result.bombSource).toBe('limbic');
		expect(result.activeRegions.length).toBe(1);
		expect(result.activeRegions[0].name).toBe('brainstem');
		expect(result.blockedRegions.length).toBe(6);
	});

	it('P3 (sensors) bomb → P0-P2 active, P3-P6 blocked', () => {
		const { root } = setupTestBrain();
		plantBomb(root, 'sensors/environment/macos');
		const brain = scanBrain(root);
		const result = runSubsumption(brain);

		expect(result.bombSource).toBe('sensors');
		expect(result.activeRegions.length).toBe(3);
		const activeNames = result.activeRegions.map((r: any) => r.name);
		expect(activeNames).toEqual(['brainstem', 'limbic', 'hippocampus']);
		expect(result.blockedRegions.length).toBe(4);
	});

	it('P4 (cortex) bomb → P0-P3 active', () => {
		const { root } = setupTestBrain();
		plantBomb(root, 'cortex/frontend/禁console_log');
		const brain = scanBrain(root);
		const result = runSubsumption(brain);

		expect(result.bombSource).toBe('cortex');
		expect(result.activeRegions.length).toBe(4);
		const activeNames = result.activeRegions.map((r: any) => r.name);
		expect(activeNames).toEqual(['brainstem', 'limbic', 'hippocampus', 'sensors']);
	});

	it('P5 (ego) bomb → P0-P4 active', () => {
		const { root } = setupTestBrain();
		plantBomb(root, 'ego/tone/concise');
		const brain = scanBrain(root);
		const result = runSubsumption(brain);

		expect(result.bombSource).toBe('ego');
		expect(result.activeRegions.length).toBe(5);
	});

	it('P6 (prefrontal) bomb → P0-P5 active', () => {
		const { root } = setupTestBrain();
		plantBomb(root, 'prefrontal/project/hebbian_release');
		const brain = scanBrain(root);
		const result = runSubsumption(brain);

		expect(result.bombSource).toBe('prefrontal');
		expect(result.activeRegions.length).toBe(6);
	});

	it('counts firedNeurons (non-dormant only)', () => {
		const { root } = setupTestBrain();
		const brain = scanBrain(root);
		const result = runSubsumption(brain);

		// 15 total neurons, all non-dormant
		expect(result.firedNeurons).toBe(15);
		expect(result.totalNeurons).toBe(15);
	});

	it('excludes dormant neurons from firedNeurons and totalCounter', () => {
		const { root } = setupTestBrain();
		markDormant(root, 'cortex/frontend/禁console_log');
		const brain = scanBrain(root);
		const result = runSubsumption(brain);

		expect(result.firedNeurons).toBe(14); // 15 - 1 dormant
		expect(result.totalNeurons).toBe(15); // total count unchanged
	});

	it('sums totalCounter from active non-dormant neurons', () => {
		const { root } = setupTestBrain();
		const brain = scanBrain(root);
		const result = runSubsumption(brain);

		// Sum all counters: 103+100+100+50+30+20+15+10+5+40+25+60+45+10+8 = 621
		expect(result.totalCounter).toBe(621);
	});

	it('bomb removed → full recovery', () => {
		const { root } = setupTestBrain();
		plantBomb(root, 'brainstem/禁fallback');

		// Verify bomb blocks
		let brain = scanBrain(root);
		let result = runSubsumption(brain);
		expect(result.bombSource).toBe('brainstem');
		expect(result.activeRegions.length).toBe(0);

		// Remove bomb
		removeBomb(root, 'brainstem/禁fallback');
		brain = scanBrain(root);
		result = runSubsumption(brain);
		expect(result.bombSource).toBe('');
		expect(result.activeRegions.length).toBe(7);
	});

	it('identifies correct bombSource', () => {
		const { root } = setupTestBrain();
		plantBomb(root, 'hippocampus/error_patterns');
		const brain = scanBrain(root);
		const result = runSubsumption(brain);
		expect(result.bombSource).toBe('hippocampus');
	});
});
