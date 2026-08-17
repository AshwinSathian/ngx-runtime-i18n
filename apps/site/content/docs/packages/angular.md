---
title: "@ngx-runtime-i18n/angular"
description: The signals-first, SSR-safe Angular wrapper — provideRuntimeI18n(), I18nService, I18nPipe, and route-scoped catalogs.
eyebrow: docs.packages.angular
order: 2
section: Packages
---

## Install

Install `angular` alongside `core` — the Angular package expects a matching `core` version as a peer dependency:

```bash
npm i @ngx-runtime-i18n/angular @ngx-runtime-i18n/core
```

Peer support: `@angular/common`, `@angular/core`, and `@angular/platform-browser` at `>=16 <23`.

## Directory layout

```
your-app/
  public/
    i18n/
      en.json
      hi.json
      de.json
  src/
```

At runtime, catalogs are fetched from `/i18n/<lang>.json` by default in the examples on this page — the exact path is whatever your `fetchCatalog` function requests.

## Register provideRuntimeI18n()

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    provideRuntimeI18n(
      {
        defaultLang: 'en',
        supported: ['en', 'hi', 'de'],
        fallbacks: ['de'],
        fetchCatalog: (lang, signal, scope) =>
          fetch(scope ? `/i18n/${scope}/${lang}.json` : `/i18n/${lang}.json`, { signal }).then((r) => {
            if (!r.ok) throw new Error(`Failed to load catalog: ${lang}`);
            return r.json();
          }),
        onMissingKey: (k) => k,
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
      },
    ),
  ],
};
```

## `provideRuntimeI18n(config, { localeLoaders?, options?, stateKeyPrefix? })`

### `config`

| Field | Type | Description |
| --- | --- | --- |
| `defaultLang` | `string` | Fallback language, used last in the resolution chain. |
| `supported` | `string[]` | Authoritative list of allowed languages. |
| `fallbacks?` | `string[]` | Ordered fallback chain checked before `defaultLang`. See [fallback chains](/docs/core-concepts/fallback-chains). |
| `fetchCatalog` | `(lang, signal?, scope?) => Promise<Catalog>` | Async catalog loader. Should be idempotent and honor `AbortSignal`. `scope` is set when loading a route-scoped catalog registered via `withI18nScope()`. |
| `onMissingKey?` | `(key: string) => string` | Transform for a key missing across the whole fallback chain. |

### Second argument

| Field | Type | Description |
| --- | --- | --- |
| `localeLoaders?` | `Record<string, () => Promise<unknown>>` | Map of language to a dynamic import of Angular locale data, needed for `DatePipe`, `DecimalPipe`, and other Angular pipes to localize. |
| `options.autoDetect?` | `boolean` | On first boot, resolves language as persisted → navigator → default. |
| `options.storageKey?` | `string \| false` | `localStorage` key for the chosen language. Falsy disables persistence. |
| `options.cacheMode?` | `'none' \| 'memory' \| 'storage'` | Catalog caching strategy. Default `'memory'`. See [catalog caching](/docs/core-concepts/caching). |
| `options.cacheKeyPrefix?` | `string` | Storage prefix used when `cacheMode === 'storage'`. |
| `options.preferNavigatorBase?` | `boolean` | Maps a tag like `en-GB` to `en` when `en` is in `supported`. |
| `stateKeyPrefix?` | `string` | Advanced: customize TransferState keys when embedding multiple i18n instances. |

## `I18nService`

Signals-first service, injected with `inject(I18nService)`.

#### Signals

| Signal | Description |
| --- | --- |
| `lang()` | The active language. |
| `ready()` | `true` once the active language's catalog has loaded. |
| `switching()` | `true` from the moment `setLang()` is called with a new language until it resolves. |
| `activeSwitchLang()` | The requested language while a switch is in flight, `null` otherwise. |

#### Methods

| Method | Description |
| --- | --- |
| `t(key, params?)` | Format a key against the active language's catalog. |
| `t$(key, params?)` | Returns a `Signal<string>` that recomputes only when the language or params change — see below. |
| `setLang(lang)` | Switch the active language. Cancels any in-flight switch for the previous request. |
| `getCurrentLang()` | Snapshot the current language without subscribing to `lang()`. |
| `getLoadedLangs()` | Inspect which catalogs are resident in memory. |
| `hasKey(key, lang?)` | Check catalog coverage for a key without formatting it. Defaults to the active language. |
| `preloadLang(lang)` | Warm a single language's catalog (including its fallback catalogs) without changing the active language. |
| `preloadLangs(langs)` | Warm several languages in parallel. |
| `preloadFallbackChain(lang?)` | Warm a language and its configured fallbacks. Defaults to the active language. |

```ts
const i18n = inject(I18nService);

