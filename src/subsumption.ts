// hebbian — Subsumption Cascade Engine
//
// Implements Brooks' subsumption architecture:
//   - Lower priority (P0) always suppresses higher priority (P6)
//   - bomb.neuron in any region halts all downstream regions
//   - Dormant neurons are excluded from activation counts
//
// Cascade flow:
//   P0 brainstem → P1 limbic → P2 hippocampus → P3 sensors → P4 cortex → P5 ego → P6 prefrontal
//   If bomb at P(n), all P(n+1)→P6 are BLOCKED.

import type { Brain, Region, SubsumptionResult } from './types';

/**
 * Run the subsumption cascade on a scanned brain.
 */
export function runSubsumption(brain: Brain): SubsumptionResult {
	const activeRegions: Region[] = [];
	const blockedRegions: Region[] = [];
	let bombSource = '';
	let firedNeurons = 0;
	let totalNeurons = 0;
	let totalCounter = 0;
	let blocked = false;

	for (const region of brain.regions) {
		totalNeurons += region.neurons.length;

		if (blocked) {
			blockedRegions.push(region);
			continue;
		}

		if (region.hasBomb) {
			bombSource = region.name;
			blockedRegions.push(region);
			blocked = true;
			continue;
		}

		activeRegions.push(region);

		for (const neuron of region.neurons) {
			if (!neuron.isDormant) {
				firedNeurons++;
				totalCounter += neuron.counter;
			}
		}
	}

	return {
		activeRegions,
		blockedRegions,
		bombSource,
		firedNeurons,
		totalNeurons,
		totalCounter,
	};
}
