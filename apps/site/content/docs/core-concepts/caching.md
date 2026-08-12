---
title: Catalog caching
description: The three cacheMode strategies, cacheKeyPrefix, and why the server never touches localStorage.
eyebrow: docs.core-concepts.caching
order: 2
section: Core concepts
---

## cacheMode

`RuntimeI18nOptions.cacheMode` chooses how loaded catalogs are retained. There are three values:

- `none` keeps only the active fallback chain in memory, which is good for memory-constrained apps.
- `memory` (default) caches every loaded catalog for the current session.
- `storage` hydrates catalogs from `localStorage`, serves them instantly on the next load, and refreshes them in the background.

```ts
provideRuntimeI18n(config, {
  options: {
    cacheMode: 'storage',
    cacheKeyPrefix: '@ngx-runtime-i18n:catalog:',
  },
});
```

## cacheKeyPrefix

`options.cacheKeyPrefix` is the storage prefix used when `cacheMode === 'storage'`. Set it when you run multiple apps or multiple i18n instances against the same origin, so their cached catalogs don't collide in `localStorage`.

<content-callout data-type="note">

LocalStorage I/O never runs on the server. Server environments never touch `localStorage`, so SSR stays deterministic when you seed TransferState — the server-rendered markup can't diverge based on a client's cached catalog state.

</content-callout>
