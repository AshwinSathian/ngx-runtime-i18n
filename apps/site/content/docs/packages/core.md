---
title: "@ngx-runtime-i18n/core"
description: The framework-agnostic ICU-lite formatter and shared types the Angular wrapper builds on.
eyebrow: docs.packages.core
order: 1
section: Packages
---

## Install

```bash
npm i @ngx-runtime-i18n/core
```

`@ngx-runtime-i18n/core` has no dependencies and no Angular requirement — use it directly in any TypeScript project, or pull it in transitively via `@ngx-runtime-i18n/angular`.

## Quick start

```ts
import { formatIcu, type Catalog } from '@ngx-runtime-i18n/core';

const catalog: Catalog = {
  hello: { user: 'Hello, {name}!' },
  cart: { items: '{count, plural, one {1 item} other {# items}}' },
};

formatIcu('en', 'hello.user', catalog, { name: 'Ashwin' }); // "Hello, Ashwin!"
formatIcu('en', 'cart.items', catalog, { count: 2 }); // "2 items"
```

`key` supports dotted paths into the catalog (`hello.user`), and `formatIcu` is pure — it reads the catalog and params you pass and returns a string, with no side effects.

## `formatIcu(lang, key, catalog, params?, onMissingKey?)`

| Parameter | Type | Description |
| --- | --- | --- |
| `lang` | `string` | Current language. Used for plural rule selection. |
| `key` | `string` | Dotted path into the catalog, e.g. `hello.user`. |
| `catalog` | `Catalog` | A nested object of strings and objects. |
| `params?` | `Record<string, unknown>` | Interpolation values for `{param}` tokens. |
| `onMissingKey?` | `(key: string) => string` | Transform applied to a missing key. Defaults to returning the key unchanged. |

## Types

- **`Catalog`** — `Record<string, unknown>`, a nested object mapping keys to translation strings or further nested objects.
- **`RuntimeI18nConfig`** — the config shape shared with `@ngx-runtime-i18n/angular`, kept in `core` so both packages agree on it without a circular dependency.

## Catalog structure

```json
{
  "hello": { "user": "Hello, {name}!" },
  "cart": { "items": "{count, plural, one {1 item} other {# items}}" }
}
```

Keep one catalog file per language (`en.json`, `hi.json`, `de.json`, ...).

<content-callout data-type="tip">

For what ICU-lite's `{param}` interpolation, `plural`, `select`, and `selectordinal` blocks support — and where they stop short of full ICU MessageFormat — see [ICU-lite formatting](/docs/core-concepts/icu-lite).

</content-callout>

## Pitfalls and notes

- ICU-lite is not a full ICU implementation. It covers common interpolation, plural, select, and selectordinal cases with a small footprint, not the full ICU MessageFormat grammar.
- For Angular binding, signals, or SSR support, use `@ngx-runtime-i18n/angular` — `core` stays deliberately framework-agnostic.
- Keep catalogs flat and predictable. Deep nested paths are supported but get harder to maintain as they grow.
