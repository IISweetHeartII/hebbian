import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { setupTestBrain } from './fixtures/setup';
import {
	growCandidate,
	promoteCandidates,
	listCandidates,
	toCandidatePath,
	fromCandidatePath,
	CANDIDATE_THRESHOLD,
} from '../src/candidates';
import { growNeuron } from '../src/grow';

describe('toCandidatePath / fromCandidatePath', () => {
	it('converts neuron path to candidate path', () => {
		expect(toCandidatePath('cortex/NO_console_log')).toBe('cortex/_candidates/NO_console_log');
	});

	it('handles nested neuron paths', () => {
		expect(toCandidatePath('cortex/frontend/NO_eval')).toBe('cortex/_candidates/frontend/NO_eval');
	});

	it('roundtrips correctly', () => {
		const path = 'cortex/NO_console_log';
		expect(fromCandidatePath(toCandidatePath(path))).toBe(path);
	});

	it('throws on missing region separator', () => {
		expect(() => toCandidatePath('NO_console_log')).toThrow('Invalid neuron path');
	});
});

describe('growCandidate', () => {
	it('creates neuron under _candidates/ instead of directly in region', () => {
		const { root } = setupTestBrain();
		growCandidate(root, 'cortex/NO_test_candidate');

		const candidateDir = join(root, 'cortex', '_candidates', 'NO_test_candidate');
		const permanentDir = join(root, 'cortex', 'NO_test_candidate');

		expect(existsSync(candidateDir)).toBe(true);
		expect(existsSync(permanentDir)).toBe(false);
	});

	it('starts at counter=1 and increments on subsequent calls', () => {
		const { root } = setupTestBrain();

		const r1 = growCandidate(root, 'cortex/NO_incrementable');
		expect(r1.counter).toBe(1);
		expect(r1.promoted).toBe(false);

		const r2 = growCandidate(root, 'cortex/NO_incrementable');
		expect(r2.counter).toBe(2);
		expect(r2.promoted).toBe(false);
	});

	it(`promotes to permanent region at counter=${CANDIDATE_THRESHOLD}`, () => {
		const { root } = setupTestBrain();
		const neuronPath = 'cortex/NO_will_graduate';

		growCandidate(root, neuronPath); // 1
		growCandidate(root, neuronPath); // 2
		const result = growCandidate(root, neuronPath); // 3 → promote

		expect(result.promoted).toBe(true);
		expect(existsSync(join(root, 'cortex', 'NO_will_graduate'))).toBe(true);
		expect(existsSync(join(root, 'cortex', '_candidates', 'NO_will_graduate'))).toBe(false);
	});

	it('returns promoted path after graduation', () => {
		const { root } = setupTestBrain();
		growCandidate(root, 'cortex/NO_path_check');
		growCandidate(root, 'cortex/NO_path_check');
		const result = growCandidate(root, 'cortex/NO_path_check');

		expect(result.path).toBe('cortex/NO_path_check');
	});

	it('does not create candidate if permanent neuron already exists', () => {
		const { root } = setupTestBrain();

		// Create permanent neuron first (direct grow, no staging)
		growNeuron(root, 'cortex/NO_console_log');

		// growCandidate with same path — permanent exists → fires it directly
		const result = growCandidate(root, 'cortex/NO_console_log');

		expect(existsSync(join(root, 'cortex', '_candidates', 'NO_console_log'))).toBe(false);
		expect(result.action).toBe('fired');
	});
});

describe('listCandidates', () => {
	it('returns empty array when no candidates exist', () => {
		const { root } = setupTestBrain();
		expect(listCandidates(root)).toHaveLength(0);
	});

	it('lists pending candidates with counter and path info', () => {
		const { root } = setupTestBrain();
		growCandidate(root, 'cortex/NO_listed_rule');
		growCandidate(root, 'cortex/NO_listed_rule');

		const candidates = listCandidates(root);
		expect(candidates).toHaveLength(1);
		expect(candidates[0]!.candidatePath).toBe('cortex/_candidates/NO_listed_rule');
		expect(candidates[0]!.targetPath).toBe('cortex/NO_listed_rule');
		expect(candidates[0]!.counter).toBe(2);
	});

	it('does not list graduated candidates', () => {
		const { root } = setupTestBrain();
		growCandidate(root, 'cortex/NO_graduated');
		growCandidate(root, 'cortex/NO_graduated');
		growCandidate(root, 'cortex/NO_graduated'); // promotes

		expect(listCandidates(root)).toHaveLength(0);
	});
});

describe('promoteCandidates', () => {
	it('promotes candidates at threshold', () => {
		const { root } = setupTestBrain();
		growCandidate(root, 'cortex/NO_ready');
		growCandidate(root, 'cortex/NO_ready');
		growCandidate(root, 'cortex/NO_ready'); // already promoted inline

		// Another approach: manually create a candidate at threshold
		const candidateDir = join(root, 'cortex', '_candidates', 'NO_manual');
		mkdirSync(candidateDir, { recursive: true });
		writeFileSync(join(candidateDir, '1.neuron'), '');
		writeFileSync(join(candidateDir, '2.neuron'), '');
		writeFileSync(join(candidateDir, '3.neuron'), '');

		const result = promoteCandidates(root);
		expect(result.promoted).toContain('cortex/NO_manual');
		expect(existsSync(join(root, 'cortex', 'NO_manual'))).toBe(true);
	});

	it('returns empty results when no candidates need promotion', () => {
		const { root } = setupTestBrain();
		growCandidate(root, 'cortex/NO_not_ready'); // counter=1, not at threshold

		const result = promoteCandidates(root);
		expect(result.promoted).toHaveLength(0);
		expect(result.decayed).toHaveLength(0);
	});
});
