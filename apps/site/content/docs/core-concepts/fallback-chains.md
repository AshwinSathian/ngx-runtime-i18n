---
title: Fallback chains
description: How a missing key resolves across the active language, configured fallbacks, and defaultLang.
eyebrow: docs.core-concepts.fallback-chains
order: 1
section: Core concepts
---

## Resolution order

A **fallback chain** is the ordered list of languages a key lookup walks before giving up. Configure it with `RuntimeI18nConfig.fallbacks?: string[]`. Resolution always runs in this order:

1. the active language
2. each language in `fallbacks`, in the order you listed them
3. `defaultLang`

If the key is still missing after all three steps, it flows through `onMissingKey()`.

```ts
provideRuntimeI18n({
  defaultLang: 'en',
  supported: ['en', 'hi', 'de'],
  fallbacks: ['de'],
  fetchCatalog: (lang, signal) =>
    fetch(`/i18n/${lang}.json`, { signal }).then((r) => r.json()),
  onMissingKey: (key) => key,
});
```

With this config, a key missing from `hi.json` is looked up in `de.json` next, then `en.json` (`defaultLang`), and only returns `onMissingKey(key)` if none of the three catalogs have it.

## Deduping and trimming

`fallbacks` values are deduped automatically and trimmed against `supported`, so accidental repeats or unsupported language tags are ignored rather than causing lookup errors. You don't need to guard against a caller passing `fallbacks: ['de', 'de']` or a tag that isn't in `supported`.

## Missing keys and dev warnings

Missing keys emit a single dev-mode warning, then flow through `onMissingKey()`. This keeps the console readable during development without silencing the signal that a key is absent from every catalog in the chain — you get one warning per miss, not one per render.
