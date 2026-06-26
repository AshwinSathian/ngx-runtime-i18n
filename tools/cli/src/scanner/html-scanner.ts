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

// Matches: 'key' | i18n, "key" | i18n
const HTML_I18N_PIPE_REGEX = /['"]([\w.]+)['"]\s*\|\s*i18n/g;

export function scanHtmlFile(filePath: string): ScanResult[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results = new Map<string, KeyOccurrence[]>();

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    HTML_I18N_PIPE_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = HTML_I18N_PIPE_REGEX.exec(line)) !== null) {
      const key = match[1];
      if (!results.has(key)) results.set(key, []);
      results.get(key)!.push({ file: filePath, line: lineIndex + 1 });
    }
  }

  return Array.from(results.entries()).map(([key, occurrences]) => ({ key, occurrences }));
}

export function scanHtmlDirectory(dir: string): ScanResult[] {
  const allResults = new Map<string, KeyOccurrence[]>();

  function walk(current: string): void {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        const fileResults = scanHtmlFile(fullPath);
        for (const { key, occurrences } of fileResults) {
          if (!allResults.has(key)) allResults.set(key, []);
          allResults.get(key)!.push(...occurrences);
        }
      }
    }
  }

  walk(dir);
  return Array.from(allResults.entries()).map(([key, occurrences]) => ({ key, occurrences }));
}
