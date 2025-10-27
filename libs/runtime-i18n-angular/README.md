# @ngx-runtime-i18n/angular

Lean, SSR‑safe Angular wrapper around `@ngx-runtime-i18n/core`.

- Signals‑first service (`I18nService`) and `I18nPipe` for ergonomic templates
- Optional `I18nCompatService` (RxJS) for non‑signals apps
- SSR‑aware: TransferState snapshot on the server, hydration‑safe on the client
- Cancellation‑aware language switching (rapid toggles won’t corrupt state)
- Lazy Angular **locale data** per language to power pipes (`DatePipe`, `DecimalPipe`, ...)

Peer support: `@angular/* >=16 <21`

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
        fetchCatalog: (lang, signal) =>
          fetch(`/i18n/${lang}.json`, { signal }).then((r) => {
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

## SSR + Hydration

On the server, **seed TransferState** with a minimal bootstrap snapshot to avoid refetch/flicker on the client.

```ts
// i18n.server.providers.ts
import { ENVIRONMENT_INITIALIZER, Provider, TransferState, makeStateKey, inject } from '@angular/core';

export interface I18nSnapshot {
  lang: string;
  catalogs: Record<string, unknown>;
}

export function i18nServerProviders(snapshot: I18nSnapshot): Provider[] {
  const PREFIX = '@ngx-runtime-i18n';
  return [
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useFactory: () => () => {
        const ts = inject(TransferState);
        const bootKey = makeStateKey<I18nSnapshot>(`${PREFIX}:bootstrap`);
        ts.set(bootKey, snapshot);
        for (const [lang, c] of Object.entries(snapshot.catalogs)) {
          ts.set(makeStateKey(`${PREFIX}:catalog:${lang}`), c);
        }
      },
    },
  ];
}
```

Use the same `provideRuntimeI18n(...)` on both server and client app bootstraps. The wrapper reads TransferState on the client first and only fetches missing catalogs as needed.

---

## Options & Tokens

### `provideRuntimeI18n(config, { localeLoaders?, options?, stateKeyPrefix? })`

- **`config.defaultLang: string`** — fallback language.
- **`config.supported: string[]`** — allowed languages (authoritative list).
- **`config.fetchCatalog(lang, signal?)`** — async catalog loader (should be idempotent; honor `AbortSignal`).
- **`config.onMissingKey?: (key) => string`** — transform missing keys (dev‑only suggestion: return the key).

**`localeLoaders`** — map of language to dynamic imports of Angular locale data (enables localized pipes).  
**`options.autoDetect`** — on first boot: persisted → navigator → default.  
**`options.storageKey`** — localStorage key for the chosen language (falsy to disable).  
**`options.preferNavigatorBase`** — map `en-GB` → `en` if `en` is in `supported`.  
**`stateKeyPrefix`** — advanced: customize TransferState keys if you embed multiple i18n instances.

### Services & Pipe

- **`I18nService`** — signals‑first: `lang()`, `ready()`, `t(key, params?)`, `setLang(lang)`
- **`I18nCompatService`** — RxJS equivalent for non‑signals codebases
- **`I18nPipe`** — `{{ 'path' | i18n:{...} }}` (pure=false; listens to `lang` only)

---

## Pitfalls & Gotchas

- **Angular pipes not localizing** — Ensure you defined `localeLoaders` for the language you’re testing.
- **Hydration mismatch** — Always seed TransferState on SSR; the wrapper is hydration‑safe when the first paint uses server data.
- **404 for catalogs** — Place files under `src/public/i18n` so they serve as `/i18n/*.json` in dev/prod.
- **Rapid language toggles** — Supported; the wrapper cancels in‑flight fetches. Your `fetchCatalog` must respect `AbortSignal`.

---

## Versioning & Support

- Angular: `>=16 <21`
- Node: LTS recommended
- SemVer: breaking changes will bump major versions.

---

## License

MIT
