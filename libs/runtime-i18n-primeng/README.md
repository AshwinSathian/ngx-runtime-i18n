# @ngx-runtime-i18n/primeng

Optional PrimeNG adapter that listens to `I18nService.lang()` and applies the matching PrimeNG translations to PrimeNG's own config service.

Targets PrimeNG 17 through 21 - every MIT-licensed release. PrimeNG 22 moved to a commercial license ([PrimeTek's announcement](https://primeui.dev/nextchapter)); this package intentionally does not claim support for it. 18-21 are verified against a real, current PrimeNG install (`real-primeng.spec.ts`, driven through the actual `PrimeNG` config class); 17's `PrimeNGConfig` shape is supported structurally via `configToken` but isn't exercised by a real v17 install in CI, since the old type shim was removed in favor of testing against a real package.

## Install

This package is optional. Install it alongside the runtime core, Angular binding, and PrimeNG itself:

```bash
npm install @ngx-runtime-i18n/core @ngx-runtime-i18n/angular @ngx-runtime-i18n/primeng primeng
```

## Setup

PrimeNG renamed its config service between major versions: `PrimeNGConfig` in `primeng/api` on v17, `PrimeNG` in `primeng/config` from v18 onward. This package doesn't hard-code either - pass whichever one matches your installed version as `configToken`:

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

## Translation resolvers

Use simple maps for most apps, or lazy-load translation files for each language:

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

The resolver may return either a `Record<string, any>` directly or a `Promise` (e.g., from a dynamic import).

## Notes

- This package never runs unless you call `providePrimeNgRuntimeI18n(...)`, so it keeps the core and Angular stacks untouched.
- PrimeNG is only a peer dependency here; your app still controls the installed version and bundling surface. This package has no compile-time dependency on `primeng` at all - `configToken` is typed structurally, so it accepts anything with a `setTranslation(translation)` method, not a specific imported class.
