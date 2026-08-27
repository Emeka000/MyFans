#!/usr/bin/env node
/**
 * Boots the production server (`next start`) and asserts that every demo
 * route returns HTTP 404 and is marked `noindex`. Guards MyFanss/MyFans#1596
 * against a regression where the middleware gate stops working.
 *
 * Expects `npm run build` to have run first. Set `FLAG_DEMOS=true` to skip
 * (that is the documented "demos on" escape hatch and 404s are expected NOT
 * to happen there).
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const DEMO_PATHS = [
  '/wallet-demo',
  '/error-test',
  '/ui',
  '/subscribe-example',
  '/settings-demo',
  '/pending',
];

if (process.env.FLAG_DEMOS === 'true') {
  console.log('FLAG_DEMOS=true — demo routes are intentionally enabled, skipping 404 assertion.');
  process.exit(0);
}

const PORT = process.env.PORT || '3123';
const BASE = `http://localhost:${PORT}`;

const server = spawn('npx', ['next', 'start', '-p', PORT], {
  stdio: ['ignore', 'inherit', 'inherit'],
  env: { ...process.env, NODE_ENV: 'production' },
});

let exitCode = 0;

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      await fetch(`${BASE}/`, { redirect: 'manual' });
      return true;
    } catch {
      await sleep(1000);
    }
  }
  return false;
}

try {
  if (!(await waitForServer())) {
    throw new Error('next start did not become ready in time');
  }

  for (const path of DEMO_PATHS) {
    const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
    const robots = res.headers.get('x-robots-tag') ?? '';
    if (res.status !== 404) {
      console.error(`✖ ${path} returned ${res.status}, expected 404`);
      exitCode = 1;
    } else if (!robots.includes('noindex')) {
      console.error(`✖ ${path} is 404 but missing noindex X-Robots-Tag`);
      exitCode = 1;
    } else {
      console.log(`✓ ${path} → 404 (noindex)`);
    }
  }
} catch (err) {
  console.error(`✖ ${err instanceof Error ? err.message : err}`);
  exitCode = 1;
} finally {
  server.kill('SIGTERM');
}

process.exit(exitCode);
