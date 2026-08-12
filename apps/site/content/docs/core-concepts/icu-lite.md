---
title: ICU-lite formatting
description: What the built-in formatter supports (interpolation and basic plural) and what it deliberately leaves out.
eyebrow: docs.core-concepts.icu-lite
order: 3
section: Core concepts
---

## What ICU-lite is

`@ngx-runtime-i18n/core` ships a tiny, dependency-free formatter called **ICU-lite**: interpolation plus a basic `plural` form, modeled loosely on ICU MessageFormat syntax.

```ts
import { formatIcu, type Catalog } from '@ngx-runtime-i18n/core';

const catalog: Catalog = {
  hello: { user: 'Hello, {name}!' },
  cart: { items: '{count, plural, one {1 item} other {# items}}' },
};

formatIcu('en', 'hello.user', catalog, { name: 'Ashwin' }); // "Hello, Ashwin!"
formatIcu('en', 'cart.items', catalog, { count: 2 }); // "2 items"
```

<content-callout data-type="warning">

ICU-lite is not a full ICU implementation. It aims to cover the common 80% of message-formatting needs with a tiny footprint, not to be a drop-in replacement for `Intl.MessageFormat` or a full ICU MessageFormat library.

</content-callout>

## Supported

- Basic `{param}` interpolation (tokens may include dots and hyphens for nested data).
- `plural` blocks with `one`, `other`, and exact-match selectors like `=0` or `=2`, plus `#` replacement for the count.
- Nested placeholders inside plural option bodies (balanced braces are retained).

## Not supported

- `select` or any other ICU argument type beyond `plural`.
- Full ICU-style escaping, quoting, or nested plural/select grammar.
- Plural blocks inside other plural blocks (depth beyond one level is skipped).
- Escaping braces beyond the cases above; unmatched braces must not resemble valid tokens.

If your catalogs need `select`, gender-based forms, or nested plural/select grammar, ICU-lite doesn't cover it. Reach for a full ICU MessageFormat library on top of `@ngx-runtime-i18n/core`'s plain string catalogs.

## Keeping catalogs predictable

`key` supports dotted paths (e.g., `hello.user`) into a nested `Catalog` object, and `formatIcu` is pure and side-effect free. Keep catalogs flat-ish and predictable to avoid fragile deep paths.
