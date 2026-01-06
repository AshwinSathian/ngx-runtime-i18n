# @ngx-runtime-i18n/primeng

Optional PrimeNG adapter that listens to `I18nService.lang()` and applies the matching PrimeNG translations via `PrimeNGConfig`.

## Install

This package is optional ⏤ install it alongside the runtime core, Angular binding, and PrimeNG itself:

```bash
npm install @ngx-runtime-i18n/core @ngx-runtime-i18n/angular @ngx-runtime-i18n/primeng primeng
```

## Setup

Provide the runtime `I18nService` and the PrimeNG adapter together in your `ApplicationConfig`:

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

## Translation resolvers

Use simple maps for most apps, or lazy-load translation files for each language:

```ts
const translationResolvers = {
  en: () => import('./primeng/en').then((m) => m.PRIMENG),
  es: () => import('./primeng/es').then((m) => m.PRIMENG),
};

providePrimeNgRuntimeI18n({
  resolveTranslation: (lang) => translationResolvers[lang]?.() ?? Promise.resolve({}),
});
```

The resolver may return either a `Record<string, any>` directly or a `Promise` (e.g., from a dynamic import).

## Notes

- This package never runs unless you call `providePrimeNgRuntimeI18n(...)`, so it keeps the core and Angular stacks untouched.
- PrimeNG is only a peer dependency here; your app still controls the installed version and bundling surface.
