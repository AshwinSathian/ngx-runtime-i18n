---
title: Migrating from ngx-translate
description: A concept-mapping table and one worked component conversion for teams moving off @ngx-translate/core.
eyebrow: recipes.migrating-from-ngx-translate
order: 9
packages: ['@ngx-runtime-i18n/angular']
---

This is a migration guide, not a claim that switching is trivial in every codebase. The two libraries solve overlapping problems with different primitives — `@ngx-translate/core` is Observable-first (with signals layered on in recent versions), while `@ngx-runtime-i18n/angular` is signals-first from the ground up. A large app with many `TranslateService.stream()` subscriptions or a custom `TranslateLoader` will need real per-component work, not a find-and-replace.

<content-callout data-type="note">

Facts about `@ngx-translate/core` below reflect its published `18.0.0` release, current as of this guide's last update. Check the [ngx-translate documentation](https://ngx-translate.org/) directly if you're on an older major version — v18 removed several APIs that earlier versions still had.

</content-callout>

## Concept mapping

| ngx-translate (`@ngx-translate/core` v18) | `@ngx-runtime-i18n/angular` | Notes |
| --- | --- | --- |
| `TranslateService.instant(key, params?)` | `I18nService.t(key, params?)` | Both are synchronous. `instant()` returns the key itself if the catalog hasn't loaded yet; `t()` behaves the same way before `ready()` is `true`. |
| `TranslateService.get(key, params?)` | `I18nService.t$(key, params?)` | `get()` is an `Observable` that emits once and completes. `t$()` is a `Signal<string>` that recomputes on language or param changes — read it directly in a template (`{{ greeting() }}`), no `async` pipe needed. |
| `TranslatePipe` (`{{ 'key' \| translate:params }}`) | `I18nPipe` (`{{ 'key' \| i18n:params }}`) | Same shape, different pipe name and import. |
| `TranslateDirective` (`<span [translate]="key">`) | No direct equivalent | Use `I18nPipe` in the template or `I18nService.t()` in the component instead. |
| `TranslateService.use(lang)` | `I18nService.setLang(lang)` | `use()` returns an `Observable` that completes on load; `setLang()` returns a `Promise` and cancels any in-flight switch for a previous request automatically. |
| `TranslateService.currentLang()` (signal, v18+) / `onLangChange` (Observable) | `I18nService.lang()` (signal) or `I18nCompatService.lang$` (Observable) | Both libraries are signal-based for the current language as of their latest majors. Use `I18nCompatService.lang$` in an RxJS-heavy codebase that isn't on signals yet — see [Getting started](/docs/getting-started) for when to reach for it over `I18nService`. |
| ICU plurals via `ngx-translate-messageformat-compiler` (separate package, runtime `eval`-based) | Built-in ICU-lite `{count, plural, one {...} other {...}}` | ngx-translate's core has no plural syntax of its own — pluralization needs a third-party compiler that requires relaxing your CSP for `unsafe-eval`. Plurals here are part of `@ngx-runtime-i18n/core` with no extra dependency or CSP change. See [ICU-lite formatting](/docs/core-concepts/icu-lite) for what's covered. |

## Worked conversion

A component using `TranslateService.get()` for an initial reactive translation, `TranslatePipe` in the template, and a manual `onLangChange` subscription to refresh a computed value:

```ts
// Before — ngx-translate
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

@Component({
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <h1>{{ 'hello.user' | translate:{ name: username } }}</h1>
    <p>{{ itemCount }}</p>
    <button (click)="switch('de')">Deutsch</button>
  `,
})
export class CartSummaryComponent implements OnInit, OnDestroy {
  private translate = inject(TranslateService);
  username = 'Ashwin';
  itemCount = '';
  private sub?: Subscription;

  ngOnInit() {
    this.updateCount();
    this.sub = this.translate.onLangChange.subscribe(() => this.updateCount());
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private updateCount() {
    this.translate.get('cart.items', { count: 3 }).subscribe((text) => (this.itemCount = text));
  }

  switch(lang: string) {
    this.translate.use(lang);
  }
}
```

```ts
// After — @ngx-runtime-i18n/angular
import { Component, inject } from '@angular/core';
import { I18nService, I18nPipe } from '@ngx-runtime-i18n/angular';

@Component({
  standalone: true,
  imports: [I18nPipe],
  template: `
    <h1>{{ 'hello.user' | i18n:{ name: username } }}</h1>
    <p>{{ itemCount() }}</p>
    <button (click)="switch('de')">Deutsch</button>
  `,
})
export class CartSummaryComponent {
  private i18n = inject(I18nService);
  username = 'Ashwin';

  // t$() recomputes on its own when the language changes — no subscription,
  // no ngOnDestroy teardown, no manual re-fetch on langChange.
  itemCount = this.i18n.t$('cart.items', { count: 3 });

  switch(lang: string) {
    this.i18n.setLang(lang);
  }
}
```

The `OnInit`/`OnDestroy` lifecycle and the `onLangChange` subscription disappear entirely — `t$()` is a signal, so Angular's change detection already knows when it needs to recompute. This is the general shape most conversions take: an `Observable`-plus-manual-subscription pair becomes a signal read, and the surrounding lifecycle code is often deleted.

## What doesn't map one-to-one

| Concept | Difference |
| --- | --- |
| Loaders | ngx-translate's `TranslateLoader` (typically `provideTranslateHttpLoader()`) is replaced by `fetchCatalog` in `provideRuntimeI18n()` — a plain async function instead of an injectable class, so a custom loader becomes a function instead of a DI token. |
| Fallback language | ngx-translate's `fallbackLang` (the replacement for the removed `defaultLang` in v18) is roughly `RuntimeI18nConfig.fallbacks` here, but the resolution chain differs: this library supports an ordered list of fallbacks, not a single one. See [Fallback chains](/docs/core-concepts/fallback-chains). |
| Missing-key handling | ngx-translate's `MissingTranslationHandler` is an injectable class; `onMissingKey` here is a plain function passed into `provideRuntimeI18n()`. |
| SSR | If your ngx-translate setup runs under Angular Universal, don't assume the same request lifecycle carries over: `provideRuntimeI18nSsr()` needs its own request-scoped snapshot. See [SSR and hydration](/docs/core-concepts/ssr-hydration) for the setup. |

Running both libraries side by side during a migration is an option for a large codebase: nothing in `@ngx-runtime-i18n/angular` requires ngx-translate to be removed first. Converting one route or feature module at a time and shipping incrementally is a reasonable path.
