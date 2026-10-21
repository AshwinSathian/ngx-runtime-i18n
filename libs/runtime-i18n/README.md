# @ngx-runtime-i18n/core

Framework‑agnostic primitives for runtime internationalisation:

- Tiny, dependency‑free **ICU‑lite** formatter (interpolation, `plural`, `select`, `selectordinal`, `number`/`date`/`time` via `Intl`, apostrophe quoting).
- Shared types used by the Angular wrapper.

This package is designed to be used directly or via `@ngx-runtime-i18n/angular`.

---

## Install

```bash
npm i @ngx-runtime-i18n/core
```

---

## Quick Start

```ts
import { formatIcu, type Catalog } from '@ngx-runtime-i18n/core';

const catalog: Catalog = {
  hello: { user: 'Hello, {name}!' },
  cart: { items: '{count, plural, one {1 item} other {# items}}' },
};

formatIcu('en', 'hello.user', catalog, { name: 'Ashwin' }); // "Hello, Ashwin!"
formatIcu('en', 'cart.items', catalog, { count: 2 }); // "2 items"
```

- `key` supports dotted paths (e.g., `hello.user`).
- `plural` supports `one`, `other`, and exact matches like `=0`, `=2`.
- The function is pure and side‑effect free.

---

## API

### `formatIcu(lang, key, catalog, params?, onMissingKey?, pluralResolver?)`

- **`lang: string`**: current language (for plural rules and `Intl` number/date/time formatting).
- **`key: string`**: dotted path into the catalog.
- **`catalog: Catalog`**: a nested object of strings/objects.
- **`params?: Record<string, unknown> | null`**: interpolation values (`null`/`undefined` are both treated as no params).
- **`onMissingKey?: (key: string) => string`**: transform for missing keys (defaults to returning the key).
- **`pluralResolver?: PluralResolver`**: resolves the CLDR plural category for `plural`/`selectordinal` blocks. Without one, the built-in fallback treats `Math.abs(n) === 1` as `one` and everything else as `other` — English-shaped, but sign-agnostic (`-1` is also `one`).

### Types

- **`Catalog`**: `Record<string, unknown>` (nested object).
- **`RuntimeI18nConfig`**: shape shared with the Angular wrapper for consistency.
- **`I18nSchema`**: an empty, module-augmentable interface. Augment it in your app (see below) to unlock typed keys and params:
  ```ts
  // src/i18n.d.ts
  import type en from '../public/i18n/en.json';
  declare module '@ngx-runtime-i18n/core' {
    interface I18nSchema { translations: typeof en; }
  }
  ```
- **`TranslationKey`**: union of dot-notation key paths derived from `I18nSchema['translations']`, or `string` when no schema is augmented.
- **`TranslationParams<K>`**: the interpolation params required for key `K`, derived from parsing the catalog string for `K` at the type level. Falls back to `Record<string, unknown>` when no schema is augmented.
- **`DeepKeys<T>`** / **`ExtractParams<S>`**: the type-level machinery behind `TranslationKey`/`TranslationParams` — exported for advanced use (e.g. building your own typed helpers). `ExtractParams` balances nested braces inside `plural`/`select`/`selectordinal` clause bodies, so params are extracted correctly even when a clause contains its own `{...}` (e.g. `{count, plural, other {# items}}` still yields `{ count: number }`, not a param named after the whole clause body).
- **`ActiveCatalogType`**: the augmented catalog's shape (`I18nSchema['translations']`), or `Record<string, unknown>` when unaugmented.
- **`PluralCategory`**: `'zero' | 'one' | 'two' | 'few' | 'many' | 'other'` (CLDR TR35 categories).
- **`PluralResolver`**: `(count: number, locale: string) => PluralCategory` — see `pluralResolver` above.

---

## Catalog structure

```json
{
  "hello": { "user": "Hello, {name}!" },
  "cart": { "items": "{count, plural, one {1 item} other {# items}}" }
}
```

> Keep catalogs per language (e.g., `en.json`, `hi.json`).

---

## Pitfalls & Notes

- Not a full ICU implementation; aims to cover common 80% with a tiny footprint.
- If you need Angular binding or SSR helpers, prefer `@ngx-runtime-i18n/angular`.
- Keep your catalogs flat-ish and predictable to avoid fragile deep paths.

---

## ICU-lite support

### Supported

- Basic `{param}` interpolation (tokens may include dots and hyphens for nested data).
- `plural` blocks with `one`, `other`, `=n` selectors, `#` replacement, and an optional leading `offset:N` (subtracted from the count for category selection and `#`, but not for `=n` exact-match comparisons, per ICU).
- `select` blocks with arbitrary named options, falling back to `other` when a value doesn't match.
- `selectordinal` blocks, using the same `=n` exact-match syntax as `plural`. Without a custom plural resolver, both `plural` and `selectordinal` fall back to a plain `one`-if-equal-to-1/`other` rule; pass a `pluralResolver` for full CLDR (cardinal or ordinal) categories.
- Nesting `plural`, `select`, and `selectordinal` blocks inside each other, including the same keyword nested inside itself, to arbitrary depth.
- `{n, number}` arguments, formatted with `Intl.NumberFormat` for the active language. Styles: `integer`, `percent`, and the `::currency/XXX` skeleton (e.g. `{price, number, ::currency/EUR}`). Other styles fall back to plain number formatting.
- `{d, date}` and `{d, time}` arguments, formatted with `Intl.DateTimeFormat` in the runtime's local time zone. The value must be a `Date` or an epoch-millisecond number; anything else, including a date string, renders as `String(value)`. Styles: `short`, `medium` (default), `long`, `full`.
- `#` inside `plural`/`selectordinal` is formatted for the locale like `{n, number}` (`1,234` in `en`, `1.234` in `de`). As in ICU, a fractional count is rounded to three decimal places (`1.23456` renders `1.235`).
- ICU apostrophe quoting: `''` is a literal `'`; a `'` directly before `{` or `}`, or before `#` inside a `plural`/`selectordinal` block, quotes text up to the next lone `'` (`'{name}'` renders as `{name}`); any other `'` (as in `don't` or `'#42'` outside a plural) is literal.
- A missing argument is left as written (`{d, date}`), like a missing `{name}`. A value that can't be formatted (an invalid date, a non-numeric number, a malformed currency code such as `::currency/euro`, an invalid language tag) renders as `String(value)` instead of throwing. A well-formed but unassigned code such as `XYZ` is passed to `Intl`, which renders it as `XYZ 5.00`.

### Not supported

- Number skeletons beyond `::currency/XXX`, date/time skeletons, and custom formatters.
- Choosing a time zone for `date`/`time`. With SSR, a server and a browser in different zones can render different text and cause a hydration mismatch, so pass a pre-formatted string for dates where that matters. The same goes for locale data: Node and each browser ship their own ICU version, and output can differ in small ways (for example a narrow no-break space before `PM`).
- Type-level awareness of quoting and nesting: `ExtractParams` still asks for `name` in `"'{name}'"`, and doesn't see arguments inside `plural`/`select` option bodies.
- Unmatched braces that resemble valid tokens; quote them (`'{'`) instead.

---

## License

MIT
