---
title: Route-scoped catalogs
description: Load a feature's translation catalog only when its route activates, using withI18nScope().
eyebrow: recipes.route-scoped-catalogs
order: 2
packages: ['@ngx-runtime-i18n/angular']
---

Use `withI18nScope()` to load feature-specific translation catalogs only when a route activates, and unload them when it is destroyed.

## Registering a scope

Add `withI18nScope('checkout')` to the route's `providers`:

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

## The fetchCatalog contract

Loading scope `'checkout'` for the active language calls `fetchCatalog(lang, signal, 'checkout')` — the same `fetchCatalog` used for global catalogs, just with the third argument set. Your implementation decides the URL shape:

```ts
fetchCatalog: (lang, signal, scope) =>
  fetch(scope ? `/i18n/${scope}/${lang}.json` : `/i18n/${lang}.json`, { signal }).then((r) => {
    if (!r.ok) throw new Error(`Failed to load catalog: ${lang}`);
    return r.json();
  }),
```

## Resolution order

A key lookup checks scope catalogs first (most recently loaded scope wins), then the global catalog, then the fallback chain, then `onMissingKey`.

## Cleanup

Scope catalogs are removed automatically via `DestroyRef` when the route's environment injector is destroyed — navigating away from `checkout` clears the scoped catalog without any manual teardown.
