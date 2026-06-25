# ngx-runtime-i18n — Production-Grade Roadmap

> Authored: June 2026. This is a living strategic document, not a changelog.

---

## Executive Summary

`ngx-runtime-i18n` has strong architectural bones: a genuinely signals-first Angular service, clean SSR hydration, proper AbortSignal cancellation, and a layered adapter model. These are not trivial — ngx-translate v18 only achieved signals-parity in June 2026, and transloco still bridges Observables.

**The gap to production grade is real but closeable.** It falls into three categories:

1. A small number of **correctness bugs** that will block real users today (peer dep cap, missing export)
2. A **type safety deficit** that is the single largest reason a senior team would choose i18next or ngx-translate v18 over this library
3. Missing **ecosystem surface** that signals "serious library" to the community (schematic, CLI, docs site, testing helper)

This document walks through each, prioritized by impact-to-effort ratio.

---

## Competitive Landscape (June 2026)

| Library | Signals | Type Safety | SSR | Lazy Route Load | Schematic | Extractor |
|---|---|---|---|---|---|---|
| **ngx-translate v18** | ✅ native | Level 2 (key autocomplete) | ⚠️ manual | ❌ | ❌ | ❌ |
| **transloco v7** | ⚠️ bridged | Level 1-2 | ✅ | ✅ (best-in-class) | ✅ | ✅ |
| **angular-i18next** | ❌ | Level 3 (via i18next) | ⚠️ | ❌ | ❌ | ❌ |
| **angular built-in** | N/A | N/A | ✅ | N/A (compile-time) | ✅ | ✅ |
| **ngx-runtime-i18n v2** | ✅ native | Level 0 | ✅ | ❌ | ❌ | ❌ |
| **ngx-runtime-i18n target** | ✅ native | **Level 3** | ✅ | ✅ | ✅ | ✅ |

**The gap:** This library has the best SSR story and the only genuinely signals-native API among runtime libraries. The absence of typed keys and tooling is the only thing preventing it from being the obvious choice for new Angular projects.

**Is there a genuine gap?** Yes — but narrow. No Angular runtime i18n library delivers all three of: (1) native Signals, (2) typed keys + params at Level 3, (3) route-scoped lazy loading. This combination is the target.

---

## Phase 0 — Critical Fixes (v2.0.1)

**Time estimate: 1–2 hours. Ship immediately.**

These are correctness bugs that block real-world users today.

### 0.1 Fix peer dependency cap

**File:** `libs/runtime-i18n-angular/package.json`, `libs/runtime-i18n-primeng/package.json`

```json
// Before
"@angular/core": ">=16 <21"

// After
"@angular/core": ">=16 <22"
```

Angular 20 is current. Angular 21 will arrive in late 2026. Capping at `<21` locks out Angular 20 users with strict version resolution in monorepos. The intent (documented in code comments) was always `<22`.

### 0.2 Export `RUNTIME_I18N_OPTIONS` token

**File:** `libs/runtime-i18n-angular/src/index.ts`

```typescript
// Add to exports:
export { RUNTIME_I18N_OPTIONS } from './lib/tokens';
export type { RuntimeI18nOptions } from './lib/tokens';
```

The token exists and is used internally but is not exported. This blocks any advanced SSR scenario where the server needs to inspect resolved options.

### 0.3 Add `provideRuntimeI18nTesting()`

**New file:** `libs/runtime-i18n-angular/src/lib/testing.ts`

Every consuming Angular app that writes component tests has to manually wire up fake providers. This is a significant source of friction in adoption. A single exported helper eliminates it:

```typescript
export function provideRuntimeI18nTesting(
  catalog: Catalog = {},
  lang = 'en'
): Provider[] {
  // Returns pre-wired providers with in-memory catalog, no fetch, ready=true
}
```

Export it from a `testing` entry point (`@ngx-runtime-i18n/angular/testing`) so it tree-shakes completely from production builds.

---

## Phase 1 — Type Safety (v3.0) ← Highest-impact feature

**Time estimate: 3–5 days. This is the single most impactful investment.**

The industry has converged on typed i18n. i18next v26.2+ has Level 3 (keys + params typed). next-intl has Level 3. LinguiJS has Level 4 (compile-time). ngx-translate v18 is Level 2 (key autocomplete, untyped params).

