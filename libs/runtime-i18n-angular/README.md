# @ngx-runtime-i18n/angular

Lean, SSR‑safe Angular wrapper around `@ngx-runtime-i18n/core`.

- Signals‑first service (`I18nService`) and `I18nPipe` for ergonomic templates
- Optional `I18nCompatService` (RxJS) for non‑signals apps
- SSR‑aware: TransferState snapshot on the server, hydration‑safe on the client
- Cancellation‑aware language switching (rapid toggles won’t corrupt state)
- Lazy Angular locale data per language to power pipes (`DatePipe`, `DecimalPipe`, ...)
- Configurable fallback chains with in-memory or localStorage catalog caching

Peer support: `@angular/* >=16 <22`

---

## Install

Always install both packages explicitly:

```bash
npm i @ngx-runtime-i18n/angular @ngx-runtime-i18n/core
```

---

## Directory layout (recommended)

```
your-app/
  src/
    public/
      i18n/
        en.json
        hi.json
        de.json
```

At runtime, catalogs are fetched from `/i18n/<lang>.json` by default in our examples.

---

## Quick Start (CSR)

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
      }
    ),
  ],
};
```

**Template usage**

```html
<h1>{{ 'hello.user' | i18n:{ name: username } }}</h1>
<p>{{ 'cart.items' | i18n:{ count: items().length } }}</p>
```

**Component usage**

```ts
import { Component, inject } from '@angular/core';
import { I18nService, I18nPipe } from '@ngx-runtime-i18n/angular';

@Component({
  standalone: true,
  imports: [I18nPipe],
  template: `
    <button (click)="switch('de')">Deutsch</button>
    <div *ngIf="i18n.ready()">{{ i18n.t('hello.user', { name: 'Ashwin' }) }}</div>
  `,
})
export class SomeCmp {
  i18n = inject(I18nService);
  switch(lang: string) {
    if (this.i18n.ready()) this.i18n.setLang(lang);
  }
}
```

---

## DX helpers

`I18nService` exposes synchronous helpers that pair nicely with Angular signals during development:

- `getCurrentLang()`: snapshot the current language without subscribing to `lang()`.
- `getLoadedLangs()`: inspect which catalogs are resident in memory.
- `hasKey(key, lang = current)`: check catalog coverage without formatting.

```ts
const lang = i18n.getCurrentLang();
const loaded = i18n.getLoadedLangs();
const missingLegacy = !i18n.hasKey('legacy.title');
```

Render these in diagnostics panels or dev tools to confirm when catalogs hydrate.

## Switching & preloading

`I18nService` now exposes two additional signals:

- `switching()` becomes `true` as soon as you call `setLang()` with a new language, so you can show a spinner or disable controls.
- `activeSwitchLang()` mirrors the requested language (`null` otherwise), letting you render “Switching to fr…” helper text.

It also adds preload helpers that warm the same loaders used by `setLang()` without mutating the active language:

- `preloadLang(lang)` for a single language (includes fallback catalogs).
- `preloadLangs(langs)` for parallel prefetches (good when the user’s likely languages are known up front).
- `preloadFallbackChain(lang?)` to hydrate a language and its configured fallbacks (defaults to the active lang if none is passed).

```ts
const i18n = inject(I18nService);

// Disable the switcher while the next catalog downloads.
readonly onSwitch = (lang: string) => {
  if (i18n.switching()) return;
  i18n.setLang(lang);
};

// Warm caches for a user who usually toggles between German and Hindi.
await i18n.preloadLangs(['de', 'hi']);

// Preload the active route’s fallback chain before navigation.
await i18n.preloadFallbackChain('fr');
```

Use this to preload catalogs during login, before showing a heavy route, or while waiting for other async work; the currently active language and UI stay stable.

---

## Fallback chains

- Configure `RuntimeI18nConfig.fallbacks?: string[]` to build an ordered lookup. Resolution always runs as active language → each configured fallback → `defaultLang`.
- Values are deduped automatically and trimmed against `supported`, so accidental repeats or unsupported tags are ignored.
- Missing keys emit a single dev-mode warning and then flow through `onMissingKey()`.

## Catalog caching

- `RuntimeI18nOptions.cacheMode` chooses your strategy:
  - `none` keeps only the active fallback chain in memory (good for memory-constrained apps).
  - `memory` (default) caches every loaded catalog for the current session.
  - `storage` hydrates catalogs from `localStorage`, serves them instantly, and refreshes them in the background. Use `cacheKeyPrefix` to isolate multiple apps.
- LocalStorage I/O never runs on the server, so SSR stays deterministic when you seed TransferState.

---

## SSR + Hydration

See `apps/demo-ssr` in this repo for a complete Express + Angular SSR demo (including TransferState seeding and catalog fallbacks).

On the server, use the exported helper to seed TransferState with the same keys that `provideRuntimeI18n()` reads on the client:

```ts
// i18n.server.providers.ts
import { EnvironmentProviders } from '@angular/core';
import { RuntimeI18nSsrSnapshot, provideRuntimeI18nSsr } from '@ngx-runtime-i18n/angular';

