// hebb — Batch Deduplication
//
// Scans all neurons in a region and merges duplicates via Jaccard similarity.
// When a match is found (>= threshold), fires the higher-counter neuron
// and marks the lower-counter one dormant.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { JACCARD_THRESHOLD } from './constants.js';
import { tokenize, jaccardSimilarity } from './similarity.js';
import { fireNeuron } from './fire.js';
import { scanBrain } from './scanner.js';

/**
 * Run batch deduplication across all regions.
 * @param {string} brainRoot
 * @returns {{ scanned: number, merged: number }}
 */
export function runDedup(brainRoot) {
	const brain = scanBrain(brainRoot);
	let scanned = 0;
	let merged = 0;

	for (const region of brain.regions) {
		const neurons = region.neurons.filter((n) => !n.isDormant);
		scanned += neurons.length;

		// O(n^2) pairwise comparison within each region
		const consumed = new Set();
		for (let i = 0; i < neurons.length; i++) {
			if (consumed.has(i)) continue;
			const tokensI = tokenize(neurons[i].name);

			for (let j = i + 1; j < neurons.length; j++) {
				if (consumed.has(j)) continue;
				const tokensJ = tokenize(neurons[j].name);
				const sim = jaccardSimilarity(tokensI, tokensJ);

				if (sim >= JACCARD_THRESHOLD) {
					// Keep the one with higher counter, mark other dormant
					const [keep, drop] = neurons[i].counter >= neurons[j].counter
						? [neurons[i], neurons[j]]
						: [neurons[j], neurons[i]];

					// Fire the keeper to absorb the dropped counter
					const relKeep = `${region.name}/${keep.path}`;
					fireNeuron(brainRoot, relKeep);

					// Mark the dropped neuron dormant
					writeFileSync(
						join(drop.fullPath, 'dedup.dormant'),
						`Merged into ${keep.path} on ${new Date().toISOString()}`,
						'utf8',
					);

					consumed.add(neurons[i] === drop ? i : j);
					merged++;
					console.log(`\u{1F500} merged: "${drop.path}" → "${keep.path}" (sim=${sim.toFixed(2)})`);
				}
			}
		}
	}

	console.log(`\u{1F9F9} dedup: scanned ${scanned} neurons, merged ${merged}`);
	return { scanned, merged };
}
