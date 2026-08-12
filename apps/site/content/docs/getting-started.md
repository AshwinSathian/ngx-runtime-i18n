---
title: Getting started
description: Install the core and Angular packages and register provideRuntimeI18n().
eyebrow: docs.getting-started
order: 0
section: Start here
---

## Install

Install the core package and the Angular integration together — the Angular package expects a matching `core` version as a peer dependency:

```bash
npm i @ngx-runtime-i18n/angular @ngx-runtime-i18n/core
```

## Directory layout

Put one JSON catalog per language under `src/public/i18n/`:

```
your-app/
  src/
    public/
      i18n/
        en.json
        hi.json
        de.json
```

<content-callout data-type="tip">

Catalogs are static assets, not compiled files. Serve them from `/i18n/<lang>.json` — the `fetchCatalog` function below assumes this path.

</content-callout>

## Register provideRuntimeI18n()

Add `provideRuntimeI18n()` to your application config with the supported languages, a fallback chain, and a `fetchCatalog` function that loads the JSON file for a given language:

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
      },
    ),
  ],
};
```

`fallbacks` sets the chain a missing key walks before `onMissingKey` runs — a key missing from `hi.json` falls back to `de.json` before `onMissingKey` returns the key itself.

## Use translations in a component

`I18nPipe` covers templates. `I18nService.t()` covers component code that needs a translated string directly, and `I18nService.lang()`/`ready()` are signals you can read in an `effect()` or a template:

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

Need RxJS instead of signals? Inject `I18nCompatService` for `lang$`, `ready$`, and `t()`.

### Next steps

The core concepts pages cover fallback chains and catalog caching in more depth. The recipes cover framework-specific integration patterns for PrimeNG and Angular Material.
