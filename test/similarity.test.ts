import { describe, it, expect } from 'vitest';
import { tokenize, stem, jaccardSimilarity } from '../src/similarity';

describe('tokenize', () => {
	it('splits on underscores', () => {
		expect(tokenize('no_hardcoded_values')).toEqual(['no', 'hardcod', 'valu']);
	});

	it('splits camelCase', () => {
		expect(tokenize('noHardcodedValues')).toEqual(['no', 'hardcod', 'valu']);
	});

	it('drops single-char tokens', () => {
		const tokens = tokenize('a_big_test');
		expect(tokens).not.toContain('a');
	});

	it('lowercases everything', () => {
		const tokens = tokenize('HELLO_WORLD');
		expect(tokens.every((t: string) => t === t.toLowerCase())).toBeTruthy();
	});

	it('handles hanja prefixes', () => {
		const tokens = tokenize('禁console_log');
		expect(tokens).toContain('禁console');
	});
});

describe('stem', () => {
	it('removes -ing', () => {
		expect(stem('running')).toBe('runn');
	});

	it('removes -tion', () => {
		expect(stem('execution')).toBe('execu');
	});

	it('removes -ness', () => {
		expect(stem('darkness')).toBe('dark');
	});

	it('preserves short words', () => {
		expect(stem('go')).toBe('go');
		expect(stem('do')).toBe('do');
	});

	it('preserves words where suffix removal would leave < 3 chars', () => {
		expect(stem('sing')).toBe('sing');
	});
});

describe('jaccardSimilarity', () => {
	it('identical sets → 1.0', () => {
		expect(jaccardSimilarity(['a', 'b'], ['a', 'b'])).toBe(1.0);
	});

	it('disjoint sets → 0.0', () => {
		expect(jaccardSimilarity(['a', 'b'], ['c', 'd'])).toBe(0.0);
	});

	it('partial overlap', () => {
		// {a,b,c} ∩ {b,c,d} = {b,c} → 2/4 = 0.5
		expect(jaccardSimilarity(['a', 'b', 'c'], ['b', 'c', 'd'])).toBe(0.5);
	});

	it('both empty → 1.0', () => {
		expect(jaccardSimilarity([], [])).toBe(1.0);
	});

	it('one empty → 0.0', () => {
		expect(jaccardSimilarity(['a'], [])).toBe(0.0);
		expect(jaccardSimilarity([], ['a'])).toBe(0.0);
	});

	it('high similarity detects similar neuron names', () => {
		const a = tokenize('data_driven_approach');
		const b = tokenize('data_driven');
		// "data","driv","approach" vs "data","driv" → 2/3 = 0.67
		expect(jaccardSimilarity(a, b) >= 0.6).toBeTruthy();
	});

	it('low similarity for different concepts', () => {
		const a = tokenize('禁console_log');
		const b = tokenize('推plan_then_execute');
		expect(jaccardSimilarity(a, b) < 0.3).toBeTruthy();
	});
});
