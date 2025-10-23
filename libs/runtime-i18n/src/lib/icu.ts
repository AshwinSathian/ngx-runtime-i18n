/**
 * Very small ICU-like formatter with interpolation and plural basics.
 * Used by the Angular service and pipe. Replace with full ICU in a later minor.
 * @experimental
 */
import type { Catalog } from './types';

export function formatIcu(
  _lang: string,
  key: string,
  cat: Catalog,
  params: Record<string, unknown> = {},
  onMissingKey?: (k: string) => string
): string {
  const raw = lookup(key, cat);
  if (raw == null) return onMissingKey ? onMissingKey(key) : key;

  let out = String(raw);

  // {name} interpolation
  out = out.replace(/\{(\w+)\}/g, (_m: string, p1: string) =>
    params[p1] != null ? String(params[p1]) : `{${p1}}`
  );

  // {count, plural, one {...} other {...} (=n supported)}
  out = out.replace(
    /\{(\w+),\s*plural,\s*([^}]+)\}/g,
    (_m: string, arg: string, body: string) => {
      const n = Number(params[arg] ?? 0);
      const options = parsePluralBody(body);
      if (Number.isFinite(n)) {
        const exact = options[`=${n}`];
        if (exact) return exact;

        const one = options['one'];
        if (n === 1 && one) return one;

        const other = options['other'] ?? '';
        return other.replace(/#/g, String(n));
      }
      return options['other'] ?? '';
    }
  );

  return out;
}

function lookup(path: string, obj: any): any {
  return path
    .split('.')
    .reduce((o: any, k: string) => (o && k in o ? o[k] : undefined), obj);
}

function parsePluralBody(body: string): Record<string, string> {
  const map: Record<string, string> = {};
  const re = /(one|other|=\d+)\s*\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const key = m[1] as string;
    const val = (m[2] ?? '') as string;
    map[key] = val;
  }
  return map;
}
