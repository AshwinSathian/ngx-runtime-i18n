---
title: Type-safe catalogs
description: Walk through module augmentation end to end — declaring a schema, seeing t() get checked, and reading what DeepKeys and ExtractParams actually compute.
eyebrow: recipes.type-safe-catalogs
order: 4
packages: ['@ngx-runtime-i18n/core', '@ngx-runtime-i18n/angular']
---

By default, `I18nService.t()` accepts any `string` as a key — there's no compile-time link between your catalog files and your call sites. This recipe walks through declaring a schema so `t()`, `I18nPipe`, and `I18nCompatService.t()` all get checked against your actual catalog, with a worked example of what the underlying types compute.

## 1. Declare a schema

Create a declaration file in your app, importing the catalog you ship for one language (typically the default):

```ts
// src/i18n.d.ts
import type en from '../public/i18n/en.json';

declare module '@ngx-runtime-i18n/core' {
  interface I18nSchema {
    translations: typeof en;
  }
}
```

`I18nSchema` is an empty interface exported for exactly this purpose — augmenting it is how every generic in the library picks up your catalog shape. No import of `i18n.d.ts` is needed anywhere else; TypeScript picks up ambient declaration files automatically as long as they're included in your `tsconfig`.

## 2. Watch `t()` get checked

Given a catalog like:

```json
// public/i18n/en.json
{
  "hello": { "user": "Hello, {name}!" },
  "cart": { "items": "{count, plural, one {1 item} other {# items}}" }
}
```

these calls now type-check against it:

```ts
// OK — valid key, correct param
this.i18n.t('hello.user', { name: 'Ashwin' });

// OK — plural param inferred as number
this.i18n.t('cart.items', { count: 3 });

// Error — 'does.not.exist' is not in the catalog
this.i18n.t('does.not.exist');

// Error — missing required param 'name'
this.i18n.t('hello.user');

// Error — 'count' must be a number, not a string
this.i18n.t('cart.items', { count: '3' });
```

The same checking applies to `I18nPipe` in templates (`{{ 'hello.user' | i18n:{ name: username } }}`) and to `I18nCompatService.t()`, since both call through the same generic key and param types.

## 3. What `DeepKeys` and `ExtractParams` compute

Two exported types do the work, and reading their output directly makes the mechanism concrete.

**`DeepKeys<T>`** turns a nested catalog object into a union of dot-notation paths, capped at 4 levels deep:

```ts
import type { DeepKeys } from '@ngx-runtime-i18n/core';

type Catalog = {
  hello: { user: string };
  cart: { items: string };
};

type Keys = DeepKeys<Catalog>;
// 'hello' | 'hello.user' | 'cart' | 'cart.items'
```

Note that `DeepKeys` includes the intermediate path (`'hello'`) as well as the leaf (`'hello.user'`) — both are valid `keyof` results at each nesting level, but only leaves that resolve to a string produce a formattable value at runtime. The depth cap exists so a large catalog (thousands of keys) doesn't slow the compiler down building a recursive union — more on that below.

**`ExtractParams<S>`** reads a string literal type and derives the interpolation params it requires:

```ts
import type { ExtractParams } from '@ngx-runtime-i18n/core';

type P1 = ExtractParams<'Hello, {name}!'>;
// { name: string | number }

type P2 = ExtractParams<'{count, plural, one {1 item} other {# items}}'>;
// { count: number }
```

Plain `{token}` interpolation produces `string | number` params. ICU keyword blocks (`plural`, `select`, `selectordinal`) narrow the argument to `number` specifically, since plural category selection needs a numeric count. `TranslationParams<K>` composes `DeepKeys` and `ExtractParams` to resolve the params type for a given key — it's what `t()` actually uses to type its second argument.

## 4. The 4-level depth cap

`DeepKeys` stops recursing at 4 levels by default (configurable via its second type parameter). This guards against a real TypeScript issue: recursive conditional types over large object literals get measurably slower to check as the object grows, and catalogs with thousands of keys have hit compiler slowdowns in comparable libraries. If your catalog needs a 5th level, either flatten that branch (`"cart.checkout.summary.total"` as a single key instead of four nested objects) or pass a higher depth explicitly when you use `DeepKeys` yourself for a custom wrapper — the exported type accepts it as a parameter.

## Without a schema

Skipping `i18n.d.ts` entirely is fully supported — `t()` falls back to accepting any `string`, so nothing about adopting the library requires this step up front. Teams typically add the schema once catalogs stabilize, since every existing call site with a string literal key keeps compiling once the schema is added (it only starts rejecting the wrong ones).

<content-callout data-type="tip">

For the fallback-chain and caching behavior `t()` reads at runtime — as opposed to what's checked at compile time here — see [Fallback chains](/docs/core-concepts/fallback-chains) and [Catalog caching](/docs/core-concepts/caching).

</content-callout>
