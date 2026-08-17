---
title: ICU-lite formatting
description: What the built-in formatter supports (interpolation, plural, select, selectordinal) and what it deliberately leaves out.
eyebrow: docs.core-concepts.icu-lite
order: 3
section: Core concepts
---

## What ICU-lite is

`@ngx-runtime-i18n/core` ships a tiny, dependency-free formatter called **ICU-lite**: interpolation plus `plural`, `select`, and `selectordinal` blocks, modeled loosely on ICU MessageFormat syntax.

```ts
import { formatIcu, type Catalog } from '@ngx-runtime-i18n/core';

const catalog: Catalog = {
  hello: { user: 'Hello, {name}!' },
  cart: { items: '{count, plural, one {1 item} other {# items}}' },
  gender: '{gender, select, male {He is a developer} female {She is a developer} other {They are a developer}}',
};

formatIcu('en', 'hello.user', catalog, { name: 'Ashwin' }); // "Hello, Ashwin!"
formatIcu('en', 'cart.items', catalog, { count: 2 }); // "2 items"
formatIcu('en', 'gender', catalog, { gender: 'male' }); // "He is a developer"
formatIcu('en', 'gender', catalog, { gender: 'nonbinary' }); // "They are a developer" (falls back to "other")
```

<content-callout data-type="warning">

ICU-lite is not a full ICU implementation. It aims to cover the common 80% of message-formatting needs with a tiny footprint.

</content-callout>

## Supported

- Basic `{param}` interpolation (tokens may include dots and hyphens for nested data).
- `plural` blocks with `one`, `other`, exact-match selectors like `=0` or `=2`, and `#` replacement for the count.
- `select` blocks with arbitrary named options (any string value, not just `male`/`female`), falling back to `other` when the value has no matching option or the param is missing.
- `selectordinal` blocks, using the same `=n` exact-match and `#` replacement as `plural`. Without a custom plural resolver, `plural` and `selectordinal` both fall back to a plain `one`-if-equal-to-1/`other` rule — pass a `pluralResolver` that implements CLDR ordinal rules to get real `one`/`two`/`few`/`other` ordinal categories (for "1st"/"2nd"/"3rd"/"4th"-style output).
- Nesting `plural`, `select`, and `selectordinal` blocks inside each other, including the same keyword nested inside itself, to arbitrary depth. `#` stays bound to its nearest enclosing `plural`/`selectordinal` block even when nested inside a `select`.
- Nested placeholders inside option bodies (balanced braces are retained).

## Not supported

- ICU-style escaping or quoting (`''` for a literal apostrophe, `'{'` to escape a brace) — quotes and braces pass through as written.
- Argument types beyond `plural`, `select`, and `selectordinal` (ICU's `number`, `date`, `time`, or custom formatters).
- Escaping braces beyond the cases above; unmatched braces must not resemble valid tokens.

If your catalogs need full ICU MessageFormat — `number`/`date`/`time` formatting, or quote/brace escaping — ICU-lite doesn't cover it.

## Keeping catalogs predictable

`key` supports dotted paths (e.g., `hello.user`) into a nested `Catalog` object, and `formatIcu` is pure and side-effect free. Keep catalogs flat-ish and predictable to avoid fragile deep paths.
