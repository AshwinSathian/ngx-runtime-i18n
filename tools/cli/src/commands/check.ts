import { readCatalog } from '../catalog/reader.js';
import type { TranslationManifest } from './extract.js';
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
  hasFailures: boolean;
}

export async function check(options: CheckOptions): Promise<CheckResult> {
  let manifest = options.manifest;
  if (!manifest && options.src) {
    manifest = await extract({ src: options.src });
  }

  const usedKeys = manifest?.keys ?? [];
  const enKeys = readCatalog(options.catalog, options.langs[0] ?? 'en');
  const reports: CheckReport[] = [];

  for (const lang of options.langs) {
    const catalogKeys = readCatalog(options.catalog, lang);
    const catalogKeySet = new Set(catalogKeys);
    const missing = usedKeys.filter(k => !catalogKeySet.has(k));
    reports.push({ lang, total: usedKeys.length, missing, present: usedKeys.length - missing.length });
  }

  const unused = options.failOnUnused
    ? enKeys.filter(k => !usedKeys.includes(k))
    : [];

  const hasFailures =
    (!!options.failOnMissing && reports.some(r => r.missing.length > 0)) ||
    (!!options.failOnUnused && unused.length > 0);

  return { reports, unused, hasFailures };
}
