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

## Making a preload stick across reloads

By default (`cacheMode: 'memory'`), a preloaded catalog only lives for the current session — reload the page and `preloadLangs()` fetches it again. Pair `cacheMode: 'storage'` with the preload calls above to persist warmed catalogs in `localStorage`, so a returning user's likely languages are already on disk before `preloadLangs()` even runs:

```ts
provideRuntimeI18n(
  {
    defaultLang: 'en',
    supported: ['en', 'de', 'hi'],
    fetchCatalog: (lang, signal) => fetch(`/i18n/${lang}.json`, { signal }).then((r) => r.json()),
  },
  {
    options: {
      cacheMode: 'storage',
      cacheKeyPrefix: '@my-app:catalog:',
    },
  },
);
```

```ts
// After the user picks a preferred secondary language in settings:
await i18n.preloadLangs(['de', 'hi']);
```

With `storage` mode, that preload writes both catalogs to `localStorage` under `cacheKeyPrefix`. Next time either language becomes active — even after a full reload — `setLang()` serves the cached copy immediately and refreshes it in the background, instead of blocking on a network request.

<content-callout data-type="tip">

`localStorage` I/O never runs on the server, so `storage` mode stays deterministic under SSR as long as you seed TransferState — see the [SSR with Express recipe](/recipes/ssr-with-express). For the full `cacheMode` reference, see [Catalog caching](/docs/core-concepts/caching).

</content-callout>