export function i18nServerProviders(snapshot: RuntimeI18nSsrSnapshot): EnvironmentProviders {
  return provideRuntimeI18nSsr(snapshot);
}
```

Include the result directly in your `providers` array — don't spread it (`EnvironmentProviders` is an opaque value, not an array):

```ts
angularApp.handle(req, { providers: [i18nServerProviders(snapshot)] });
```

`RuntimeI18nSsrSnapshot.bootstrap` holds the active language catalog and `catalogs` can optionally seed additional locales. Everything defaults to the same prefix as `provideRuntimeI18n()` (`@ngx-runtime-i18n/core`), but pass `stateKeyPrefix` to both helpers when you override it.

Use the same `provideRuntimeI18n(...)` on both server and client app bootstraps. The wrapper reads TransferState on the client first and only fetches missing catalogs as needed.

---

## Options & Tokens

### `provideRuntimeI18n(config, { localeLoaders?, options?, stateKeyPrefix? })`

- **`config.defaultLang: string`**: fallback language.
- **`config.fallbacks?: string[]`**: ordered fallback catalog chain before the default.
- **`config.supported: string[]`**: allowed languages (authoritative list).
- **`config.fetchCatalog(lang, signal?, scope?)`**: async catalog loader (should be idempotent; honor `AbortSignal`). `scope` is set when loading a route-scoped catalog registered via `withI18nScope()` — branch on it to build the scoped URL (see [Route-Scoped Catalogs](#route-scoped-catalogs)).
- **`config.onMissingKey?: (key) => string`**: transform missing keys (dev‑only suggestion: return the key).

**`localeLoaders`**: map of language to dynamic imports of Angular locale data (enables localized pipes).  
**`options.autoDetect`**: on first boot, resolves as persisted → navigator → default.  
**`options.storageKey`**: localStorage key for the chosen language (falsy to disable).  
**`options.cacheMode`**: `'none' | 'memory' | 'storage'` for catalog caching strategy (default: `'memory'`).  
**`options.cacheKeyPrefix`**: storage prefix when `cacheMode === 'storage'`.  
**`options.preferNavigatorBase`**: map `en-GB` → `en` if `en` is in `supported`.  
**`stateKeyPrefix`**: advanced, customize TransferState keys if you embed multiple i18n instances.

### Services & Pipe

- **`I18nService`**: signals‑first, `lang()`, `ready()`, `t(key, params?)`, `setLang(lang)`
- **`I18nCompatService`**: RxJS equivalent for non‑signals codebases
- **`I18nPipe`**: `{{ 'path' | i18n:{...} }}` (pure=false; listens to `lang` only)

---

## Pitfalls & Gotchas

- **Angular pipes not localizing**: ensure you defined `localeLoaders` for the language you’re testing.
- **Hydration mismatch**: always seed TransferState on SSR; the wrapper is hydration‑safe when the first paint uses server data.
- **404 for catalogs**: place files under `src/public/i18n` so they serve as `/i18n/*.json` in dev/prod.
- **Rapid language toggles**: supported. The wrapper cancels in‑flight fetches, and your `fetchCatalog` must respect `AbortSignal`.

---

## Route-Scoped Catalogs

Use `withI18nScope()` to load feature-specific translation catalogs only when a route activates, and unload them when it is destroyed.

**Contract:** loading scope `'checkout'` for the active language calls `fetchCatalog(lang, signal, 'checkout')` — the same `fetchCatalog` used for global catalogs, just with the third argument set. Your implementation decides the URL shape, e.g. `scope ? `/i18n/${scope}/${lang}.json` : `/i18n/${lang}.json``.

```ts
// In your route definition:
import { withI18nScope } from '@ngx-runtime-i18n/angular';

export const routes: Routes = [
  {
    path: 'checkout',
    loadComponent: () => import('./checkout/checkout.component'),
    providers: [withI18nScope('checkout')],
  },
];
```

**Resolution order:** scope catalogs (most recently loaded scope wins) → global catalog → fallback chain → `onMissingKey`.

Scope catalogs are automatically cleaned up via `DestroyRef` when the route's environment injector is destroyed.

---

## t$() Signal Helper

`I18nService.t$()` returns a `Signal<string>` that recomputes only when the active language or params change. Useful in signal-heavy templates where impure pipe overhead adds up.

```ts
@Component({
  template: `{{ greeting() }}`,
})
export class MyComponent {
  private i18n = inject(I18nService);

  // Static params — recomputes only on lang change
  readonly greeting = this.i18n.t$('hello.user', { name: 'Ashwin' });

  // Reactive params — recomputes when either lang or params signal changes
  private username = signal('Ashwin');
  readonly dynamicGreeting = this.i18n.t$('hello.user', this.username as unknown as Signal<Record<string, unknown>>);
}
```

---

## Type Safety

`I18nService.t()`, `I18nPipe`, and `I18nCompatService.t()` are fully generic when you declare your catalog schema via module augmentation.

**1. Create a declaration file in your app (e.g. `src/i18n.d.ts`):**

```ts
import type en from '../public/i18n/en.json';

declare module '@ngx-runtime-i18n/core' {
  interface I18nSchema {
    translations: typeof en;
  }
}
```

**2. TypeScript will now enforce valid keys and narrow param types:**

```ts
// OK — valid key
this.i18n.t('hello.user', { name: 'Ashwin' });

// Error — 'does.not.exist' is not in the catalog
this.i18n.t('does.not.exist');

// Error — missing required param 'name'
this.i18n.t('hello.user');
```

Key types are computed via `DeepKeys<T>` (dot-notation paths up to 4 levels). Interpolation params are extracted via `ExtractParams<S>` from the string literal value. Both types are exported from `@ngx-runtime-i18n/core` for advanced usage.

When no schema is declared (the default), `t()` accepts `string`, preserving full backward compatibility.

---

## Versioning & Support

- Angular: `>=16 <22`
- Node: LTS recommended
- SemVer: breaking changes will bump major versions.

---

## License

MIT