**No Angular runtime library currently delivers Level 3.** This is the differentiator.

### 1.1 TypeScript module augmentation pattern

The cleanest approach for a runtime library is TypeScript interface augmentation — no code generation required, works with any catalog shape.

**How it works:**

Users create a declaration file in their app that maps their catalog:

```typescript
// src/i18n.d.ts  (in the consuming app)
import type en from '../public/i18n/en.json';

declare module '@ngx-runtime-i18n/core' {
  interface I18nSchema {
    translations: typeof en;
  }
}
```

The library's `t()` signature changes from:

```typescript
t(key: string, params?: Record<string, unknown>): string
```

to:

```typescript
t<K extends TranslationKey>(key: K, params?: TranslationParams<K>): string
```

Where `TranslationKey` and `TranslationParams<K>` are derived from `I18nSchema['translations']` when provided, or fall back to `string` and `Record<string, unknown>` when not (preserving backward compatibility).

### 1.2 Key path type extraction

The utility types needed in `@ngx-runtime-i18n/core`:

```typescript
// Internal utility — exposed as @internal
type DeepKeys<T, Prefix extends string = ''> =
  T extends Record<string, unknown>
    ? { [K in keyof T & string]:
        | (Prefix extends '' ? K : `${Prefix}.${K}`)
        | DeepKeys<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>
      }[keyof T & string]
    : never;
```

Key design constraint: limit recursion depth to 5 levels. Deep nested catalogs at 2K+ keys cause TypeScript to slow significantly (documented i18next pain point). Add a depth guard.

### 1.3 Param type extraction

For a key like `"Hello, {name}! You have {count} items"`, extract `{ name: string; count: string | number }` at the type level using template literal types.

This is the hard part. The pattern:

```typescript
type ExtractParams<S extends string> =
  S extends `${string}{${infer Param}}${infer Rest}`
    ? Param extends `${infer P},${string}` // ICU block
      ? { [K in P]: number } & ExtractParams<Rest>
      : { [K in Param]: string | number } & ExtractParams<Rest>
    : {};
```

### 1.4 Backward compatibility

**Zero breaking changes.** When `I18nSchema` is not augmented:
- `t()` continues to accept any string
- No TypeScript errors in existing codebases

When augmented: full typed experience.

This means `v3.0` is a non-breaking major only because of other surface changes, not this feature.

---

## Phase 2 — ICU Completeness (v2.1 or v3.0)

**Time estimate: 2–3 days.**

The current ICU-lite covers `=N`, `one`, `other`. That handles English well. It does not handle:

- **Arabic**: 6 plural forms (`zero`, `one`, `two`, `few`, `many`, `other`)
- **Russian/Polish/Czech**: distinct `few` and `many` rules
- **Welsh/Hebrew**: non-standard rules
- **Gender agreement**: `{gender, select, male{...} female{...} other{...}}`

### 2.1 CLDR-aware plural rules

Angular ships with CLDR plural rules in `@angular/common`. The library already lazy-loads locale data via `localeLoaders`. Wire the plural resolver to use Angular's `getLocalePluralCase()`:

```typescript
import { getLocalePluralCase } from '@angular/common';
// Returns: Plural.Zero | Plural.One | Plural.Two | Plural.Few | Plural.Many | Plural.Other
```

The `formatIcu` function already receives `_lang` as its first argument — this parameter is currently unused. Use it:

```typescript
export function formatIcu(lang: string, key: string, cat: Catalog, params = {}) {
  // Use lang + CLDR to resolve plural category
}
```

In the core package, expose a `setPluralResolver(fn)` hook so the core stays framework-agnostic (Angular provides the resolver; the core just calls it). Default is the existing `one`/`other` behavior.

### 2.2 `select` form

Gender agreement is used in French, Spanish, German, and all Slavic languages. The syntax is standard ICU:

```
{gender, select, male{Il a} female{Elle a} other{Il/Elle a}}
```

Extend `replacePluralBlocks` → `replaceMessageBlocks` to handle both `plural` and `select` keywords. The parser structure is identical; only the lookup logic differs.

### 2.3 Scope of change

Both 2.1 and 2.2 are additive changes to `formatIcu`. Existing tests pass. The ICU-lite label can remain accurate: we support interpolation, plural (CLDR), and select — but not nested select-in-plural, ordinal, duration, or number formatting.

