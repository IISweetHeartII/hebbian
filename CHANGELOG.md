# Changelog

## 0.2.0 (2026-03-31)

Full TypeScript rewrite.

### Breaking Changes
- Source moved from `lib/` to `src/` (TypeScript)
- Built output in `dist/` (compiled JS + declarations)
- Package now ships compiled JS, not source

### Improvements
- **TypeScript 6.0** — full type safety, exported type declarations
- **tsup** — fast ESM bundling, tree-shakable output
- **vitest** — faster test runner with native TS support
- **134 tests** passing (was 135 in JS, -1 from vitest loop handling)
- Strict mode: `noUncheckedIndexedAccess`, full `strict: true`

### Architecture
- Zero runtime dependencies (unchanged)
- Dev: typescript 6.0, tsup 8.5, vitest 4.1
- Node.js >= 22.0.0

## 0.1.0 (2026-03-31)

Initial release (JavaScript).

### Features
- Brain Scanner, Subsumption Cascade, 3-Tier Emit
- Multi-Target Output (claude/cursor/gemini/copilot/generic/all)
- Grow with Jaccard merge detection, Fire/Rollback, Signal, Decay
- Watch Mode, Brain Init, CLI (14 commands)
- Governance: SCC 100%, MLA 100%
