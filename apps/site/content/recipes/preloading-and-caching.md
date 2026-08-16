---
title: Preloading and caching
description: Warm catalogs ahead of time with the preload helpers, and pick a cacheMode for how long they stay in memory.
eyebrow: recipes.preloading-and-caching
order: 3
packages: ['@ngx-runtime-i18n/angular']
---

## Switching state signals

`I18nService` exposes two signals for reflecting a language switch in the UI:

- `switching()` becomes `true` as soon as you call `setLang()` with a new language, so you can show a spinner or disable controls.
- `activeSwitchLang()` mirrors the requested language (`null` otherwise), for rendering text like "Switching to fr…".

```ts
const i18n = inject(I18nService);

// Disable the switcher while the next catalog downloads.
readonly onSwitch = (lang: string) => {
  if (i18n.switching()) return;
  i18n.setLang(lang);
};
```

## Preload helpers

`I18nService` also adds preload helpers that warm the same loaders `setLang()` uses, without changing the active language:

- `preloadLang(lang)` for a single language (includes its fallback catalogs).
- `preloadLangs(langs)` for parallel prefetches, when the user's likely languages are known up front.
- `preloadFallbackChain(lang?)` to hydrate a language and its configured fallbacks (defaults to the active language if none is passed).

```ts
// Warm caches for a user who usually toggles between German and Hindi.
await i18n.preloadLangs(['de', 'hi']);

// Preload the active route's fallback chain before navigation.
await i18n.preloadFallbackChain('fr');
```

Call these during login, before showing a heavy route, or alongside other async work — the active language and UI stay stable while the catalog downloads in the background.

## Choosing a cache mode

`RuntimeI18nOptions.cacheMode` controls how long a preloaded or loaded catalog stays resident:

- `none` keeps only the active fallback chain in memory, for memory-constrained apps.
- `memory` (the default) caches every catalog loaded during the current session.
- `storage` hydrates catalogs from `localStorage`, serves them instantly on the next visit, and refreshes them in the background. Set `cacheKeyPrefix` to isolate multiple apps sharing the same origin.

<content-callout data-type="tip">

`localStorage` I/O never runs on the server, so combining `storage` mode with SSR stays deterministic as long as you seed TransferState — see the [SSR with Express recipe](/recipes/ssr-with-express).

</content-callout>
