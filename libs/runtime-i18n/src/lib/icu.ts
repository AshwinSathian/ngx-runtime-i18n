/**
 * ICU-style formatter with interpolation, plural, select, and selectordinal support.
 * Used by the Angular service and pipe.
 * @experimental
 */
import type { Catalog, PluralCategory, PluralResolver } from './types';

// Tokens may include dots or hyphens so nested object keys like "user.name" are practical.
const INTERPOLATION_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_.-]*)\}/g;

export function formatIcu(
  _lang: string,
  key: string,
  cat: Catalog,
  params: Record<string, unknown> = {},
  onMissingKey?: (k: string) => string,
  pluralResolver?: PluralResolver
): string {
  const raw = lookup(key, cat);
  if (raw == null) return onMissingKey ? onMissingKey(key) : key;

  let out = String(raw);

  // 1) Resolve {x, plural, ...}, {x, select, ...}, {x, selectordinal, ...} with a brace-balanced scanner.
  out = replaceMessageBlocks(out, _lang, params, pluralResolver);

  // 2) Simple {name} interpolation AFTER message block selection.
  INTERPOLATION_PATTERN.lastIndex = 0;
  out = out.replace(INTERPOLATION_PATTERN, (_m: string, p1: string) =>
    params[p1] != null ? String(params[p1]) : `{${p1}}`
  );

  return out;
}

function lookup(path: string, obj: unknown): unknown {
  return path
    .split('.')
    .reduce((o: unknown, k: string) =>
      o && typeof o === 'object' && k in (o as Record<string, unknown>)
        ? (o as Record<string, unknown>)[k]
        : undefined,
      obj);
}

/**
 * Replace all `{arg, plural|select|selectordinal, ...}` blocks in `s` using a brace-balanced scan.
 */
function replaceMessageBlocks(
  s: string,
  lang: string,
  params: Record<string, unknown>,
  pluralResolver?: PluralResolver
): string {
  let i = 0;
  let out = '';

  while (i < s.length) {
    const start = s.indexOf('{', i);
    if (start === -1) { out += s.slice(i); break; }
    out += s.slice(i, start);

    // Try to match the prefix "{arg, plural|select|selectordinal,"
    const prefixMatch = /\{(\w+),\s*(plural|select|selectordinal),\s*/y;
    prefixMatch.lastIndex = start;
    const m = prefixMatch.exec(s);
    if (!m) {
      // Not a message block; copy '{' and continue scanning after it.
      out += '{';
      i = start + 1;
      continue;
    }

    const arg = m[1];
    const keyword = m[2] as 'plural' | 'select' | 'selectordinal';
    let j = prefixMatch.lastIndex; // position after the matched prefix

    // Find the matching closing '}' for the whole block with nesting.
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
    const options = parsePluralBody(body);

    if (keyword === 'plural' || keyword === 'selectordinal') {
      const n = Number(params[arg] ?? 0);
      if (Number.isFinite(n)) {
        const exact = options[`=${n}`];
        if (exact != null) { out += replaceHash(exact, n); i = j; continue; }

        const category: PluralCategory = pluralResolver
          ? pluralResolver(n, lang)
          : n === 1 ? 'one' : 'other';

        const match = options[category] ?? options['other'] ?? '';
        out += replaceHash(match, n);
      } else {
        out += replaceHash(options['other'] ?? '', Number(params[arg]));
      }
    } else {
      // select: look up param value directly
      const val = String(params[arg] ?? 'other');
      out += options[val] ?? options['other'] ?? '';
    }

    i = j;
  }

  return out;
}

function replaceHash(s: string, n: number): string {
  return s.replace(/#/g, String(n));
}

/**
 * Parse a simple ICU plural/select clause body: e.g. `one {A} other {B} =0 {C}`.
 * Supports balanced brace bodies and nested forms.
 */
function parsePluralBody(body: string): Record<string, string> {
  const map: Record<string, string> = {};
  let i = 0;

  while (i < body.length) {
    // Skip whitespace between selectors.
    while (i < body.length && /\s/.test(body.charAt(i))) i++;
    if (i >= body.length) break;

    const keyStart = i;
    while (i < body.length && !/[\s{]/.test(body.charAt(i))) i++;
    if (keyStart === i) break;
    const key = body.slice(keyStart, i);

    // Skip whitespace before the opening brace.
    while (i < body.length && /\s/.test(body.charAt(i))) i++;
    if (body.charAt(i) !== '{') break;
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

    map[key] = body.slice(valueStart, i - 1);
  }

  return map;
}
