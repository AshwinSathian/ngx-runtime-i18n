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

// Matches: .t('key') or .t("key"), and the reactive signal helper .t$('key') or .t$("key")
const TS_T_CALL_REGEX = /\.t\$?\(\s*['"]([^'"]+)['"]/g;

export function scanTypeScriptFile(filePath: string): ScanResult[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results = new Map<string, KeyOccurrence[]>();

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    TS_T_CALL_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TS_T_CALL_REGEX.exec(line)) !== null) {
      const key = match[1];
      if (!results.has(key)) results.set(key, []);
      results.get(key)!.push({ file: filePath, line: lineIndex + 1 });
    }
  }

  return Array.from(results.entries()).map(([key, occurrences]) => ({ key, occurrences }));
}

export function scanTypeScriptDirectory(dir: string): ScanResult[] {
  const allResults = new Map<string, KeyOccurrence[]>();

  function walk(current: string): void {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        walk(fullPath);
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.spec.ts') &&
        !entry.name.endsWith('.d.ts')
      ) {
        const fileResults = scanTypeScriptFile(fullPath);
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
