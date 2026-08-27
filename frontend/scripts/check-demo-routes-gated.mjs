#!/usr/bin/env node
/**
 * CI guard for MyFanss/MyFans#1596.
 *
 * Demo / showcase / test routes under `src/app` must be listed in
 * `DEMO_ROUTE_PREFIXES` in `src/middleware.ts`, which 404s them in
 * production. This script fails when:
 *   - a demo-looking route directory exists but is not gated, or
 *   - the gate list references a route that no longer exists (stale).
 *
 * Run: `node scripts/check-demo-routes-gated.mjs`
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = join(root, 'src', 'app');
const middlewarePath = join(root, 'src', 'middleware.ts');

// Route directories whose name signals a demo / storybook / test page.
const DEMO_NAME_PATTERN = /(^|-)(demo|example|showcase|sandbox|playground)$|-test$|^ui$|^pending$/;

const middlewareSrc = readFileSync(middlewarePath, 'utf8');
const gateBlock = middlewareSrc.match(/DEMO_ROUTE_PREFIXES\s*=\s*\[([\s\S]*?)\]/);
if (!gateBlock) {
  console.error('✖ Could not find DEMO_ROUTE_PREFIXES in src/middleware.ts');
  process.exit(1);
}
const gated = new Set(
  [...gateBlock[1].matchAll(/'\/([^']+)'/g)].map((m) => m[1]),
);

const routeDirs = readdirSync(appDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('('))
  .map((d) => d.name);

const problems = [];

for (const name of routeDirs) {
  if (DEMO_NAME_PATTERN.test(name) && !gated.has(name)) {
    problems.push(`✖ Route "/${name}" looks like a demo route but is not in DEMO_ROUTE_PREFIXES`);
  }
}

for (const prefix of gated) {
  if (!existsSync(join(appDir, prefix))) {
    problems.push(`✖ DEMO_ROUTE_PREFIXES lists "/${prefix}" but src/app/${prefix} does not exist`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error('\nGate demo routes in src/middleware.ts or remove them. See docs/DEMO_ROUTES.md.');
  process.exit(1);
}

console.log(`✓ All demo routes gated (${[...gated].map((p) => `/${p}`).join(', ')})`);
