/**
 * ICU-style formatter with interpolation, plural, select, selectordinal,
 * number/date/time arguments, and ICU apostrophe quoting.
 * Used by the Angular service and pipe.
 * @experimental
 */
import type { Catalog, PluralCategory, PluralResolver } from './types';

// Tokens may include dots or hyphens so nested object keys like "user.name" are practical.
// Every argument pattern below uses the same name class, so {user.age, number} and
// {item-count, plural, ...} work like {user.name}.
const INTERPOLATION_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_.-]*)\}/g;
const ARGUMENT_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_.-]*),\s*(number|date|time)\s*(?:,\s*([^{}]*?))?\s*\}/g;

// Quoted syntax characters are swapped for Unicode noncharacters while the message
// is parsed, so they can't open blocks, close blocks, or become `#`. Noncharacters are
// reserved for internal use and never appear in real catalog text or user input.
const QUOTED: Record<string, string> = { '{': '\uFDD0', '}': '\uFDD1', '#': '\uFDD2' };
const UNQUOTED: Record<string, string> = { '\uFDD0': '{', '\uFDD1': '}', '\uFDD2': '#' };
// Same prefix shape as the block scanner in replaceMessageBlocks.
const PLURAL_BLOCK_START = /\{[a-zA-Z_][a-zA-Z0-9_.-]*,\s*(?:plural|selectordinal),/y;

export function formatIcu(
  _lang: string,
  key: string,
  cat: Catalog,
  params: Record<string, unknown> | null = {},
  onMissingKey?: (k: string) => string,
  pluralResolver?: PluralResolver
): string {
  const raw = lookup(key, cat);
  if (raw == null) return onMissingKey ? onMissingKey(key) : key;

  const p = params ?? {};
  let out = protectQuoted(String(raw));

  // 1) Resolve {x, plural, ...}, {x, select, ...}, {x, selectordinal, ...} with a brace-balanced scanner.
  out = replaceMessageBlocks(out, _lang, p, pluralResolver);

  // 2) {x, number|date|time[, style]} arguments, including ones selected out of a block.
  //    Braces in the result are protected so step 3 never treats a param value as a placeholder.
  out = out.replace(ARGUMENT_PATTERN, (m: string, arg: string, type: string, style?: string) => {
    const v = own(p, arg);
    return v != null ? formatArgument(v, type, style ?? '', _lang).replace(/[{}]/g, (c) => QUOTED[c]) : m;
  });

  // 3) Simple {name} interpolation AFTER message block selection.
  INTERPOLATION_PATTERN.lastIndex = 0;
  out = out.replace(INTERPOLATION_PATTERN, (m: string, p1: string) => {
    const v = own(p, p1);
    return v != null ? String(v) : m;
  });

  return out.replace(/[\uFDD0-\uFDD2]/g, (c) => UNQUOTED[c]);
}

/** Own-property read, so `{constructor}` or `{toString, date}` can't resolve to Object.prototype. */
function own(params: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(params, key) ? params[key] : undefined;
}

/**
 * ICU apostrophe quoting (ApostropheMode.DOUBLE_OPTIONAL, as in ICU4J and FormatJS):
 * `''` is a literal `'`; a `'` directly before `{` or `}`, or before `#` inside a
 * plural/selectordinal block, quotes text up to the next lone `'` (or the end of the
 * message); any other `'` is literal.
 */
function protectQuoted(s: string): string {
  if (!s.includes("'")) return s;
  // One entry per open brace: is this text inside a plural/selectordinal block? Nested
  // blocks inherit it, matching how this formatter binds `#` through a nested select.
  const inPlural: boolean[] = [];
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    if (ch === '{') {
      PLURAL_BLOCK_START.lastIndex = i;
      inPlural.push(PLURAL_BLOCK_START.test(s) || (inPlural[inPlural.length - 1] ?? false));
    } else if (ch === '}') {
      inPlural.pop();
    }
    if (ch !== "'") { out += ch; continue; }
    const next = s.charAt(i + 1);
    if (next === "'") { out += "'"; i++; continue; }
    const quotes = next === '{' || next === '}' || (next === '#' && inPlural[inPlural.length - 1]);
    if (!quotes) { out += ch; continue; }
    for (i++; i < s.length; i++) {
      const q = s.charAt(i);
      if (q === "'") {
        if (s.charAt(i + 1) !== "'") break;
        i++;
      }
      out += QUOTED[q] ?? q;
    }
  }
  return out;
}

const DATE_STYLES = ['short', 'medium', 'long', 'full'];

