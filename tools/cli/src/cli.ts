#!/usr/bin/env node
import { Command } from 'commander';
import { extract } from './commands/extract.js';
import { check } from './commands/check.js';
import * as fs from 'fs';

const program = new Command();

program
  .name('ngx-i18n')
  .description('CLI for @ngx-runtime-i18n — extract keys and validate catalogs')
  .version('2.0.1');

program
  .command('extract')
  .description('Scan source files for all i18n key usages')
  .option('--src <path>', 'Source directory to scan', 'src')
  .option('--output <file>', 'Output manifest JSON file', 'translation-manifest.json')
  .action(async (opts: { src: string; output: string }) => {
    const manifest = await extract({ src: opts.src });
    fs.writeFileSync(opts.output, JSON.stringify(manifest, null, 2));
    console.log(`✓ Extracted ${manifest.keys.length} keys → ${opts.output}`);
  });

program
  .command('check')
  .description('Validate catalogs against key usage')
  .option('--catalog <path>', 'Catalog directory', 'public/i18n')
  .option('--langs <langs>', 'Comma-separated language codes', 'en')
  .option('--src <path>', 'Source directory to scan for usage')
  .option('--manifest <file>', 'Use pre-computed manifest JSON')
  .option('--fail-on-missing', 'Exit with code 1 if keys are missing', false)
  .option('--fail-on-unused', 'Exit with code 1 if keys are unused', false)
  .action(async (opts: { catalog: string; langs: string; src?: string; manifest?: string; failOnMissing?: boolean; failOnUnused?: boolean }) => {
    const langs = opts.langs.split(',').map(l => l.trim());
    const precomputedManifest = opts.manifest ? JSON.parse(fs.readFileSync(opts.manifest, 'utf-8')) : undefined;

    const result = await check({
      catalog: opts.catalog,
      langs,
      src: opts.src,
      manifest: precomputedManifest,
      failOnMissing: opts.failOnMissing,
      failOnUnused: opts.failOnUnused,
    });

    for (const report of result.reports) {
      if (report.missing.length === 0) {
        console.log(`✓ ${report.lang}: ${report.present}/${report.total} keys present`);
      } else {
        console.log(`✗ ${report.lang}: ${report.missing.length} keys missing:`);
        for (const key of report.missing) {
          console.log(`    - ${key}`);
        }
      }
    }

    if (result.unused.length > 0) {
      console.log(`\n⚠ ${result.unused.length} keys in catalog are unused:`);
      for (const key of result.unused) {
        console.log(`    - ${key}`);
      }
    }

    if (result.hasFailures) process.exit(1);
  });

program.parse();
