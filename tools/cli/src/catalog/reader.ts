import * as fs from 'fs';
import * as path from 'path';

export function flattenCatalog(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenCatalog(v as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

export function readCatalog(catalogDir: string, lang: string): string[] {
  const filePath = path.join(catalogDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  return flattenCatalog(JSON.parse(content) as Record<string, unknown>);
}
