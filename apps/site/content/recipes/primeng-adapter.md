---
title: PrimeNG adapter
description: Keep PrimeNGConfig's translation object in sync with I18nService.lang(), and pick between a static map and a lazy resolver.
eyebrow: recipes.primeng-adapter
order: 6
packages: ['@ngx-runtime-i18n/primeng']
---

PrimeNG components (calendar, data table, file upload, and others) read their built-in strings from a single `PrimeNGConfig.setTranslation()` call, separate from your own catalog. `@ngx-runtime-i18n/primeng` calls it for you every time `I18nService.lang()` changes, so a language switch updates PrimeNG's chrome along with the rest of the app.

```bash
npm install @ngx-runtime-i18n/core @ngx-runtime-i18n/angular @ngx-runtime-i18n/primeng primeng
```

The adapter never runs unless you call `providePrimeNgRuntimeI18n(...)`, so it leaves the core and Angular stacks untouched if your app doesn't use it. PrimeNG stays a peer dependency — your app controls the installed version.

## Setup

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';
import { providePrimeNgRuntimeI18n } from '@ngx-runtime-i18n/primeng';

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

`resolveTranslation` should return an object matching PrimeNG's own `Translation` interface — `dayNames`, `monthNames`, `today`, `clear`, `dateFormat`, and the rest of the strings PrimeNG's calendar, data table, and other components read internally. The README examples above show only `firstDayOfWeek` for brevity; a real app typically fills in most of the interface per language.

## Static map vs. lazy resolver

Both approaches satisfy the same `resolveTranslation` signature — pick based on how many languages you ship and whether PrimeNG's translation strings are worth code-splitting out of your main bundle:

<content-tabs data-tablist-label="Translation resolver">
<div data-tab-label="Static map">

```ts
const translationMap = {
  en: { firstDayOfWeek: 0, dateFormat: 'mm/dd/yy' /* ...rest of Translation */ },
  es: { firstDayOfWeek: 1, dateFormat: 'dd/mm/yy' /* ...rest of Translation */ },
};

providePrimeNgRuntimeI18n({
  resolveTranslation: (lang) => translationMap[lang] ?? {},
});
```

Simplest option for a handful of languages — everything ships in the main bundle, and `resolveTranslation` is a synchronous lookup.

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

Each language's translation object lives in its own chunk and only downloads when that language becomes active — worth it once you're shipping more than a couple of languages' worth of PrimeNG strings.

</div>
</content-tabs>

Either shape works because `resolveTranslation` may return the object directly or a `Promise` — the adapter awaits whichever it gets back before calling `PrimeNGConfig.setTranslation()`.

## Caching and rapid switches

The adapter caches each language's resolved translation object internally after the first resolution, so switching back to a previously-used language reapplies the cached object without calling `resolveTranslation` again.

It also guards against a resolver race: if a user switches language twice before the first `resolveTranslation()` promise settles, the adapter checks that the requested language is still the active one before calling `setTranslation()` — a stale response from an earlier switch never overwrites a newer one. This matters for the lazy-import pattern in particular, since dynamic imports can resolve out of order under a slow network.

<content-callout data-type="tip">

`onApplied` fires only after `setTranslation()` runs for the language that ended up winning the race above — a reliable place to hook diagnostics that confirm PrimeNG's chrome actually updated, as distinct from a resolution merely being requested.

</content-callout>
