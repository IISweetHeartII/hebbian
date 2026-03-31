#!/usr/bin/env node

// hebb — Folder-as-Neuron Brain for Any AI Agent
//
// "Neurons that fire together, wire together." — Donald Hebb (1949)
//
// USAGE:
//   hebb init <path>                     Create brain with 7 regions
//   hebb emit <target> [--brain <path>]  Compile rules (claude/cursor/gemini/copilot/generic/all)
//   hebb fire <neuron-path>              Increment neuron counter
//   hebb grow <neuron-path>              Create neuron (with merge detection)
//   hebb rollback <neuron-path>          Decrement counter (min=1)
//   hebb signal <type> <neuron-path>     Add dopamine/bomb/memory signal
//   hebb decay [--days N]                Mark inactive neurons dormant (default 30 days)
//   hebb watch [--brain <path>]          Watch for changes + auto-recompile
//   hebb diag                            Print brain diagnostics
//   hebb stats                           Print brain statistics

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const VERSION = '0.1.0';

const HELP = `
hebb v${VERSION} — Folder-as-neuron brain for any AI agent.

  "Neurons that fire together, wire together." — Donald Hebb (1949)

USAGE:
  hebb <command> [options]

COMMANDS:
  init <path>                     Create brain with 7 regions
  emit <target> [--brain <path>]  Compile rules (claude/cursor/gemini/copilot/generic/all)
  fire <neuron-path>              Increment neuron counter (+1)
  grow <neuron-path>              Create neuron (with merge detection)
  rollback <neuron-path>          Decrement neuron counter (min=1)
  signal <type> <neuron-path>     Add signal (dopamine/bomb/memory)
  decay [--days N]                Mark inactive neurons dormant (default 30)
  watch                           Watch for changes + auto-recompile
  diag                            Print brain diagnostics
  stats                           Print brain statistics

OPTIONS:
  --brain <path>   Brain directory (default: $HEBB_BRAIN or ./brain)
  --help, -h       Show this help
  --version, -v    Show version

EXAMPLES:
  hebb init ./my-brain
  hebb grow cortex/frontend/禁console_log --brain ./my-brain
  hebb fire cortex/frontend/禁console_log --brain ./my-brain
  hebb emit claude --brain ./my-brain
  hebb emit all
`.trim();

/** Resolve brain root path from --brain flag, env var, or defaults */
function resolveBrainRoot(brainFlag) {
	if (brainFlag) return resolve(brainFlag);
	if (process.env.HEBB_BRAIN) return resolve(process.env.HEBB_BRAIN);
	if (existsSync(resolve('./brain'))) return resolve('./brain');
	return resolve(process.env.HOME || '~', 'hebb', 'brain');
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
		console.log(`hebb v${VERSION}`);
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
				console.error('Usage: hebb init <path>');
				process.exit(1);
			}
			const { initBrain } = await import('../lib/init.js');
			await initBrain(resolve(target));
			break;
		}
		case 'emit': {
			const target = positionals[1];
			if (!target) {
				console.error('Usage: hebb emit <target> (claude/cursor/gemini/copilot/generic/all)');
				process.exit(1);
			}
			const { emitToTarget } = await import('../lib/emit.js');
			await emitToTarget(brainRoot, target);
			break;
		}
		case 'fire': {
			const neuronPath = positionals[1];
			if (!neuronPath) {
				console.error('Usage: hebb fire <neuron-path>');
				process.exit(1);
			}
			const { fireNeuron } = await import('../lib/fire.js');
			await fireNeuron(brainRoot, neuronPath);
			break;
		}
		case 'grow': {
			const neuronPath = positionals[1];
			if (!neuronPath) {
				console.error('Usage: hebb grow <neuron-path>');
				process.exit(1);
			}
			const { growNeuron } = await import('../lib/grow.js');
			await growNeuron(brainRoot, neuronPath);
			break;
		}
		case 'rollback': {
			const neuronPath = positionals[1];
			if (!neuronPath) {
				console.error('Usage: hebb rollback <neuron-path>');
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
				console.error('Usage: hebb signal <type> <neuron-path>  (type: dopamine/bomb/memory)');
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
