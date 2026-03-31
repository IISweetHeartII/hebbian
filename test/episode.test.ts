import { describe, it, expect } from 'vitest';
import { mkdtempSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setupTestBrain } from './fixtures/setup';
import { logEpisode, readEpisodes } from '../src/episode';

describe('episode logging', () => {
	it('creates session_log directory on first log', () => {
		const { root } = setupTestBrain();
		logEpisode(root, 'grow', 'cortex/test', 'test detail');
		expect(existsSync(join(root, 'hippocampus/session_log'))).toBe(true);
	});

	it('writes memoryN.neuron files', () => {
		const { root } = setupTestBrain();
		// setupTestBrain creates hippocampus/session_log with 15.neuron
		// episode logger writes memory1, memory2 starting after existing max slot
		logEpisode(root, 'grow', 'cortex/test1', 'first');
		logEpisode(root, 'fire', 'cortex/test2', 'second');

		const logDir = join(root, 'hippocampus/session_log');
		const files = readdirSync(logDir).filter((f) => f.startsWith('memory') && f.endsWith('.neuron'));
		expect(files.length).toBe(2);
		expect(files).toContain('memory1.neuron');
		expect(files).toContain('memory2.neuron');
	});

	it('writes valid JSON episode content', () => {
		const { root } = setupTestBrain();
		logEpisode(root, 'signal', 'brainstem/NO_fallback', 'bombed');

		const content = readFileSync(join(root, 'hippocampus/session_log/memory1.neuron'), 'utf8');
		const episode = JSON.parse(content);
		expect(episode.type).toBe('signal');
		expect(episode.path).toBe('brainstem/NO_fallback');
		expect(episode.detail).toBe('bombed');
		expect(episode.ts).toBeTruthy();
	});

	it('readEpisodes returns sorted episodes', () => {
		const { root } = setupTestBrain();
		logEpisode(root, 'grow', 'cortex/a', 'first');
		logEpisode(root, 'fire', 'cortex/b', 'second');
		logEpisode(root, 'signal', 'cortex/c', 'third');

		const episodes = readEpisodes(root);
		expect(episodes.length).toBe(3);
		expect(episodes[0].type).toBe('grow');
		expect(episodes[2].type).toBe('signal');
	});

	it('readEpisodes returns empty array for missing log dir', () => {
		const root = mkdtempSync(join(tmpdir(), 'hebb-empty-'));
		const episodes = readEpisodes(root);
		expect(episodes.length).toBe(0);
	});

	it('circular buffer wraps at 100', () => {
		const { root } = setupTestBrain();
		// Write 101 episodes
		for (let i = 0; i < 101; i++) {
			logEpisode(root, 'fire', `cortex/n${i}`, `entry ${i}`);
		}

		const logDir = join(root, 'hippocampus/session_log');
		const files = readdirSync(logDir).filter((f) => f.startsWith('memory') && f.endsWith('.neuron'));
		// 100 memory slots, 101st overwrites slot 1
		expect(files.length).toBe(100);

		// memory1.neuron should contain the 101st entry (overwritten)
		const content = readFileSync(join(logDir, 'memory1.neuron'), 'utf8');
		const episode = JSON.parse(content);
		expect(episode.detail).toBe('entry 100');
	});
});
