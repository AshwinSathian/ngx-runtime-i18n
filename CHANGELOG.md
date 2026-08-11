# Changelog

## Unreleased

### Tooling upgrade

- Upgraded Angular from 20.3.27 to 22.1.1 (via an intermediate 21.2.19 stage), Nx from 22.7.8 to 23.1.1, TypeScript from 5.9.2 to 6.0.3, and the Jest toolchain from Jest 29/jest-preset-angular 14 to Jest 30/jest-preset-angular 17.
- Widened `@ngx-runtime-i18n/angular`, `@ngx-runtime-i18n/material`, and `@ngx-runtime-i18n/primeng` peer dependency ranges to admit Angular 22 (`<23`, up from `<22`).
- No intentional runtime behavior changes: Angular's own v21/v22 migrations preserved existing change-detection and hydration defaults where its new defaults would otherwise have altered them (`ChangeDetectionStrategy.Eager` on the two demo components that had no explicit strategy; `withNoIncrementalHydration()` on the SSR demo's hydration config).
- The SSR demo's Node server now configures `allowedHosts` explicitly for `AngularNodeAppEngine`, required by Angular 22's new built-in Host-header validation (SSRF hardening).

## 2.0.0 (2026-01-05)

SSR correctness fixes, a language-switching signal, preload APIs, and a new optional PrimeNG adapter package. No breaking changes to runtime behavior; the major version bump reflects the API surface growth.

### SSR

- Added an official SSR provider API for Angular, removing the need for demo-only or copy-pasted server logic.
- Fixed TransferState hydration so SSR seeding and client consumption share one consistent key strategy.
- Updated the SSR demo and docs to use the exported SSR helper.
- Eliminated SSR hydration mismatches caused by inconsistent TransferState key prefixes.

### Language switching

- Introduced an explicit language switching/loading signal in the Angular service, so UIs can react during runtime language changes.
- Added preload APIs to warm language and catalog data without mutating the active language, useful for route prefetching and profile/settings screens.

### New PrimeNG adapter

- Added `@ngx-runtime-i18n/primeng`, an optional adapter that reacts to runtime language changes, applies translations via `PrimeNGConfig`, supports sync or async translation resolution, and stays decoupled from the core and Angular packages. No PrimeNG dependency leaks into existing packages.

### Bug fixes

- Fixed `I18nCompatService.whenReady()` resolving prematurely by correcting RxJS readiness handling.

### ICU-lite

- Expanded interpolation token support to include common patterns such as dotted and hyphenated keys (e.g. `{user.name}`, `{user-name}`).
- Hardened plural parsing to safely handle nested placeholders within plural option bodies.
- Documented and tested the supported vs. unsupported ICU feature set, preserving the intended "ICU-lite" scope.

### Packages

- Bumped all `@ngx-runtime-i18n/*` packages to v2.0.0.
- Broadened Angular peer dependency support to `>=16 <22`.
- Added tests across the new APIs.
- Updated documentation across packages to reflect the new capabilities.

No full ICU runtime is introduced; advanced ICU features such as `select` remain out of scope.

## 1.2.0 (2025-11-14)

- Added configurable fallback chains via `RuntimeI18nConfig.fallbacks` with ordered resolution inside `I18nService.t()`.
- Extended translation lookup to walk the active lang, configured fallbacks, and `defaultLang`, logging a single warning per missing key.
- Introduced optional catalog caching backed by `RuntimeI18nOptions.cacheMode` (`none`, `memory`, `storage`) and `cacheKeyPrefix` for persistent storage.
- Added DX helper accessors on `I18nService`: `getCurrentLang()`, `getLoadedLangs()`, and `hasKey()` for tooling and diagnostics.
- Refreshed documentation, changelog, and the demo/SSR app to cover fallback chains plus storage caching.
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
