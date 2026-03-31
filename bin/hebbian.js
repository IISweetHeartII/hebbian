#!/usr/bin/env node

// hebbian — Folder-as-Neuron Brain for Any AI Agent
//
// "Neurons that fire together, wire together." — Donald Hebb (1949)
//
// USAGE:
//   hebbian init <path>                     Create brain with 7 regions
//   hebbian emit <target> [--brain <path>]  Compile rules (claude/cursor/gemini/copilot/generic/all)
//   hebbian fire <neuron-path>              Increment neuron counter
//   hebbian grow <neuron-path>              Create neuron (with merge detection)
//   hebbian rollback <neuron-path>          Decrement counter (min=1)
//   hebbian signal <type> <neuron-path>     Add dopamine/bomb/memory signal
//   hebbian decay [--days N]                Mark inactive neurons dormant (default 30 days)
//   hebbian watch [--brain <path>]          Watch for changes + auto-recompile
//   hebbian diag                            Print brain diagnostics
//   hebbian stats                           Print brain statistics

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const VERSION = '0.1.0';

const HELP = `
hebbian v${VERSION} — Folder-as-neuron brain for any AI agent.

  "Neurons that fire together, wire together." — Donald Hebb (1949)

USAGE:
  hebbian <command> [options]

COMMANDS:
  init <path>                     Create brain with 7 regions
  emit <target> [--brain <path>]  Compile rules (claude/cursor/gemini/copilot/generic/all)
  fire <neuron-path>              Increment neuron counter (+1)
  grow <neuron-path>              Create neuron (with merge detection)
  rollback <neuron-path>          Decrement neuron counter (min=1)
  signal <type> <neuron-path>     Add signal (dopamine/bomb/memory)
  decay [--days N]                Mark inactive neurons dormant (default 30)
  dedup                           Batch merge similar neurons (Jaccard >= 0.6)
  snapshot                        Git commit current brain state
  watch                           Watch for changes + auto-recompile
  diag                            Print brain diagnostics
  stats                           Print brain statistics

OPTIONS:
  --brain <path>   Brain directory (default: $HEBBIAN_BRAIN or ./brain)
  --help, -h       Show this help
  --version, -v    Show version

EXAMPLES:
  hebbian init ./my-brain
  hebbian grow cortex/frontend/禁console_log --brain ./my-brain
  hebbian fire cortex/frontend/禁console_log --brain ./my-brain
  hebbian emit claude --brain ./my-brain
  hebbian emit all
`.trim();

/** Resolve brain root path from --brain flag, env var, or defaults */
function resolveBrainRoot(brainFlag) {
	if (brainFlag) return resolve(brainFlag);
	if (process.env.HEBBIAN_BRAIN) return resolve(process.env.HEBBIAN_BRAIN);
	if (existsSync(resolve('./brain'))) return resolve('./brain');
	return resolve(process.env.HOME || '~', 'hebbian', 'brain');
}

async function main(argv) {
	const { values, positionals } = parseArgs({
		args: argv,
		options: {
			brain: { type: 'string', short: 'b' },
			days: { type: 'string', short: 'd' },
			port: { type: 'string', short: 'p' },
			help: { type: 'boolean', short: 'h' },
			version: { type: 'boolean', short: 'v' },
		},
		allowPositionals: true,
		strict: false,
	});

	if (values.version) {
		console.log(`hebbian v${VERSION}`);
		return;
	}

	const command = positionals[0];

	if (values.help || !command) {
		console.log(HELP);
		return;
	}

	const brainRoot = resolveBrainRoot(values.brain);

	switch (command) {
		case 'init': {
			const target = positionals[1];
			if (!target) {
				console.error('Usage: hebbian init <path>');
				process.exit(1);
			}
			const { initBrain } = await import('../lib/init.js');
			await initBrain(resolve(target));
			break;
		}
		case 'emit': {
			const target = positionals[1];
			if (!target) {
				console.error('Usage: hebbian emit <target> (claude/cursor/gemini/copilot/generic/all)');
				process.exit(1);
			}
			const { emitToTarget } = await import('../lib/emit.js');
			await emitToTarget(brainRoot, target);
			break;
		}
		case 'fire': {
			const neuronPath = positionals[1];
			if (!neuronPath) {
				console.error('Usage: hebbian fire <neuron-path>');
				process.exit(1);
			}
			const { fireNeuron } = await import('../lib/fire.js');
			await fireNeuron(brainRoot, neuronPath);
			break;
		}
		case 'grow': {
			const neuronPath = positionals[1];
			if (!neuronPath) {
				console.error('Usage: hebbian grow <neuron-path>');
				process.exit(1);
			}
			const { growNeuron } = await import('../lib/grow.js');
			await growNeuron(brainRoot, neuronPath);
			break;
		}
		case 'rollback': {
			const neuronPath = positionals[1];
			if (!neuronPath) {
				console.error('Usage: hebbian rollback <neuron-path>');
				process.exit(1);
			}
			const { rollbackNeuron } = await import('../lib/rollback.js');
			await rollbackNeuron(brainRoot, neuronPath);
			break;
		}
		case 'signal': {
			const signalType = positionals[1];
			const neuronPath = positionals[2];
			if (!signalType || !neuronPath) {
				console.error('Usage: hebbian signal <type> <neuron-path>  (type: dopamine/bomb/memory)');
				process.exit(1);
			}
			const { signalNeuron } = await import('../lib/signal.js');
			await signalNeuron(brainRoot, neuronPath, signalType);
			break;
		}
		case 'decay': {
			const days = values.days ? parseInt(values.days, 10) : 30;
			const { runDecay } = await import('../lib/decay.js');
			await runDecay(brainRoot, days);
			break;
		}
		case 'dedup': {
			const { runDedup } = await import('../lib/dedup.js');
			runDedup(brainRoot);
			break;
		}
		case 'snapshot': {
			const { gitSnapshot } = await import('../lib/snapshot.js');
			gitSnapshot(brainRoot);
			break;
		}
		case 'watch': {
			const { startWatch } = await import('../lib/watch.js');
			await startWatch(brainRoot);
			break;
		}
		case 'diag':
		case 'stats': {
			const { scanBrain } = await import('../lib/scanner.js');
			const { runSubsumption } = await import('../lib/subsumption.js');
			const brain = scanBrain(brainRoot);
			const result = runSubsumption(brain);
			const { printDiag } = await import('../lib/emit.js');
			printDiag(brain, result);
			break;
		}
		default:
			console.error(`Unknown command: ${command}`);
			console.log(HELP);
			process.exit(1);
	}
}

main(process.argv.slice(2)).catch((err) => {
	console.error(err.message);
	process.exit(1);
});
