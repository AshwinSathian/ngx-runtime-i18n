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

// Matches: 'key' | i18n, "key" | i18n. Runs against the whole file content
// (not line-by-line), so a key and its pipe split across lines are still
// found. Key charset matches the TS scanner's ([^'"]+) so hyphenated keys
// work the same way in both.
const HTML_I18N_PIPE_REGEX = /['"]([^'"]+)['"]\s*\|\s*i18n\b/g;
// Any i18n pipe usage at all, used to detect ones HTML_I18N_PIPE_REGEX missed
// because the piped expression isn't a bare string literal (a binding,
// concatenation, etc.) - those keys can't be statically resolved.
const HTML_PIPE_USAGE_REGEX = /\|\s*i18n\b/g;

/**
 * Blanks out `<!-- ... -->` blocks before scanning, so a key referenced only
 * in a commented-out template isn't reported as "used". HTML comments are
 * unambiguously delimited, so unlike the TS scanner's `//` heuristic this is
 * exact, not a heuristic. Replacing matched characters with spaces (instead
 * of deleting them) keeps every other match's line number intact.
 */
function stripComments(content: string): string {
  return content.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
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

export function scanHtmlFile(filePath: string): ScanResult[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const content = stripComments(raw);
  const newlineIndex = buildNewlineIndex(raw);
  const results = new Map<string, KeyOccurrence[]>();

  HTML_I18N_PIPE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HTML_I18N_PIPE_REGEX.exec(content)) !== null) {
    const key = match[1];
    const occurrence = { file: filePath, line: lineForIndex(newlineIndex, match.index) };
    const existing = results.get(key);
    if (existing) existing.push(occurrence);
    else results.set(key, [occurrence]);
  }

  return Array.from(results.entries()).map(([key, occurrences]) => ({ key, occurrences }));
}

export function scanHtmlFileForDynamicKeys(filePath: string): DynamicKeyWarning[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const content = stripComments(raw);
  const newlineIndex = buildNewlineIndex(raw);
  const warnings: DynamicKeyWarning[] = [];

  HTML_PIPE_USAGE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HTML_PIPE_USAGE_REGEX.exec(content)) !== null) {
    let i = match.index - 1;
    while (i >= 0 && /\s/.test(content.charAt(i))) i--;
    const precededByQuote = i >= 0 && (content.charAt(i) === "'" || content.charAt(i) === '"');
    if (!precededByQuote) {
      warnings.push({ file: filePath, line: lineForIndex(newlineIndex, match.index) });
    }
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

function isHtmlFile(name: string): boolean {
  return name.endsWith('.html');
}

export function scanHtmlDirectory(dir: string): ScanResult[] {
  const allResults = new Map<string, KeyOccurrence[]>();

  for (const file of walkFiles(dir, isHtmlFile)) {
    for (const { key, occurrences } of scanHtmlFile(file)) {
      const existing = allResults.get(key);
      if (existing) existing.push(...occurrences);
      else allResults.set(key, [...occurrences]);
    }
  }

  return Array.from(allResults.entries()).map(([key, occurrences]) => ({ key, occurrences }));
}

export function scanHtmlDirectoryForDynamicKeys(dir: string): DynamicKeyWarning[] {
  return walkFiles(dir, isHtmlFile).flatMap(scanHtmlFileForDynamicKeys);
}
