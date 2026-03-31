<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=node.js" />
  <img src="https://img.shields.io/badge/Runtime_Deps-0-brightgreen?style=flat-square" />
  <img src="https://img.shields.io/badge/Tests-134-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/MIT-green?style=flat-square" />
</p>

<p align="center"><a href="README.ko.md">한국어</a> · <a href="CHANGELOG.md">Changelog</a></p>

# hebbian

### *Folder-as-neuron brain for any AI agent.*

> "Neurons that fire together, wire together." — Donald Hebb (1949)

---

## TL;DR

**`mkdir` replaces system prompts.** Folders are neurons. Paths are sentences. Counter files are synaptic weights.

```bash
npx hebbian init ./brain
npx hebbian grow brainstem/禁fallback --brain ./brain
npx hebbian fire brainstem/禁fallback --brain ./brain
npx hebbian emit claude --brain ./brain    # → CLAUDE.md
npx hebbian emit all --brain ./brain       # → All AI formats at once
```

| Before | hebbian |
|--------|------|
| 1000-line prompts, manually edited | `mkdir` one folder |
| Vector DB $70/mo | **$0** (folders = DB) |
| Switch AI → full migration | `cp -r brain/` — 1 second |
| Rule violation → wishful thinking | `bomb.neuron` → **cascade halt** |
| Rules managed by humans | Correction → auto neuron growth |

---

## Why "hebbian"?

Donald Hebb's 1949 principle: **neurons that fire together, wire together.** Repeated corrections strengthen synaptic pathways. That's exactly what this tool does — every `hebbian fire` increments a counter, and only frequently-fired neurons survive. Natural selection on your filesystem.

---

## How It Works

### Folder = Neuron. Path = Sentence.

```
brain/cortex/frontend/禁console_log/40.neuron
```

Read it: "Cortex > Frontend > Never use console.log. Reinforced 40 times."

### 7-Region Subsumption Architecture

```
P0: brainstem    → Absolute laws (immutable, read-only)
P1: limbic       → Emotion filters
P2: hippocampus  → Memory, session restore
P3: sensors      → Environment constraints
P4: cortex       → Knowledge, skills (largest region)
P5: ego          → Tone, personality
P6: prefrontal   → Goals, projects

Rule: Lower P always suppresses higher P.
bomb.neuron in any region → cascade halt.
```

### File Types

| File | Meaning | Biology |
|------|---------|---------|
| `N.neuron` | Excitatory counter (strength) | Synaptic weight |
| `N.contra` | Inhibitory counter | Inhibitory synapse |
| `dopamineN.neuron` | Reward signal | Dopamine |
| `bomb.neuron` | Circuit breaker | Pain response |
| `memoryN.neuron` | Episode recording | Long-term memory |
| `*.dormant` | Inactive marker | Sleep pruning |
| `.axon` | Cross-region link | Axon connection |

---

## CLI Reference

```bash
hebbian init <path>                     # Create brain with 7 regions
hebbian emit <target> [--brain <path>]  # Compile rules
hebbian fire <neuron-path>              # Increment counter (+1)
hebbian grow <neuron-path>              # Create neuron (with merge detection)
hebbian rollback <neuron-path>          # Decrement counter (min=1)
hebbian signal <type> <neuron-path>     # Add signal (dopamine/bomb/memory)
hebbian decay [--days N]                # Mark inactive neurons dormant
hebbian watch                           # Auto-recompile on changes
hebbian diag                            # Brain diagnostics
hebbian stats                           # Brain statistics
```

### Emit Targets

| Target | Output File |
|--------|-------------|
| `claude` | `CLAUDE.md` |
| `cursor` | `.cursorrules` |
| `gemini` | `.gemini/GEMINI.md` |
| `copilot` | `.github/copilot-instructions.md` |
| `generic` | `.neuronrc` |
| `all` | All of the above |

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `HEBBIAN_BRAIN` | Brain directory path | `./brain` |

---

## 3-Tier Emission

hebbian compiles your brain into 3 tiers:

| Tier | File | Tokens | When |
|------|------|--------|------|
| 1 | Target file (CLAUDE.md, etc.) | ~500 | Auto-loaded by AI |
| 2 | `brain/_index.md` | ~1000 | AI reads at session start |
| 3 | `brain/{region}/_rules.md` | Variable | AI reads on demand |

This keeps the token budget lean. 293 neurons → ~500 tokens at startup.

---

## Synaptic Consolidation

When you `hebbian grow`, the system checks for similar existing neurons using Jaccard similarity:

```bash
hebbian grow cortex/frontend/禁console_logging --brain ./brain
# → "禁console_logging" ≈ "禁console_log" (Jaccard ≥ 0.6)
# → Fires existing neuron instead of creating duplicate
```

**Consolidation over duplication.** Hebbian principle in action.

---

## Compared to

| Feature | .cursorrules | Mem0/Letta | hebbian |
|---------|-------------|------------|------|
| 1000+ rules | Token overflow | Vector DB | Folder tree |
| Infrastructure | $0 | $$$$ | **$0** |
| Switch AI | Manual migration | Full re-setup | **`cp -r brain/`** |
| Self-growth | Manual | Bot-based | **Counter-based** |
| Immutable guardrails | None | None | **brainstem + bomb** |
| Audit trail | Hidden | DB logs | **`ls -R` = full history** |
| Runtime deps | N/A | Many | **0** |

---

## Zero Runtime Dependencies

Written in **TypeScript 6.0**, built with tsup, tested with vitest.

- `node:fs` — filesystem operations
- `node:path` — path handling
- `node:util` — CLI argument parsing
- `node:http` — REST API (planned)

**Runtime dependencies: 0.** Dev dependencies (typescript, tsup, vitest) are build-time only. Published package contains only compiled JS + type declarations.

---

## Governance

134 tests pass in ~2s:

- **SCC** (Subsumption Cascade Correctness): 17/17 = **100%**
- **MLA** (Memory Lifecycle Accuracy): 15/15 = **100%**
- Scanner: 15 tests
- Lifecycle: 18 tests
- Emit: 16 tests
- Similarity: 12 tests
- CLI E2E: 21 tests
- Dedup: 3 tests

```bash
npm test                              # Run all tests
npx vitest run test/governance.test.ts  # Governance only
```

---

## Inspired By

[NeuronFS](https://github.com/rhino-acoustic/NeuronFS) — the original Go implementation that proved folders can be neurons. hebbian is a JavaScript reimagination, designed for the npm ecosystem and zero-dependency operation.

---

## License

MIT
