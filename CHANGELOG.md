# Changelog

## 2.1.0 (2026-08-12)

`@ngx-runtime-i18n/angular` and `/primeng` were stuck on npm at 2.0.0 with an Angular peer range (`>=16 <21`) that didn't support Angular 21 or 22 at all - this release fixes that, and publishes `@ngx-runtime-i18n/material`, `/schematics`, and `/cli` for the first time. `@ngx-runtime-i18n/core` has no functional changes in this release; its version is bumped in lockstep with the rest of the packages, per this project's existing convention of releasing all six together.

### Angular 20 → 22 / Nx 22 → 23 tooling upgrade

- Upgraded Angular from 20.3.27 to 22.1.1 (via an intermediate 21.2.19 stage, per Angular's own one-major-version-at-a-time update policy), Nx from 22.7.8 to 23.1.1, TypeScript from 5.9.2 to 6.0.3, and the Jest toolchain from Jest 29/jest-preset-angular 14 to Jest 30/jest-preset-angular 17.
- Widened `@ngx-runtime-i18n/angular`, `@ngx-runtime-i18n/material`, and `@ngx-runtime-i18n/primeng` peer dependency ranges to admit Angular 22 (`<23`).
- No intentional runtime behavior changes from the upgrade itself: Angular's own v21/v22 migrations preserved existing change-detection and hydration defaults where its new defaults would otherwise have altered them (`ChangeDetectionStrategy.Eager` on the two demo components that had no explicit strategy; `withNoIncrementalHydration()` on the SSR demo's hydration config).
- The SSR demo's Node server now configures `allowedHosts` explicitly for `AngularNodeAppEngine`, required by Angular 22's new built-in Host-header validation (SSRF hardening).

### Fixes found in a full-repo review ahead of this release

- **`I18nService.hasKey()`** used the `in` operator, which checks the entire prototype chain rather than the catalog's own keys. A translation key matching a builtin `Object.prototype` member name (e.g. `"constructor"`, `"toString"`) would be treated as present on every catalog, silently skipping both the fallback-chain continuation and the dev-mode missing-key warning. Fixed to use `hasOwnProperty`, consistent with the core ICU engine's own key lookup; covered by a new regression test.
- **Migrated off `APP_INITIALIZER`/`ENVIRONMENT_INITIALIZER`**, deprecated by Angular since v19, to `provideAppInitializer()`/`provideEnvironmentInitializer()` across `provideRuntimeI18n`, `provideRuntimeI18nSsr`, `withI18nScope` (`@ngx-runtime-i18n/angular`), `provideMaterialRuntimeI18n` (`/material`), and `providePrimeNgRuntimeI18n` (`/primeng`).
  - **Potentially breaking for TypeScript consumers of `@ngx-runtime-i18n/angular` or `/primeng`:** `provideRuntimeI18nSsr()` and `providePrimeNgRuntimeI18n()` now return `EnvironmentProviders` instead of `Provider[]`. Runtime usage is unaffected if you place the result directly in a `providers` array (the documented, common pattern) - only code that explicitly typed a variable as `Provider[]` or spread the result (`...provideRuntimeI18nSsr(...)`) needs updating to drop the spread and/or retype as `EnvironmentProviders`. `provideRuntimeI18n()` and `withI18nScope()` are unaffected (unchanged or already-compatible return shape).
- **`@ngx-runtime-i18n/schematics`'s README** existed as a source file but was never copied into the published package - this would have been its first npm page with no description or usage docs. Fixed the build's asset list; this is its first-ever publish, so no prior version shipped without it.

### Packages

- Bumped all `@ngx-runtime-i18n/*` packages and the CLI to v2.1.0.
- First publish of `@ngx-runtime-i18n/material`, `@ngx-runtime-i18n/schematics`, and `@ngx-runtime-i18n/cli`.

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
