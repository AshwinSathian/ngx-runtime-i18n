# @ngx-runtime-i18n

[![npm version](https://img.shields.io/npm/v/@ngx-runtime-i18n/angular.svg)](https://www.npmjs.com/package/@ngx-runtime-i18n/angular)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Signals-first runtime i18n for Angular — SSR-safe, hydration-friendly, ICU-lite, and configurable fallback chains.

---

## Features

- `provideRuntimeI18n()` installs `I18nService`, `I18nPipe`, and the optional `I18nCompatService` (RxJS bridge)
- Deterministic SSR → CSR via TransferState snapshots (see `apps/demo-ssr`)
- Per-key fallback chains: active lang → custom `fallbacks[]` → `defaultLang`
- Catalog caching modes: `none`, `memory`, or `storage` (localStorage revalidation)
- DX helpers: `lang()` signal plus `getCurrentLang()`, `getLoadedLangs()`, and `hasKey()`
- Hydration-safe: no DOM mutations before Angular stability

---

## Install

```bash
npm i @ngx-runtime-i18n/angular @ngx-runtime-i18n/core
```

---

## Usage

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRuntimeI18n(
      {
        defaultLang: 'en',
        supported: ['en', 'hi', 'de'],
        fallbacks: ['de'],
        fetchCatalog: (lang, signal) =>
          fetch(`/i18n/${lang}.json`, { signal }).then((r) => {
            if (!r.ok) throw new Error(`Failed to load catalog: ${lang}`);
            return r.json();
          }),
        onMissingKey: (key) => key,
      },
      {
        localeLoaders: {
          en: () => import('@angular/common/locales/global/en'),
          hi: () => import('@angular/common/locales/global/hi'),
          de: () => import('@angular/common/locales/global/de'),
        },
        options: {
          autoDetect: true,
          storageKey: '@ngx-runtime-i18n:lang',
          cacheMode: 'storage',
          cacheKeyPrefix: '@ngx-runtime-i18n:catalog:',
          preferNavigatorBase: true,
        },
      }
    ),
  ],
};
```

```html
<!-- Template -->
<h1>{{ 'hello.user' | i18n:{ name: username } }}</h1>
<p>{{ 'cart.items' | i18n:{ count: items().length } }}</p>
<small>Fallback → {{ 'legacy.title' | i18n }}</small>
```

```ts
// Component
import { Component, effect, inject, signal } from '@angular/core';
import { I18nPipe, I18nService } from '@ngx-runtime-i18n/angular';

@Component({
  standalone: true,
  imports: [I18nPipe],
  template: `
    <button (click)="switch('de')">Deutsch</button>
    <div>{{ i18n.t('hello.user', { name: 'Ashwin' }) }}</div>
  `,
})
export class ToolbarComponent {
  i18n = inject(I18nService);
  loaded = signal<string[]>([]);

  constructor() {
    effect(() => {
      this.i18n.lang(); // subscribe to the signal
      this.loaded.set(this.i18n.getLoadedLangs());
    });
  }

  async switch(lang: string) {
    if (this.i18n.ready()) await this.i18n.setLang(lang);
  }
}
```

Need RxJS? Inject `I18nCompatService` for `lang$`, `ready$`, and `t()` without signals.

---

## DX helpers

`I18nService` exposes synchronous utilities for tooling and debugging:

- `getCurrentLang()` — snapshot of the active language without reading the signal
- `getLoadedLangs()` — list of catalogs currently cached in memory
- `hasKey(key, lang = current)` — determine if a key exists before rendering

Pair these with Angular `effect()`/`computed()` to display diagnostics in dev tools.

---

## Fallback chains & catalog caching

- Configure `RuntimeI18nConfig.fallbacks?: string[]`. Lookup order is **active language → each fallback (in order) → `defaultLang`**. Missing keys then flow to `onMissingKey`.
- `RuntimeI18nOptions.cacheMode` controls persistence:
  - `none` — keep only the active fallback chain in memory
  - `memory` *(default)* — cache every loaded language for the session
  - `storage` — hydrate catalogs from `localStorage`, then refresh them in the background (`cacheKeyPrefix` controls storage keys)
- Server environments never touch `localStorage`; hydration stays deterministic when you seed TransferState.

---

## SSR example

The repo ships with `apps/demo-ssr`, a full Express + Angular SSR demo. The server reads catalogs from `dist/browser/i18n`, injects them via `i18nServerProviders`, and the browser reuses them through TransferState. Run it locally:

```bash
nx build demo-ssr
nx serve demo-ssr   # http://localhost:4000
```

---

## Demos

```bash
nx serve demo        # CSR demo with caching + fallbacks
nx serve demo-ssr    # SSR + hydration demo
```

Catalog JSON lives under `apps/demo*/public/i18n/<lang>.json`.

---

## Packages

| Package                                                            | Description                                                       |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [`@ngx-runtime-i18n/core`](libs/runtime-i18n/README.md)            | Framework-agnostic primitives (ICU-lite formatter, shared types). |
| [`@ngx-runtime-i18n/angular`](libs/runtime-i18n-angular/README.md) | Angular wrapper (signals, SSR-safe service, pipes).               |

---

## Docs

- [Angular package README](libs/runtime-i18n-angular/README.md)
- [Core package README](libs/runtime-i18n/README.md)
- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)

---

## License

MIT © Ashwin Sathian
