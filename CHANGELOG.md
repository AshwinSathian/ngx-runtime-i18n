# Changelog

## 2.0.0 (2026-01-05)

- Bumped `@ngx-runtime-i18n/*` packages to v2.0.0.
- Broadened Angular peer dependency range to `>=16 <22`.
- No runtime behavior changes in this release commit; follow-up epics address bug fixes and enhancements.

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
