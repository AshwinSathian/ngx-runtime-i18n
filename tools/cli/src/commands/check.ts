import { readCatalog } from '../catalog/reader.js';
import type { DynamicKeyWarning, TranslationManifest } from './extract.js';
import { extract } from './extract.js';

export interface CheckOptions {
  catalog: string;
  langs: string[];
  src?: string;
  manifest?: TranslationManifest;
  failOnMissing?: boolean;
  failOnUnused?: boolean;
}

export interface CheckReport {
  lang: string;
  total: number;
  missing: string[];
  present: number;
}

export interface CheckResult {
  reports: CheckReport[];
  unused: string[];
  dynamicKeyWarnings: DynamicKeyWarning[];
  hasFailures: boolean;
}

export async function check(options: CheckOptions): Promise<CheckResult> {
  let manifest = options.manifest;
  if (!manifest) {
    if (!options.src) {
      throw new Error(
        'check() requires either "src" (to scan for key usage) or "manifest" (a pre-computed manifest from extract()); neither was provided.'
      );
    }
    manifest = await extract({ src: options.src });
  }

  const usedKeys = manifest.keys;
  // Reference catalog for unused-key detection: the first --langs entry, not
  // an explicit "primary" concept. Passing --langs de,fr makes de the
  // reference; see README for the documented ordering.
  const referenceKeys = readCatalog(options.catalog, options.langs[0] ?? 'en');
  const reports: CheckReport[] = [];

  for (const lang of options.langs) {
    const catalogKeys = readCatalog(options.catalog, lang);
    const catalogKeySet = new Set(catalogKeys);
    const missing = usedKeys.filter((k) => !catalogKeySet.has(k));
    reports.push({ lang, total: usedKeys.length, missing, present: usedKeys.length - missing.length });
  }

  // Always computed (not just when --fail-on-unused is set) so callers can
  // surface an informational unused-keys listing without opting into failure.
  const unused = referenceKeys.filter((k) => !usedKeys.includes(k));

  const hasFailures =
    (!!options.failOnMissing && reports.some((r) => r.missing.length > 0)) ||
    (!!options.failOnUnused && unused.length > 0);

  return { reports, unused, dynamicKeyWarnings: manifest.dynamicKeyWarnings ?? [], hasFailures };
}