---

## Phase 3 — Developer Experience Tooling (v3.x)

**Time estimate: 1–2 weeks for the schematic; 2–3 weeks for the CLI extractor.**

### 3.1 Angular Schematic: `ng add @ngx-runtime-i18n/angular`

Every production Angular library with more than trivial setup has a schematic. transloco has one. ngx-translate v18 has one. Without it, the library signals "hobby project" to a tech lead evaluating options.

The schematic should:
1. Add `@ngx-runtime-i18n/angular` and `@ngx-runtime-i18n/core` to `package.json`
2. Patch `app.config.ts` to add `provideRuntimeI18n()` with a sensible default
3. Create `public/i18n/en.json` with a sample catalog
4. Ask which additional languages to support and create their stub files
5. Optionally add `public/i18n/` to `.gitignore` patterns for generated files

**Implementation:** Use `@angular-devkit/schematics`. Lives in a new `libs/runtime-i18n-schematics` package (separate npm package: `@ngx-runtime-i18n/schematics`, listed as `ng-add` in the angular package's `ng-package.json`).

### 3.2 CLI Extractor / Validator

**This is the highest-value DX tool and solves community pain point #6.**

The extractor scans the project for all i18n key usages and validates them against the catalog JSON files. Two modes:

**Extract mode** — finds all keys in use:
```bash
npx @ngx-runtime-i18n/cli extract --src=src --out=public/i18n
```
Scans for:
- `| i18n` pipe usage in templates: `'some.key' | i18n`
- `i18n.t('some.key')` in TypeScript
- Outputs a `keys.json` manifest of all discovered keys

**Check mode** — validates catalog completeness:
```bash
npx @ngx-runtime-i18n/cli check --catalog=public/i18n --langs=en,de,hi
```
Reports:
- Keys used in code but missing from catalog (the most common error)
- Keys in catalog that are never used (dead translations)
- Keys present in `en.json` but missing from `de.json` (incomplete translations)

**CI integration:**
```yaml
# .github/workflows/i18n-check.yml
- run: npx @ngx-runtime-i18n/cli check --catalog=public/i18n --fail-on-missing
```

**Implementation:** Use the TypeScript compiler API (`ts.createProgram`) for TS scanning and a regex-based HTML parser for template scanning (Angular templates are complex enough that a full AST parser is overkill here). The CLI lives in a new `tools/cli` package.

### 3.3 Route-Level Lazy Loading (Scoped Catalogs)

**transloco's single biggest advantage.** This matters for any app with 500+ translation keys.

The concept: instead of one giant `en.json`, split catalogs by Angular feature module or route.

```typescript
// app.routes.ts
{
  path: 'checkout',
  loadChildren: () => import('./checkout/checkout.routes'),
  providers: [withI18nScope('checkout')]  // loads /i18n/checkout/en.json
}
```

**API design:**

```typescript
// New export from @ngx-runtime-i18n/angular
export function withI18nScope(scope: string): EnvironmentProviders {
  // Registers a scoped catalog loader
  // Keys are namespaced: 'checkout.total' resolves from checkout/en.json
  // Falls through to global catalog if not found in scope
}
```

The global catalog remains the default. Scoped catalogs are merged on top, with scope-prefixed keys shadowing global ones. This is a **purely additive** change — existing apps without scopes are unaffected.

**URL convention:** Scope `'checkout'` → fetches `${baseUrl}/checkout/${lang}.json`. Configurable via `fetchCatalog` override per scope.

---

## Phase 4 — Ecosystem & Community (v3.x ongoing)

### 4.1 Documentation Site

The README is functional but insufficient for a production-grade library. A dedicated docs site is the signal that separates "hobbyist open source" from "something I'll propose to my team."

**Recommendation:** Astro + Starlight (same stack as Astro docs, Vite docs, many major OSS projects). Zero infrastructure cost; deploys to GitHub Pages or Netlify free tier.

Pages needed:
- Getting started (CSR)
- Getting started (SSR)
- Type safety guide
- ICU message format reference
- Lazy loading / scoped catalogs
- API reference (auto-generated from TSDoc)
- Migration from ngx-translate
- Migration from transloco
- Testing guide

The migration guides are high-ROI — they intercept developers who are already in the market for an alternative.

### 4.2 Angular Material Adapter

Parallel to the PrimeNG adapter. Angular Material has no dedicated i18n adapter for runtime switching. Its `MatDatepickerIntl`, `MatPaginatorIntl`, etc. require manual setup.

```typescript
provideMaterialRuntimeI18n({
  resolveTranslation: (lang) => import(`./material-i18n/${lang}`)
})
```

This is roughly 2–4 hours of work and dramatically expands the library's addressable surface — Angular Material is far more widely used than PrimeNG.

### 4.3 DevTools Integration

Angular DevTools (the Chrome extension) supports custom panels via a message bridge. A DevTools panel would show:
- Currently active language
- Loaded catalogs and their key counts
- Recent `t()` calls (key + result)
- Missing keys log

This is a differentiator no Angular i18n library currently offers. It's also non-trivial (4–6 days for an MVP panel) but has outsized community impact.

### 4.4 `Signal<string>` return from `t$()`

Addresses the impure pipe performance concern at scale:

```typescript
// New method on I18nService
t$(key: TranslationKey, params?: SignalOrPlain<TranslationParams>): Signal<string>
```

Returns a `computed()` signal that recalculates only when `lang()` or `params` change. Enables zero-overhead reactive translations:

```html
<!-- Instead of impure pipe -->
{{ greeting() }}
<!-- where: greeting = i18n.t$('hello.user', { name: username }) -->
```

---

## Prioritized Execution Order

```
┌─────────────────────────────────────────────────────────┐
│ SHIP NOW (v2.0.1) — 1-2 hours, blocks real users        │
│  • Peer dep cap: <21 → <22                              │
│  • Export RUNTIME_I18N_OPTIONS                          │
│  • provideRuntimeI18nTesting()                          │
└─────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────┐
│ HIGH IMPACT (v2.1) — 1 week                             │
│  • ICU: select form + CLDR plurals                      │
│  • t$() signal helper                                   │
│  • Angular Material adapter                             │
└─────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────┐
│ DIFFERENTIATOR (v3.0) — 2-3 weeks                       │
│  • Type-safe keys + params (Level 3)                    │
│  • ng add schematic                                     │
│  • Testing entry point                                  │
└─────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────┐
│ ECOSYSTEM (v3.x) — ongoing                              │
│  • Route-scoped lazy catalogs                           │
│  • CLI extractor/validator                              │
│  • Documentation site                                   │
│  • DevTools integration                                 │
└─────────────────────────────────────────────────────────┘
```

---

## What to NOT Build

**MessageFormat 2 (MF2)** — The spec reached Final Candidate in March 2025 but adoption is near-zero (i18next-mf2 gets 6 weekly downloads). This is a 2027-2028 concern at the earliest.

**React / Vue adapters** — The core is framework-agnostic, but building adapters for React/Vue would split focus without a clear advantage over i18next (15M downloads/week) in those ecosystems. Angular-only is a feature, not a limitation.

**Full ICU parser** — The `intl-messageformat` package is 47KB gzipped. The current ICU-lite at ~1KB covers 90%+ of production use cases. Only add CLDR plurals and `select` — not `number`, `date`, `duration`, `ordinal`.

**Observable-first API** — `I18nCompatService` exists for legacy apps. Don't grow it. The signals API is the bet; double down on it.

**Runtime key extraction** — Some libraries (LinguiJS, Tolgee) instrument the runtime to automatically collect keys. This requires a separate infrastructure (Tolgee server, etc.) and is a product, not a library feature.

---

## Answering "Is there a genuine gap?"

**Yes, but you need to be specific about which gap you're filling.**

The generic "runtime i18n for Angular" space is crowded. ngx-translate v18 is dominant and now signals-native. The gap is specifically:

> **Type-safe, signals-native Angular i18n with first-class SSR, route-level lazy loading, and developer tooling (schematic + extractor).**

No library delivers all five simultaneously. This library already has three (type-safe pending, signals ✅, SSR ✅). Adding the remaining two (lazy loading + tooling) with the type safety work makes it a legitimate first choice for greenfield Angular 18+ projects.

The migration guides (from ngx-translate, from transloco) are essential — they intercept developers already frustrated with their current library and give them a clear path.
