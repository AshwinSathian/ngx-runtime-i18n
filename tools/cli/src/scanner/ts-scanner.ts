import * as fs from 'fs';
import * as path from 'path';

interface KeyOccurrence {
  file: string;
  line: number;
}

interface ScanResult {
  key: string;
  occurrences: KeyOccurrence[];
}

export interface DynamicKeyWarning {
  file: string;
  line: number;
}

// Matches: .t('key') or .t("key"), and the reactive signal helper .t$('key') or .t$("key").
// Runs against the whole file content (not line-by-line), so a call whose
// arguments span multiple lines is still found.
const TS_T_CALL_REGEX = /\.t\$?\(\s*['"]([^'"]+)['"]/g;
// Same call shape but the first argument isn't a string literal (template
// literal, variable, member access, ...) - the key can't be statically
// resolved, so it's surfaced as a warning instead of silently dropped.
const TS_T_DYNAMIC_CALL_REGEX = /\.t\$?\(\s*(?!['")])/g;

/**
 * Blanks out comments before scanning so a key referenced only in a comment
 * isn't reported as "used". Heuristic, not string-literal-aware (this is a
 * regex scanner, not a TS parser): a `//` immediately preceded by `:` is left
 * alone to protect the common `https://` case, but a key inside a string
 * literal that itself contains `//` right before it is a rare edge case this
 * won't handle correctly. Replacing matched characters with spaces (instead
 * of deleting them) keeps every other match's line number intact.
 */
function stripComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(?<!:)\/\/.*$/gm, (m) => ' '.repeat(m.length));
}

function buildNewlineIndex(content: string): number[] {
  const index: number[] = [];
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) index.push(i);
  }
  return index;
}

function lineForIndex(newlineIndex: number[], pos: number): number {
  let lo = 0;
  let hi = newlineIndex.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (newlineIndex[mid] < pos) lo = mid + 1;
    else hi = mid;
  }
  return lo + 1;
}

function pushOccurrence(map: Map<string, KeyOccurrence[]>, key: string, occurrence: KeyOccurrence): void {
  const existing = map.get(key);
  if (existing) existing.push(occurrence);
  else map.set(key, [occurrence]);
}

export function scanTypeScriptFile(filePath: string): ScanResult[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const content = stripComments(raw);
  const newlineIndex = buildNewlineIndex(raw);
  const results = new Map<string, KeyOccurrence[]>();

  TS_T_CALL_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TS_T_CALL_REGEX.exec(content)) !== null) {
    pushOccurrence(results, match[1], { file: filePath, line: lineForIndex(newlineIndex, match.index) });
  }

  return Array.from(results.entries()).map(([key, occurrences]) => ({ key, occurrences }));
}

export function scanTypeScriptFileForDynamicKeys(filePath: string): DynamicKeyWarning[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const content = stripComments(raw);
  const newlineIndex = buildNewlineIndex(raw);
  const warnings: DynamicKeyWarning[] = [];

  TS_T_DYNAMIC_CALL_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TS_T_DYNAMIC_CALL_REGEX.exec(content)) !== null) {
    warnings.push({ file: filePath, line: lineForIndex(newlineIndex, match.index) });
  }

  return warnings;
}

// ponytail: symlinked directories are never followed (Dirent.isDirectory() is
// false for a symlink under readdirSync) - silent non-coverage, no crash.
// Add fs.statSync + a visited-realpath set if symlinked source trees show up.
function walkFiles(dir: string, matchesFile: (name: string) => boolean): string[] {
  const files: string[] = [];

  function walk(current: string): void {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        walk(fullPath);
      } else if (entry.isFile() && matchesFile(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function isScannableTsFile(name: string): boolean {
  return name.endsWith('.ts') && !name.endsWith('.spec.ts') && !name.endsWith('.d.ts');
}

export function scanTypeScriptDirectory(dir: string): ScanResult[] {
  const allResults = new Map<string, KeyOccurrence[]>();

  for (const file of walkFiles(dir, isScannableTsFile)) {
    for (const { key, occurrences } of scanTypeScriptFile(file)) {
      const existing = allResults.get(key);
      if (existing) existing.push(...occurrences);
      else allResults.set(key, [...occurrences]);
    }
  }

  return Array.from(allResults.entries()).map(([key, occurrences]) => ({ key, occurrences }));
}

export function scanTypeScriptDirectoryForDynamicKeys(dir: string): DynamicKeyWarning[] {
  return walkFiles(dir, isScannableTsFile).flatMap(scanTypeScriptFileForDynamicKeys);
}
