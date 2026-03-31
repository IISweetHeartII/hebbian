import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    target: 'node22',
    outDir: 'dist',
    clean: true,
    dts: false,
    splitting: false,
    sourcemap: true,
  },
  {
    entry: { 'bin/hebbian': 'src/cli.ts' },
    format: ['esm'],
    target: 'node22',
    outDir: 'dist',
    clean: false,
    dts: false,
    splitting: false,
    sourcemap: true,
    banner: { js: '#!/usr/bin/env node' },
  },
]);
