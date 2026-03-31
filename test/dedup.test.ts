import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { neuron } from './fixtures/setup';
import { runDedup } from '../src/dedup';

describe('runDedup', () => {
	it('merges similar neurons in same region', () => {
		const root = mkdtempSync(join(tmpdir(), 'hebb-dedup-'));
		// Create two similar neurons: "data_driven" and "data_driven_approach"
		neuron(root, 'ego/tone/data_driven', 10);
		neuron(root, 'ego/tone/data_driven_approach', 3);

		const { scanned, merged } = runDedup(root);
		expect(scanned >= 2).toBeTruthy();
		expect(merged).toBe(1);
		// The lower-counter one should be marked dormant
		expect(existsSync(join(root, 'ego/tone/data_driven_approach', 'dedup.dormant'))).toBeTruthy();
	});

	it('does not merge dissimilar neurons', () => {
		const root = mkdtempSync(join(tmpdir(), 'hebb-dedup2-'));
		neuron(root, 'cortex/frontend/禁console_log', 40);
		neuron(root, 'cortex/methodology/plan_then_execute', 25);

		const { merged } = runDedup(root);
		expect(merged).toBe(0);
	});

	it('handles empty brain', () => {
		const root = mkdtempSync(join(tmpdir(), 'hebb-dedup3-'));
		const { scanned, merged } = runDedup(root);
		expect(scanned).toBe(0);
		expect(merged).toBe(0);
	});
});
