import type { Catalog } from './types';

// Tiny, deterministic formatter stub (ICU-like). Replace with real ICU in v0.1.
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

  // simple {name} interpolation
  out = out.replace(/\{(\w+)\}/g, (_m: string, p1: string) =>
    params[p1] != null ? String(params[p1]) : `{${p1}}`
  );

  // super light plural handling for demo: {count, plural, one {...} other {...} (=0/=1 supported)}
  out = out.replace(
    /\{(\w+),\s*plural,\s*([^}]+)\}/g,
    (_m: string, arg: string, body: string) => {
      const n = Number(params[arg] ?? 0);
      const options = parsePluralBody(body); // Record<string, string>
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

/** Parse a simple ICU plural clause body: e.g. `one {A} other {B} =0 {C}` */
function parsePluralBody(body: string): Record<string, string> {
  const map: Record<string, string> = {};
  // Match tokens like: "one {text}", "other {text}", "=0 {text}", "=1 {text}", "=\d+ {text}"
  const re = /(one|other|=\d+)\s*\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const key = m[1] as string;
    const val = (m[2] ?? '') as string;
    map[key] = val;
  }
  return map;
}
