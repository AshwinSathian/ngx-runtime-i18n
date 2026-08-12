---
title: "@ngx-runtime-i18n/primeng"
description: Optional PrimeNG adapter that keeps PrimeNGConfig's translations in sync with I18nService.lang().
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

This package never runs unless you call `providePrimeNgRuntimeI18n(...)`, so it leaves the core and Angular stacks untouched if you don't use it. PrimeNG is a peer dependency — your app controls which version is installed and bundled.

</content-callout>

## Setup

Provide `I18nService` and the PrimeNG adapter together in your `ApplicationConfig`:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';
import { providePrimeNgRuntimeI18n } from '@ngx-runtime-i18n/primeng';

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
      resolveTranslation: (lang) => translationMap[lang] ?? {},
      onApplied: (lang) => console.debug(`PrimeNG translation ${lang} applied`),
    }),
  ],
};
```

## `providePrimeNgRuntimeI18n(options)`

| Option | Type | Description |
| --- | --- | --- |
| `resolveTranslation` | `(lang: string) => Record<string, any> \| Promise<Record<string, any>>` | Returns PrimeNG's translation object for a given language. May return a plain object or a `Promise`. |
| `onApplied?` | `(lang: string) => void` | Optional callback invoked after PrimeNG's `PrimeNGConfig` has been updated for `lang`. |

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
  resolveTranslation: (lang) => translationResolvers[lang]?.() ?? Promise.resolve({}),
});
```

</div>
</content-tabs>

Either way, `resolveTranslation` may return the object directly or a `Promise` — the adapter awaits whichever it gets back before applying it to `PrimeNGConfig`.
