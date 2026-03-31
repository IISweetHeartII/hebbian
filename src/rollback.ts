// hebbian — Rollback Neuron (decrement counter)
//
// Undo a firing. Counter cannot go below 1 (minimum activation).

import { renameSync } from 'node:fs';
import { join } from 'node:path';
import { getCurrentCounter } from './fire';

/**
 * Decrement a neuron's counter by 1. Minimum counter is 1.
 */
export function rollbackNeuron(brainRoot: string, neuronPath: string): number {
	const fullPath = join(brainRoot, neuronPath);
	const current = getCurrentCounter(fullPath);

	if (current === 0) {
		throw new Error(`Neuron not found: ${neuronPath}`);
	}

	if (current <= 1) {
		throw new Error(`Counter already at minimum (1): ${neuronPath}`);
	}

	const newCounter = current - 1;
	renameSync(join(fullPath, `${current}.neuron`), join(fullPath, `${newCounter}.neuron`));

	console.log(`\u{23EA} rollback: ${neuronPath} (${current} → ${newCounter})`);
	return newCounter;
}
