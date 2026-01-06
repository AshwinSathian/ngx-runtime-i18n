# Changelog

## 2.0.0 (2026-01-05)

### 🚀 Major Release Highlights

This release marks a **major evolution** of `ngx-runtime-i18n`, with improved SSR correctness, better developer experience, stronger ICU-lite guarantees, and the introduction of an optional UI-library adapter package.

### ✨ New Features

#### **First-class SSR support**

- Added an **official SSR provider API** for Angular, removing the need for demo-only or copy-pasted server logic.
- Fixed TransferState hydration by ensuring **SSR seeding and client consumption share a single, consistent key strategy**.
- Updated SSR demo and documentation to use the exported SSR helper.

#### **Language switching UX improvements**

- Introduced an explicit **language switching/loading signal** in the Angular service, enabling UIs to react during runtime language changes.
- Added **preload APIs** to warm language and catalog data without mutating the active language (useful for route prefetching and profile/settings screens).

#### **New PrimeNG integration package**

- Added **`@ngx-runtime-i18n/primeng`**, an optional adapter that:

  - Reacts to runtime language changes
  - Applies translations via `PrimeNGConfig`
  - Supports sync or async translation resolution
  - Remains fully decoupled from core and Angular packages

- No PrimeNG dependency leakage into existing packages.

### 🐞 Bug Fixes

- Fixed `I18nCompatService.whenReady()` resolving prematurely by correcting RxJS readiness handling.
- Eliminated SSR hydration mismatches caused by inconsistent TransferState key prefixes.=

### 🧩 ICU-lite Improvements

- Expanded interpolation token support to include common patterns such as dotted and hyphenated keys (e.g. `{user.name}`, `{user-name}`).
- Hardened plural parsing to safely handle nested placeholders within plural option bodies.
- Added clearer documentation and tests to explicitly define **supported vs unsupported ICU features**, preserving the intended “ICU-lite” scope.

### 📦 Package & Ecosystem Updates

- Bumped all `@ngx-runtime-i18n/*` packages to **v2.0.0**.
- Broadened Angular peer dependency support to **`>=16 <22`**.
- Added comprehensive tests across new APIs to prevent regressions.
- Improved documentation across packages to reflect new capabilities and integration options.

### ⚠️ Notes

- This is a **non-breaking major release** in terms of runtime behavior; the major version reflects API surface growth, SSR guarantees, and ecosystem expansion.
- No full ICU runtime is introduced; advanced ICU features such as `select` remain intentionally out of scope.

## 1.2.0 (2025-11-14)

- Added configurable fallback chains via `RuntimeI18nConfig.fallbacks` with ordered resolution inside `I18nService.t()`.
- Extended translation lookup to walk the active lang, configured fallbacks, and `defaultLang`, logging a single warning per missing key.
- Introduced optional catalog caching backed by `RuntimeI18nOptions.cacheMode` (`none`, `memory`, `storage`) and `cacheKeyPrefix` for persistent storage.
- Added DX helper accessors on `I18nService`: `getCurrentLang()`, `getLoadedLangs()`, and `hasKey()` for tooling and diagnostics.
- Refreshed documentation, changelog, and the demo/SSR app to showcase fallback chains plus storage caching.
- Bumped `@ngx-runtime-i18n/*` packages to v1.2.0; no breaking changes.

## 1.1.0 (2025-11-14)

- Added configurable fallback chains with ordered resolution in both packages
- Introduced catalog caching modes (`none`/`memory`/`storage`) with localStorage hydration
- Added `I18nService` DX helpers (`getCurrentLang`, `getLoadedLangs`, `hasKey`)
- Updated demos, docs, and SSR example to reflect the real Angular API
- Improved README alignment across packages; no breaking changes

## 1.0.3 (2025-10-27)

- Initial stable release of `@ngx-runtime-i18n`
- Added SSR + CSR demos (Angular 20)
- Added TransferState seeding helpers for hydration-safe SSR
- Published to npm as `@ngx-runtime-i18n/core` and `@ngx-runtime-i18n/angular`
