# @ngx-runtime-i18n/core

Framework‑agnostic primitives for runtime internationalisation:

- Tiny, dependency‑free **ICU‑lite** formatter (interpolation + basic `plural`).
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

### `formatIcu(lang, key, catalog, params?, onMissingKey?)`

- **`lang: string`** — current language (for plural rules and future features).
- **`key: string`** — dotted path into the catalog.
- **`catalog: Catalog`** — a nested object of strings/objects.
- **`params?: Record<string, unknown>`** — interpolation values.
- **`onMissingKey?: (key: string) => string`** — transform for missing keys (defaults to returning the key).

### Types

- **`Catalog`** — `Record<string, unknown>` (nested object).
- **`RuntimeI18nConfig`** — shape shared with the Angular wrapper for consistency.

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
- Keep your catalogs **flat-ish and predictable** to avoid fragile deep paths.

---

## ICU-lite support

### Supported

- Basic `{param}` interpolation (tokens may include dots and hyphens for nested data).
- `plural` blocks with `one`, `other`, and `=n` selectors plus `#` replacement.
- Nested placeholders inside plural option bodies (balanced braces are retained).

### Not supported

- `select` or other ICU argument types beyond `plural`.
- Full ICU-style escaping, quoting, or nested plural/select grammar.
- Plural blocks inside other plural blocks (depth beyond one level is skipped).
- Escaping braces beyond the literals above; unmatched braces must not resemble valid tokens.

---

## License

MIT
