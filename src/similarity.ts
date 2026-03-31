// hebbian — Tokenizer, Stemmer, Jaccard Similarity
//
// Used by growNeuron() to detect similar existing neurons and merge
// instead of duplicating. Implements synaptic consolidation.
//
// "Neurons that fire together, wire together." — if two folder names
// express the same concept, fire the existing one instead of creating a duplicate.

/**
 * Tokenize a neuron name into stemmed words.
 * Splits on underscores, hyphens, spaces, and CamelCase boundaries.
 */
export function tokenize(name: string): string[] {
	return name
		.replace(/([a-z])([A-Z])/g, '$1_$2')   // camelCase → snake
		.replace(/[^a-zA-Z0-9\u3000-\u9FFF\uAC00-\uD7AF]+/g, ' ')  // punctuation → space
		.toLowerCase()
		.split(' ')
		.map(stem)
		.filter((t) => t.length > 1);           // drop single chars
}

/**
 * Simple suffix stemmer — removes common English suffixes.
 * Not a full Porter stemmer, but sufficient for Jaccard comparison.
 */
export function stem(word: string): string {
	const suffixes = ['ing', 'tion', 'sion', 'ness', 'ment', 'able', 'ible', 'ful', 'less', 'ous', 'ive', 'ity', 'ies', 'ed', 'er', 'es', 'ly', 'al', 'en'];
	for (const suffix of suffixes) {
		if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
			return word.slice(0, -suffix.length);
		}
	}
	return word;
}

/**
 * Compute Jaccard similarity between two token sets.
 * |A ∩ B| / |A ∪ B|
 */
export function jaccardSimilarity(a: string[], b: string[]): number {
	if (a.length === 0 && b.length === 0) return 1.0;
	if (a.length === 0 || b.length === 0) return 0.0;

	const setA = new Set(a);
	const setB = new Set(b);
	let intersection = 0;

	for (const item of setA) {
		if (setB.has(item)) intersection++;
	}

	const union = new Set([...setA, ...setB]).size;
	return intersection / union;
}
