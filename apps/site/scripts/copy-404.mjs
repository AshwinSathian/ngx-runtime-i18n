#!/usr/bin/env node
// Standalone Node script (not part of the Angular/TypeScript build) that copies the
// prerendered 404 document Angular writes at `browser/404/index.html` (see the `**`
// server route's `getPrerenderParams` in app.routes.server.ts) to a flat
// `browser/404.html` at the output root.
//
// Static hosts that auto-detect a not-found page (Cloudflare Pages among them) look
// for a root-level `404.html` file specifically — the route-based prerenderer instead
// emits every route, this one included, as a directory + `index.html` so it serves at
// a clean, slash-terminated URL (`/404/`), which a host's 404 auto-detection doesn't
// recognize. This script bridges the two conventions.
//
// Run via: node scripts/copy-404.mjs   (cwd: apps/site, after `nx build site`)

import fs from 'node:fs';
import path from 'node:path';

const browserDir = path.resolve(process.cwd(), '../../dist/apps/site/browser');
const source = path.join(browserDir, '404', 'index.html');
const destination = path.join(browserDir, '404.html');

if (!fs.existsSync(source)) {
  console.error(`✗ Expected prerendered 404 document at ${source} — did the build run first?`);
  process.exit(1);
}

fs.copyFileSync(source, destination);
console.log(`✓ Copied ${source} → ${destination}`);