// Disable the switcher while the next catalog downloads.
const onSwitch = (lang: string) => {
  if (i18n.switching()) return;
  i18n.setLang(lang);
};

// Warm caches for languages the user is likely to pick.
await i18n.preloadLangs(['de', 'hi']);
```

## `I18nPipe`

```html
<h1>{{ 'hello.user' | i18n:{ name: username } }}</h1>
<p>{{ 'cart.items' | i18n:{ count: items().length } }}</p>
```

Impure (`pure: false`) but listens only to `lang`, so it only recomputes when the language changes, not on every change-detection cycle.

## `I18nCompatService`

RxJS equivalent of `I18nService` for codebases not yet on signals: `lang$`, `ready$`, and `t()`.

## `t$()` signal helper

`I18nService.t$()` returns a `Signal<string>` that recomputes only when the active language or the params change — useful in signal-heavy templates where the impure pipe's per-cycle check adds up.

```ts
@Component({
  template: `{{ greeting() }}`,
})
export class MyComponent {
  private i18n = inject(I18nService);

  // Static params — recomputes only on lang change.
  readonly greeting = this.i18n.t$('hello.user', { name: 'Ashwin' });

  // Reactive params — recomputes when either lang or params signal changes.
  private username = signal('Ashwin');
  readonly dynamicGreeting = this.i18n.t$('hello.user', this.username as unknown as Signal<Record<string, unknown>>);
}
```

## Route-scoped catalogs with `withI18nScope()`

Load a feature-specific catalog only when a route activates, and unload it when the route is destroyed:

```ts
import { withI18nScope } from '@ngx-runtime-i18n/angular';

export const routes: Routes = [
  {
    path: 'checkout',
    loadComponent: () => import('./checkout/checkout.component'),
    providers: [withI18nScope('checkout')],
  },
];
```

Activating the `checkout` scope calls `fetchCatalog(lang, signal, 'checkout')` — the same `fetchCatalog` used for the global catalog, with the third argument set. Your implementation decides the URL shape, e.g. `` scope ? `/i18n/${scope}/${lang}.json` : `/i18n/${lang}.json` ``.

Resolution order: scope catalogs (most recently loaded scope wins) → global catalog → fallback chain → `onMissingKey`.

Scope catalogs are cleaned up automatically via `DestroyRef` when the route's environment injector is destroyed.

## SSR and hydration

`provideRuntimeI18nSsr()` seeds Angular's TransferState on the server with the keys `provideRuntimeI18n()` reads on the client, so the first client render matches the server-rendered markup. See [SSR and hydration](/docs/core-concepts/ssr-hydration) for the full setup, including the requirement to put `provideRuntimeI18nSsr()`'s return value directly into `providers` — it's an opaque `EnvironmentProviders` value, and spreading it breaks.

## Type safety

Declare a catalog schema via module augmentation to get compile-time checked keys and interpolation params on `t()`, `I18nPipe`, and `I18nCompatService.t()`. See [type safety](/docs/core-concepts/type-safety).

## Pitfalls and gotchas

- Angular pipes not localizing: check that `localeLoaders` includes an entry for the language under test.
- Hydration mismatch: seed TransferState on SSR. The wrapper is hydration-safe when the first paint uses server data.
- 404 for catalogs: place catalog files under `public/i18n` (a sibling of `src/`, not nested inside it) so they serve as `/i18n/*.json` in both dev and prod.
- Rapid language toggles: supported. The wrapper cancels in-flight fetches when `setLang()` is called again before the previous switch resolves; your `fetchCatalog` must respect the passed `AbortSignal` for this to work.

## Versioning and support

- Angular: `>=16 <23`
- Node: latest LTS recommended
- SemVer: breaking changes bump the major version.
