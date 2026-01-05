/**
 * Very small ICU-like formatter with interpolation and plural basics.
 * Used by the Angular service and pipe. Replace with full ICU in a later minor.
 * @experimental
 */
import type { Catalog } from './types';

// Tokens may include dots or hyphens so nested object keys like "user.name" are practical.
const INTERPOLATION_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_.-]*)\}/g;

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

  // 1) Resolve {x, plural, ...} with a brace-balanced scanner.
  out = replacePluralBlocks(out, (arg, body) => {
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
  });

  // 2) Simple {name} interpolation AFTER plural branch selection.
  INTERPOLATION_PATTERN.lastIndex = 0;
  out = out.replace(INTERPOLATION_PATTERN, (_m: string, p1: string) =>
    params[p1] != null ? String(params[p1]) : `{${p1}}`
  );

  return out;
}

function lookup(path: string, obj: any): any {
  return path
    .split('.')
    .reduce((o: any, k: string) => (o && k in o ? o[k] : undefined), obj);
}

/**
 * Replace all `{arg, plural, ...}` blocks in `s` using a brace-balanced scan.
 */
function replacePluralBlocks(
  s: string,
  render: (arg: string, body: string) => string
): string {
  let i = 0;
  let out = '';

  while (i < s.length) {
    const start = s.indexOf('{', i);
    if (start === -1) {
      out += s.slice(i);
      break;
    }
    out += s.slice(i, start);

    // Try to match the prefix "{arg, plural,"
    const prefixMatch = /\{(\w+),\s*plural,\s*/y;
    prefixMatch.lastIndex = start;
    const m = prefixMatch.exec(s);
    if (!m) {
      // Not a plural block; copy '{' and continue scanning after it.
      out += '{';
      i = start + 1;
      continue;
    }

    const arg = m[1];
    let j = prefixMatch.lastIndex; // position after the matched prefix

    // Find the matching closing '}' for the whole plural block with nesting.
    let depth = 1;
    while (j < s.length && depth > 0) {
      const ch = s.charAt(j++);
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }

    if (depth !== 0) {
      // Unbalanced; fall back to literal copy of the unmatched segment.
      out += s.slice(start, j);
      i = j;
      continue;
    }

    // Body is the contents between prefix end and the final '}'.
    const body = s.slice(prefixMatch.lastIndex, j - 1);
    const rendered = render(arg, body);
    out += rendered;
    i = j; // continue after the closing brace
  }

  return out;
}

/**
 * Parse a simple ICU plural clause body: e.g. `one {A} other {B} =0 {C}`.
 * Only literal selectors and balanced brace bodies are supported; nested plural/select forms are intentionally skipped.
 */
function parsePluralBody(body: string): Record<string, string> {
  const map: Record<string, string> = {};
  let i = 0;

  while (i < body.length) {
    // Skip whitespace between selectors.
    while (i < body.length && /\s/.test(body.charAt(i))) {
      i++;
    }
    if (i >= body.length) {
      break;
    }

    const keyStart = i;
    while (i < body.length && !/\s|\{/.test(body.charAt(i))) {
      i++;
    }
    if (keyStart === i) {
      break;
    }
    const key = body.slice(keyStart, i);

    // Skip whitespace before the opening brace.
    while (i < body.length && /\s/.test(body.charAt(i))) {
      i++;
    }
    if (body.charAt(i) !== '{') {
      break;
    }
    i++; // Consume '{'

    const valueStart = i;
    let depth = 1;
    // Consume until the matching closing brace; supports nested braces for placeholders.
    while (i < body.length && depth > 0) {
      const ch = body.charAt(i++);
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    if (depth !== 0) {
      // Unbalanced braces (malformed plural); bail out to avoid infinite loops.
      break;
    }

    const valueEnd = i - 1;
    map[key] = body.slice(valueStart, valueEnd);
  }

  return map;
}
