---
title: ICU-lite formatting
description: What the built-in formatter supports (interpolation, plural, select, selectordinal, number/date/time, quoting) and what it deliberately leaves out.
eyebrow: docs.core-concepts.icu-lite
order: 3
section: Core concepts
---

## What ICU-lite is

`@ngx-runtime-i18n/core` ships a tiny, dependency-free formatter called **ICU-lite**: interpolation, `plural`, `select`, and `selectordinal` blocks, `number`/`date`/`time` arguments formatted with the platform's `Intl` APIs, and ICU apostrophe quoting, modeled on ICU MessageFormat syntax.

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
- `{n, number}` arguments, formatted with `Intl.NumberFormat` for the active language. Styles: `integer`, `percent`, and the `::currency/XXX` skeleton (e.g. `{price, number, ::currency/EUR}`). Other styles fall back to plain number formatting.
- `{d, date}` and `{d, time}` arguments, formatted with `Intl.DateTimeFormat` in the runtime's local time zone. The value must be a `Date` or an epoch-millisecond number; anything else, including a date string, renders as `String(value)`. Styles: `short`, `medium` (default), `long`, `full`.
- `#` inside `plural`/`selectordinal` is formatted for the locale like `{n, number}` (`1,234` in `en`, `1.234` in `de`). As in ICU, a fractional count is rounded to three decimal places (`1.23456` renders `1.235`).
- ICU apostrophe quoting: `''` is a literal `'`; a `'` directly before `{` or `}`, or before `#` inside a `plural`/`selectordinal` block, quotes text up to the next lone `'` (`'{name}'` renders as `{name}`); any other `'` (as in `don't` or `'#42'` outside a plural) is literal.
- A missing argument is left as written (`{d, date}`), like a missing `{name}`. A value that can't be formatted (an invalid date, a non-numeric number, a malformed currency code such as `::currency/euro`, an invalid language tag) renders as `String(value)` instead of throwing. A well-formed but unassigned code such as `XYZ` is passed to `Intl`, which renders it as `XYZ 5.00`.

```ts
formatIcu('de', 'm', { m: 'Summe: {total, number, ::currency/EUR}' }, { total: 1234.5 }); // "Summe: 1.234,50 €"
formatIcu('en', 'm', { m: 'Due {due, date, long}' }, { due: new Date(2026, 0, 15) }); // "Due January 15, 2026"
formatIcu('en', 'm', { m: "Type '{name}' literally" }, {}); // "Type {name} literally"
```

<content-callout data-type="warning">

Apostrophe quoting changes how existing messages like `"Delete '{name}'?"` render: the quoted `{name}` is now literal text, per ICU. Write `"Delete ''{name}''?"` to keep the quotes around the interpolated value, or use typographic quotes (`‘{name}’`).

</content-callout>

## Not supported

- Number skeletons beyond `::currency/XXX`, date/time skeletons, and custom formatters.
- Choosing a time zone for `date`/`time`. With SSR, a server and a browser in different zones can render different text and cause a hydration mismatch, so pass a pre-formatted string for dates where that matters. The same goes for locale data: Node and each browser ship their own ICU version, and output can differ in small ways (for example a narrow no-break space before `PM`).
- Type-level awareness of quoting and nesting: `ExtractParams` still asks for `name` in `"'{name}'"`, and doesn't see arguments inside `plural`/`select` option bodies.
- Unmatched braces that resemble valid tokens; quote them (`'{'`) instead.

If your catalogs need the full ICU MessageFormat grammar (arbitrary skeletons, custom formatters), ICU-lite doesn't cover it.

## Keeping catalogs predictable

`key` supports dotted paths (e.g., `hello.user`) into a nested `Catalog` object, and `formatIcu` is pure and side-effect free. Keep catalogs flat-ish and predictable to avoid fragile deep paths.
