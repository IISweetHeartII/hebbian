// hebbian — Grow Neuron (with synaptic consolidation)
//
// Creates a new neuron (folder + 1.neuron).
// Before creating, checks for similar existing neurons via Jaccard similarity.
// If a match is found (>= 0.6), fires the existing neuron instead.
// This prevents duplication and strengthens existing pathways.
//
// "Consolidation over duplication." — Hebb's principle.

import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REGIONS, JACCARD_THRESHOLD } from './constants';
import { tokenize, jaccardSimilarity } from './similarity';
import { fireNeuron } from './fire';

export interface GrowResult {
	action: 'grew' | 'fired';
	path: string;
	counter: number;
}

/**
 * Grow a new neuron at the given path.
 * If a similar neuron already exists in the same region, fires it instead.
 */
export function growNeuron(brainRoot: string, neuronPath: string): GrowResult {
	const fullPath = join(brainRoot, neuronPath);

	// If neuron already exists, just fire it
	if (existsSync(fullPath)) {
		const counter = fireNeuron(brainRoot, neuronPath);
		return { action: 'fired', path: neuronPath, counter };
	}

	// Extract region name and leaf name
	const parts = neuronPath.split('/');
	const regionName = parts[0]!;
	if (!(REGIONS as readonly string[]).includes(regionName)) {
		throw new Error(`Invalid region: ${regionName}. Valid: ${REGIONS.join(', ')}`);
	}

	const leafName = parts[parts.length - 1]!;
	const newTokens = tokenize(leafName);

	// Search for similar neurons in the same region
	const regionPath = join(brainRoot, regionName);
	if (existsSync(regionPath)) {
		const match = findSimilar(regionPath, regionPath, newTokens);
		if (match) {
			const matchRelPath = regionName + '/' + relative(regionPath, match);
			console.log(`\u{1F504} consolidation: "${neuronPath}" ≈ "${matchRelPath}" (firing existing)`);
			const counter = fireNeuron(brainRoot, matchRelPath);
			return { action: 'fired', path: matchRelPath, counter };
		}
	}

	// No match — create new neuron
	mkdirSync(fullPath, { recursive: true });
	writeFileSync(join(fullPath, '1.neuron'), '', 'utf8');
	console.log(`\u{1F331} grew: ${neuronPath} (1)`);
	return { action: 'grew', path: neuronPath, counter: 1 };
}

/**
 * Walk a region and find a neuron whose name is similar to the given tokens.
 */
function findSimilar(dir: string, regionRoot: string, targetTokens: string[]): string | null {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return null;
	}

	// Check if this directory has .neuron files (is a neuron)
	const hasNeuron = entries.some((e) => e.isFile() && e.name.endsWith('.neuron'));
	if (hasNeuron) {
		const folderName = dir.split('/').pop() || '';
		const existingTokens = tokenize(folderName);
		const similarity = jaccardSimilarity(targetTokens, existingTokens);
		if (similarity >= JACCARD_THRESHOLD) {
			return dir;
		}
	}

	// Recurse into subdirectories
	for (const entry of entries) {
		if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
		if (entry.isDirectory()) {
			const match = findSimilar(join(dir, entry.name), regionRoot, targetTokens);
			if (match) return match;
		}
	}

	return null;
}
