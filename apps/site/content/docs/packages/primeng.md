---
title: "@ngx-runtime-i18n/primeng"
description: Optional PrimeNG adapter that keeps PrimeNG's own translation config in sync with I18nService.lang().
eyebrow: docs.packages.primeng
order: 3
section: Packages
---

## Install

`primeng` is optional. Install it alongside the runtime core, Angular binding, and PrimeNG itself:

```bash
npm install @ngx-runtime-i18n/core @ngx-runtime-i18n/angular @ngx-runtime-i18n/primeng primeng
```

<content-callout data-type="note">

This package never runs unless you call `providePrimeNgRuntimeI18n(...)`, so it leaves the core and Angular stacks untouched if you don't use it. PrimeNG is a peer dependency — your app controls which version is installed and bundled. Supported range: PrimeNG 17 through 21, every MIT-licensed release. PrimeNG 22 moved to a commercial license, so this package doesn't claim to support it.

</content-callout>

## Setup

PrimeNG renamed its config service between major versions — `PrimeNGConfig` in `primeng/api` on v17, `PrimeNG` in `primeng/config` from v18 onward. Rather than hard-coding either, `providePrimeNgRuntimeI18n` takes the class as a `configToken`, so you pass whichever one matches your installed version:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';
import { providePrimeNgRuntimeI18n } from '@ngx-runtime-i18n/primeng';
import { PrimeNG } from 'primeng/config'; // PrimeNG 18-21
// import { PrimeNGConfig } from 'primeng/api'; // PrimeNG 17

const translationMap = {
  en: { firstDayOfWeek: 0 },
  es: { firstDayOfWeek: 1 },
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRuntimeI18n({
      defaultLang: 'en',
      supported: ['en', 'es'],
      fetchCatalog: (lang, signal) => fetch(`/i18n/${lang}.json`, { signal }).then((res) => res.json()),
    }),
    providePrimeNgRuntimeI18n({
      configToken: PrimeNG, // or PrimeNGConfig on PrimeNG 17
      resolveTranslation: (lang) => translationMap[lang] ?? {},
      onApplied: (lang) => console.debug(`PrimeNG translation ${lang} applied`),
    }),
  ],
};
```

## `providePrimeNgRuntimeI18n(options)`

| Option | Type | Description |
| --- | --- | --- |
| `configToken` | `ProviderToken<{ setTranslation(translation): void }>` | The PrimeNG config class installed in your app — `PrimeNGConfig` from `primeng/api` on v17, or `PrimeNG` from `primeng/config` on v18+. Typed structurally, not tied to either import. |
| `resolveTranslation` | `(lang: string) => Record<string, any> \| Promise<Record<string, any>>` | Returns PrimeNG's translation object for a given language. May return a plain object or a `Promise`. |
| `onApplied?` | `(lang: string) => void` | Optional callback invoked after the config instance has been updated for `lang`. |

## Translation resolvers

Use a static map for a small number of languages, or a lazy resolver to code-split each language's translations:

<content-tabs data-tablist-label="Translation resolver">
<div data-tab-label="Static map">

```ts
const translationMap = {
  en: { firstDayOfWeek: 0 },
  es: { firstDayOfWeek: 1 },
};

providePrimeNgRuntimeI18n({
  configToken: PrimeNG,
  resolveTranslation: (lang) => translationMap[lang] ?? {},
});
```

</div>
<div data-tab-label="Lazy import">

```ts
const translationResolvers = {
  en: () => import('./primeng/en').then((m) => m.PRIMENG),
  es: () => import('./primeng/es').then((m) => m.PRIMENG),
};

providePrimeNgRuntimeI18n({
  configToken: PrimeNG,
  resolveTranslation: (lang) => translationResolvers[lang]?.() ?? Promise.resolve({}),
});
```

</div>
</content-tabs>

Either way, `resolveTranslation` may return the object directly or a `Promise` — the adapter awaits whichever it gets back before applying it via `configToken`'s `setTranslation`.