function formatArgument(value: unknown, type: string, style: string, lang: string): string {
  if (type === 'number') {
    // Number('') and Number('  ') are 0; treat blank strings as unformattable instead.
    const n = typeof value === 'number' ? value : Number(String(value).trim() || NaN);
    if (!Number.isFinite(n)) return String(value);
    // `n === 0 ? 0 : n` below: Intl renders -0 (e.g. Math.round(-0.3)) as "-0"; String(-0) is "0".
    const currency = /^::currency\/(\S+)$/.exec(style);
    const opts: Intl.NumberFormatOptions =
      style === 'integer' ? { maximumFractionDigits: 0 }
      : style === 'percent' ? { style: 'percent' }
      : currency ? { style: 'currency', currency: currency[1] }
      : {};
    return cachedFormat('n', lang, style, () => new Intl.NumberFormat(normalizeLang(lang), opts))?.format(n === 0 ? 0 : n) ?? String(value);
  }

  // Only a Date or epoch milliseconds: `new Date(true)` is 1970, and a date-only string
  // is parsed as UTC midnight, which shows as the previous day west of Greenwich.
  const d = value instanceof Date ? value : typeof value === 'number' ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return String(value);
  const s = (DATE_STYLES.includes(style) ? style : 'medium') as Intl.DateTimeFormatOptions['dateStyle'];
  const opts: Intl.DateTimeFormatOptions = type === 'date' ? { dateStyle: s } : { timeStyle: s };
  return cachedFormat(type, lang, s as string, () => new Intl.DateTimeFormat(normalizeLang(lang), opts))?.format(d) ?? String(value);
}

// Keys are (kind x language x style). Real apps produce a handful, but formatIcu is public and
// a server could pass a request-derived `lang` (e.g. a raw Accept-Language value), so the cache
// is capped instead of growing per request. Clearing everything is crude but rare, and refills fast.
const MAX_FORMATTERS = 256;
const formatters = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | null>();

/** Builds formatters once per (kind, lang, style); `null` caches an invalid locale/currency. */
function cachedFormat<F extends Intl.NumberFormat | Intl.DateTimeFormat>(
  kind: string, lang: string, style: string, create: () => F
): F | null {
  const key = `${kind}|${lang}|${style}`;
  if (!formatters.has(key)) {
    let f: F | null = null;
    try { f = create(); } catch { /* RangeError: invalid locale or currency code */ }
    if (formatters.size >= MAX_FORMATTERS) formatters.clear();
    formatters.set(key, f);
  }
  return formatters.get(key) as F | null;
}

/** Intl rejects POSIX-style `en_US`; accept it as `en-US`. */
function normalizeLang(lang: string): string {
  return lang.replace(/_/g, '-');
}

function lookup(path: string, obj: unknown): unknown {
  return path
    .split('.')
    .reduce((o: unknown, k: string) =>
      o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k)
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
    const prefixMatch = /\{([a-zA-Z_][a-zA-Z0-9_.-]*),\s*(plural|select|selectordinal),\s*/y;
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
    const { offset, map: options } = parsePluralBody(body);

    if (keyword === 'plural' || keyword === 'selectordinal') {
      const n = Number(own(params, arg) ?? 0);
      if (Number.isFinite(n)) {
        const exact = options[`=${n}`];
        if (exact != null) {
          out += replaceHash(replaceMessageBlocks(exact, lang, params, pluralResolver), n - offset, lang);
          i = j;
          continue;
        }

        const shifted = n - offset;
        const category: PluralCategory = pluralResolver
          ? pluralResolver(shifted, lang)
          : Math.abs(shifted) === 1 ? 'one' : 'other';

        const match = options[category] ?? options['other'] ?? '';
        out += replaceHash(replaceMessageBlocks(match, lang, params, pluralResolver), shifted, lang);
      } else {
        out += replaceHash(replaceMessageBlocks(options['other'] ?? '', lang, params, pluralResolver), 0, lang);
      }
    } else {
      // select: look up param value directly, then resolve any nested keyword blocks
      const val = String(own(params, arg) ?? 'other');
      out += replaceMessageBlocks(options[val] ?? options['other'] ?? '', lang, params, pluralResolver);
    }

    i = j;
  }

  return out;
}

/** `#` is the plural count, formatted for the locale like `{n, number}` (1,234 / 1.234). */
function replaceHash(s: string, n: number, lang: string): string {
  return s.includes('#') ? s.replace(/#/g, formatArgument(n, 'number', '', lang)) : s;
}

/**
 * Parse a simple ICU plural/select clause body: e.g. `one {A} other {B} =0 {C}`.
 * Supports balanced brace bodies, nested forms, and a leading `offset:N` token.
 * The returned map has no prototype, so a selector value matching an
 * `Object.prototype` member name (e.g. "constructor") can never resolve to an
 * inherited function instead of `undefined`.
 */
function parsePluralBody(body: string): { offset: number; map: Record<string, string> } {
  const map: Record<string, string> = Object.create(null);
  const offsetMatch = /^\s*offset:\s*(\d+)\s*/.exec(body);
  const offset = offsetMatch ? Number(offsetMatch[1]) : 0;
  let i = offsetMatch ? offsetMatch[0].length : 0;

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

  return { offset, map };
}
