#!/usr/bin/env node
import { Command } from 'commander';
import { extract } from './commands/extract.js';
import { check } from './commands/check.js';
import * as fs from 'fs';

// dist/cli.js -> ../package.json; npm always ships package.json, so this can't drift from the release.
const { version } = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));

const program = new Command();

program
  .name('ngx-i18n')
  .description('CLI for @ngx-runtime-i18n — extract keys and validate catalogs')
  .version(version);

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function printDynamicWarnings(warnings: Array<{ file: string; line: number }>): void {
  if (warnings.length === 0) return;
  console.log(
    `\n⚠ ${warnings.length} i18n call(s) use a dynamic/computed key that could not be statically extracted:`
  );
  for (const w of warnings) {
    console.log(`    - ${w.file}:${w.line}`);
  }
}

program
  .command('extract')
  .description('Scan source files for all i18n key usages')
  .option('--src <path>', 'Source directory to scan', 'src')
  .option('--output <file>', 'Output manifest JSON file', 'translation-manifest.json')
  .action(async (opts: { src: string; output: string }) => {
    if (!fs.existsSync(opts.src)) fail(`source directory not found: "${opts.src}"`);
    const manifest = await extract({ src: opts.src });
    fs.writeFileSync(opts.output, JSON.stringify(manifest, null, 2));
    console.log(`✓ Extracted ${manifest.keys.length} keys → ${opts.output}`);
    printDynamicWarnings(manifest.dynamicKeyWarnings ?? []);
  });

program
  .command('check')
  .description('Validate catalogs against key usage')
  .option('--catalog <path>', 'Catalog directory', 'public/i18n')
  .option('--langs <langs>', 'Comma-separated language codes', 'en')
  .option('--src <path>', 'Source directory to scan for usage (skip if using --manifest)')
  .option('--manifest <file>', 'Use pre-computed manifest JSON')
  .option('--fail-on-missing', 'Exit with code 1 if keys are missing', false)
  .option('--fail-on-unused', 'Exit with code 1 if keys are unused', false)
  .action(
    async (opts: {
      catalog: string;
      langs: string;
      src?: string;
      manifest?: string;
      failOnMissing?: boolean;
      failOnUnused?: boolean;
    }) => {
      if (!opts.src && !opts.manifest) {
        fail('either --src (to scan) or --manifest (a pre-computed manifest) is required.');
      }
      if (!fs.existsSync(opts.catalog)) fail(`catalog directory not found: "${opts.catalog}"`);
      if (opts.src && !fs.existsSync(opts.src)) fail(`source directory not found: "${opts.src}"`);

      let precomputedManifest: Awaited<ReturnType<typeof extract>> | undefined;
      if (opts.manifest) {
        if (!fs.existsSync(opts.manifest)) fail(`manifest file not found: "${opts.manifest}"`);
        try {
          precomputedManifest = JSON.parse(fs.readFileSync(opts.manifest, 'utf-8'));
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          fail(`invalid manifest JSON in "${opts.manifest}": ${reason}`);
        }
      }

      const langs = opts.langs.split(',').map((l) => l.trim());

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
        const suffix = opts.failOnUnused ? '' : ' (pass --fail-on-unused to enforce)';
        console.log(`\n⚠ ${result.unused.length} keys in catalog are unused${suffix}:`);
        for (const key of result.unused) {
          console.log(`    - ${key}`);
        }
      }

      printDynamicWarnings(result.dynamicKeyWarnings);

      if (result.hasFailures) process.exitCode = 1;
    }
  );

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${reason}`);
    process.exitCode = 1;
  }
}

void main();
