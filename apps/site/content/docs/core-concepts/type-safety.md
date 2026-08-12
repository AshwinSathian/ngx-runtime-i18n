---
title: Type safety
description: Declare your catalog schema via module augmentation to get compile-time checked keys and params.
eyebrow: docs.core-concepts.type-safety
order: 4
section: Core concepts
---

## Declaring a schema

`I18nService.t()`, `I18nPipe`, and `I18nCompatService.t()` are fully generic once you declare your catalog schema via module augmentation.

Create a declaration file in your app (e.g. `src/i18n.d.ts`):

```ts
import type en from '../public/i18n/en.json';

declare module '@ngx-runtime-i18n/core' {
  interface I18nSchema {
    translations: typeof en;
  }
}
```

## What you get

With the schema declared, TypeScript enforces valid keys and narrows param types:

```ts
// OK — valid key
this.i18n.t('hello.user', { name: 'Ashwin' });

// Error — 'does.not.exist' is not in the catalog
this.i18n.t('does.not.exist');

// Error — missing required param 'name'
this.i18n.t('hello.user');
```

Key types are computed via `DeepKeys<T>` (dot-notation paths up to 4 levels). Interpolation params are extracted via `ExtractParams<S>` from the string literal value. Both types are exported from `@ngx-runtime-i18n/core` for advanced usage — for example, building your own typed wrapper around `t()`.

## Without a schema

When no schema is declared (the default), `t()` accepts plain `string`, preserving full backward compatibility. You can adopt module augmentation later without changing any call sites that already pass string literals.
