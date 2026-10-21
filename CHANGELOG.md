# Changelog

## Unreleased

### `@ngx-runtime-i18n/core`

- **Breaking:** ICU apostrophe quoting. `''` now renders as `'`, and a `'` directly before `{` or `}`, or before `#` inside a `plural`/`selectordinal` block, quotes text up to the next lone `'`. A lone apostrophe anywhere else (`don't`, or `'#42'` outside a plural) is still literal. Messages that wrapped a placeholder in straight quotes, like `"Delete '{name}'?"`, now render `{name}` as literal text. Write `''{name}''` to keep the quotes around the value, or use typographic quotes. Catalogs exported from ICU-aware translation tools already double their apostrophes, and those now render correctly instead of showing `''`.
- **Feature:** ICU `number`, `date` and `time` arguments: `{n, number}`, `{n, number, integer|percent|::currency/XXX}` and `{d, date|time, short|medium|long|full}`, formatted with `Intl.NumberFormat`/`Intl.DateTimeFormat` for the active language. Formatters are cached per kind, language and style, capped at 256 entries so a server passing request-derived languages can't grow the cache without limit. A missing argument is left as written. A value that can't be formatted renders as `String(value)` instead of throwing, and is never read again as a `{placeholder}`. That covers an invalid date, a date value that isn't a `Date` or a number, a non-numeric number, a malformed currency code and an invalid language tag. Dates render in the runtime's local time zone. `ExtractParams` types these arguments as `number` and `Date | number`; before, it produced a param literally named `"d, date"`.
- **Fix:** `#` in `plural`/`selectordinal` branches rendered `String(n)` (`1234`) in every language. It's now formatted for the locale (`1,234` in `en`, `1.234` in `de`), as ICU specifies. Like ICU, this rounds a fractional count to three decimal places, and `-0` renders as `0`.
- **Fix:** `{toString}`, `{constructor}` and other `Object.prototype` names were read off the params object's prototype, so they rendered `function toString() { [native code] }`. Params are now read as own properties only, and those placeholders stay as written.
- **Fix:** `plural`, `select` and `selectordinal` blocks only recognised `\w+` argument names, so `{item-count, plural, ...}` rendered as literal text while `{item-count}` interpolated fine. All argument patterns now accept the same dotted and hyphenated names as `{user.name}`.
- **Fix:** `ExtractParams` only trimmed spaces after a keyword's comma. It now trims tabs, newlines and trailing spaces too, so `{n, number }` types as `{ n: number }`.

### `@ngx-runtime-i18n/angular`

- **Fix (SSR):** on the server, `I18nService` removed the TransferState bootstrap snapshot before Angular serialized the state, so it never reached the browser. The browser then picked a language on its own (stored choice, then `navigator.language`) and could swap the server-rendered text right after hydration. The snapshot is now only removed in the browser, after it has been read.
- **Fix (SSR):** service startup is subscribed to `ApplicationRef.isStable` and only unsubscribed after it finished loading. When the app went unstable and stable again in between, which the startup's own language change does during a server render, startup ran a second time, found the snapshot gone and reset the language to `defaultLang`. Startup now runs once.
- **Feature:** `provideRuntimeI18nSsr()` also accepts a factory, which runs in an injection context. That's what lets a per-request snapshot reach the app under `AngularNodeAppEngine`: pass it as `handle(req, snapshot)` and read it back with `inject(REQUEST_CONTEXT)`. A factory that returns `null` (prerendering, where there's no request) seeds nothing.
- **Docs:** the SSR guide, the Express recipe and the README passed the snapshot as `handle(req, { providers: [...] })`. That's the old `CommonEngine` API. `AngularNodeAppEngine` treats the second argument as an opaque request context, so the snapshot was silently dropped. They now show the `REQUEST_CONTEXT` pattern and explain that per-request routes need `RenderMode.Server`.

### `@ngx-runtime-i18n/cli`

- **Breaking:** requires Node.js 22.12 or newer (`engines.node` was `>=18`), because it now depends on `commander@15`, which is ESM-only and sets that floor. Node 18 and 20 are both past end-of-life.
- **Behavior change:** unexpected positional arguments now fail the run (commander 13+ default). The common mistake `--langs en fr` used to check only `en` and silently ignore `fr`; it now exits with `error: too many arguments`.
- **Fix:** `ngx-i18n --version` was a hardcoded string that had to be bumped by hand on every release; it's now read from the package's own `package.json`.
- The bin itself is now covered end to end: the test target builds the CLI and runs `dist/cli.js` for `--version`, `extract` then `check`, the missing `--src`/`--manifest` guard, and excess-argument rejection.

### Repo

- `apps/demo-ssr` now renders per request (`RenderMode.Server`) and passes its snapshot through `REQUEST_CONTEXT`, so `?lang`, the `lang` cookie and `Accept-Language` actually change the server-rendered language. It used to prerender every page in English. Under `nx serve` it now reads catalogs from the source folder, where it used to render raw keys.
- The `demo-ssr-e2e` scaffold test (which expected "Welcome") is replaced with real checks: the server-rendered language, the serialized snapshot, `?lang` over `Accept-Language`, and a hydration test in a German-locale browser on a Hindi page. It runs against the built server, on its own port.
- CI has a new "Apps & SSR e2e" job that builds the apps, runs the site tests and runs that e2e on Chromium. Before, CI only built and tested the libraries.

## 2.2.0 (2026-09-05)

A full-repo adversarial review (five parallel deep-dive passes: core, the Angular bindings, the Material/PrimeNG/schematics adapters, the CLI, and the marketing/docs site) surfaced and fixed a real prototype-pollution crash, a client-side hydration-mismatch flash, a language-switching race condition, several silent-failure bugs in the schematics and CLI, and three site bugs (a blank page on a bad doc/recipe URL, a `noindex` tag that never cleared, and search being completely unreachable on mobile). `@ngx-runtime-i18n/primeng` has no functional changes in this release (see below) and stays at 3.0.0.

### `@ngx-runtime-i18n/core`

- **Security/correctness:** a `select` block's argument value (e.g. a user-supplied profile field) equal to `"constructor"`, `"hasOwnProperty"`, or another `Object.prototype` member name resolved to the inherited prototype function instead of the catalog's `other` clause, crashing with `TypeError: s.indexOf is not a function`. `parsePluralBody`'s option map is now built with `Object.create(null)`, closing this off entirely.
- **Correctness:** `offset:N` (valid ICU plural syntax, e.g. `{count, plural, offset:1 =0 {no one} other {you and # others}}`) was parsed as an ordinary selector key, which broke parsing of the *entire* clause and silently rendered `''` with no error. `offset:N` is now parsed and applied correctly (subtracted from the count for category selection and `#`, but not for `=N` exact-match comparisons, per the ICU spec).
- **Correctness:** `ExtractParams<S>`, the type-level machinery behind `TranslationParams<K>`, stopped at the first `}` in a message string - for any `plural`/`select`/`selectordinal` block (i.e. exactly the messages this package is built to support), it produced garbage property names instead of the real param shape. It's now brace-depth-aware, and also tolerates the arbitrary whitespace after a keyword's comma that the runtime scanner already allowed.
- **Fix:** `formatIcu(lang, key, catalog, params)` crashed on `params: null` (only `undefined` triggers a default parameter); it now treats `null` the same as an empty object.
- **Fix:** the built-in one/other plural fallback (used when no `pluralResolver` is supplied) treated negative counts as `other` (`"-1 items"`); it's now sign-agnostic (`Math.abs(n) === 1`), matching real CLDR cardinal rules.
- **Fix:** a non-numeric `plural`/`selectordinal` count (e.g. a stray string param) rendered the literal text `"NaN"` into `#`; it now falls back to `0`.
- **Docs:** the README's API section was missing the `pluralResolver` parameter and didn't document `I18nSchema`, `TranslationKey`, `TranslationParams`, `DeepKeys`, `ExtractParams`, `ActiveCatalogType`, `PluralCategory`, or `PluralResolver` at all - all now documented, including the module-augmentation workflow.
- 6 new regression tests cover all of the above.

### `@ngx-runtime-i18n/angular`

- **Critical (hydration mismatch):** `I18nService`'s `_lang` signal was seeded with `defaultLang` and only corrected to the SSR-resolved language inside an `ApplicationRef.isStable` callback - which fires *after* the first render/hydration pass. Any template reading `lang()`/`t()`/`I18nPipe` during that first pass used the wrong language whenever SSR resolved a non-default one (e.g. `hi` while `defaultLang` is `en`), a visible flash on every such page load. `_lang` is now peeked from the TransferState snapshot synchronously in the constructor (read-only; the existing `isStable` block still does its own read + remove at the same timing as before, so SSR-side TransferState serialization is unaffected).
- **Critical (race condition):** rapid concurrent `setLang()` calls (e.g. `fr` then `de` before the first resolves) could abort each other unpredictably and leave the active language as whichever fetch happened to *settle* last, not whichever was *requested* last. `setLang()` now tracks a generation token so a stale, superseded call can't clobber a newer one's result.
- **High:** that same cancellation (`cancelFetchesOutside`) also aborted any unrelated in-flight `preloadLang()`/`preloadLangs()` fetch that fell outside the switch's chain, silently defeating deliberate preloading. Preload-tagged fetches are now never cancelled by a switch.
- **High:** `t()`, `I18nPipe.transform()`, and `I18nCompatService.t()` all typed `params` as optional (`params?:`) even when `TranslationParams<K>` resolved to a required shape, so a schema-augmented app could omit a required param and still compile - directly contradicting the README's documented "Error - missing required param" behavior. All three now use a conditional tuple (`ParamsArgs<K>`) that makes the argument required exactly when the schema says it should be, and stays optional both when no schema is augmented and when a key genuinely takes no params.
- **High:** `provideRuntimeI18nTesting()` never installed a `RUNTIME_I18N_PLURAL_RESOLVER`, so any test asserting `plural`/`selectordinal` output silently exercised only the core one/other fallback instead of the real CLDR-backed resolver production uses. Both providers now share the same resolver factory.
- **Medium:** re-loading an already-loaded scope catalog (e.g. a parent route re-activating after a child scope loaded) never moved it back to "most recently loaded" in `t()`'s scope-precedence order, since re-`set`-ing an existing `Map` key doesn't reorder it. `loadScope()` now deletes-then-recreates the entry so recency is always correct.
- **Medium:** `ensureLocale()` skipped the locale-data loader entirely on the server (`isBrowserPlatform` gate), leaving server-rendered `DatePipe`/`DecimalPipe` mis-localized to Angular's default locale instead of the target language. A locale loader is a plain dynamic import with no DOM dependency, so it now runs on the server too.
- **Medium:** `provideRuntimeI18n()` now throws a clear startup error when `defaultLang` isn't included in `supported`, instead of silently resolving to an empty fallback chain and failing every single `t()` call with no indication why.
- 8 new regression tests cover all of the above (hydration seeding, the race condition, preload isolation, scope recency, SSR locale registration, plural-resolver parity, and the startup validation).

### `@ngx-runtime-i18n/material`

- **Fix:** the `datepicker` field in `MaterialI18nLabels` was accepted by the public API and documented ("Keeps ... datepicker ... in sync"), but the code path that applied it was a no-op comment. `MatDatepickerIntl` is a real injectable Intl service with the exact same shape as the three already wired up (`MatPaginatorIntl`/`MatSortHeaderIntl`/`MatStepperIntl`), so it's now actually applied instead of the claim being walked back.
- **Fix:** a synchronous throw inside a caller-supplied `resolveLabels()` escaped uncaught out of `effect()` (`Promise.resolve(fn())` evaluates `fn()` eagerly, outside the promise machinery) - unlike the equivalent PrimeNG adapter, which already wrapped this in try/catch. Now wrapped identically via an async IIFE.
- 2 new regression tests (datepicker application, the sync-throw fix).

### `@ngx-runtime-i18n/schematics`

- **Critical:** if none of the three candidate `app.config.ts` paths existed at all (an NgModule-based app, a non-standard layout, or the wrong `--project`), `ng add` completed with no error and no warning while `provideRuntimeI18n()` was never wired in. Now throws, matching the existing "no `providers: [` array" failure mode.
- **High:** the import-presence check was keyed on the module specifier (`@ngx-runtime-i18n/angular`) rather than the `provideRuntimeI18n` symbol - an app that already imported anything else from that module (e.g. `I18nService`) would get a call to `provideRuntimeI18n(...)` injected with no import added for it, producing an uncompilable `app.config.ts`. Now checks for the specific named import.
- **Docs:** the README claimed the package wasn't yet published to npm and documented a `--ssr` schematic option that doesn't exist in `schema.json` - both stale; corrected.
- 2 new regression tests.

### `@ngx-runtime-i18n/cli`

- **Critical:** running `check` with neither `--src` nor `--manifest` silently treated the used-key set as empty and reported a clean pass (`✓ en: 0/0 keys present`, exit code 0) - even with `--fail-on-missing` set. A CI script that drops one of those flags by mistake would silently stop catching missing keys forever. `check()` now throws (and the CLI prints a clear error and exits non-zero) when neither is provided.
- **High:** both scanners only matched within a single line, so a call/pipe usage split across lines (formatted code, long keys) was silently dropped with no diagnostic. Both now scan whole-file content and map match offsets back to line numbers.
- **High:** neither scanner stripped comments before scanning, so a key referenced only in a `// commented-out` call or a `<!-- commented-out -->` template was counted as "used", masking genuinely-unused catalog keys and defeating `--fail-on-unused`. Both now blank out comments before matching (HTML comments exactly, via `<!-- -->`; TS comments heuristically, since this is a regex scanner rather than a full parser).
- **High:** the HTML pipe-usage regex used `[\w.]+` for the key, excluding hyphens, while the TS scanner's equivalent pattern allowed them - a hyphenated key in a template was silently missed. Now consistent between both scanners.
- **High:** a dynamic/computed key (a template literal, a bare variable) was silently dropped from both "used" and "unused" reporting with zero diagnostic. Both `extract` and `check` now surface these as `⚠ N i18n call(s) use a dynamic/computed key` warnings with the exact `file:line`.
- **High:** a malformed `--manifest` JSON file produced a raw, unhandled `SyntaxError` with no filename; running with `program.parse()` instead of `parseAsync()` also meant any internal crash became an unhandled promise rejection whose "success" as a non-zero exit code depended on Node's default behavior rather than an explicit one. Manifest parsing is now wrapped with a clear error message, and the CLI uses `parseAsync()` with an explicit top-level catch and `process.exitCode`.
- **Medium:** "unused" keys were only ever computed when `--fail-on-unused` was passed, so there was no way to get an informational-only listing; now always computed, with that flag only controlling whether it fails the run.
- **Medium:** `readCatalog()` joined an unsanitized `--langs` entry directly into a file path (`--langs ../../secret` resolves outside the catalog directory); language codes are now validated against a safe charset.
- **Docs:** the README claimed the CLI wasn't yet published to npm (it has been since 2.1.0); corrected, and the above behaviors documented.
- 16 new regression tests across the scanners, `check()`, and the catalog reader.

### Site (`apps/site`, not published to npm)

- **Critical:** a bad `/docs/**` or `/recipes/:slug` URL correctly set `noindex` and a "not found" title, but the page body rendered completely blank - `@if (doc(); as d)` had no `@else`. Both pages now render a proper not-found message with a link back to the docs/recipes index.
- **Critical:** `setNoIndex()` (used on the 404 route and a bad doc/recipe slug) was never reset by `setPageMeta()`, so navigating from a 404 to a real page client-side left `<meta name="robots" content="noindex">` in place for the rest of the session - permanently de-indexing a real page for any crawler that renders JS. `setPageMeta()` now resets it to `index,follow` as part of its normal path.
- **Critical:** search was completely unreachable on mobile - the trigger button is `hidden md:flex`, and the mobile nav panel had no equivalent entry. A search entry was added to the mobile nav panel; both triggers now share a `data-search-trigger` attribute picked up via event delegation (not a one-time query), since the mobile entry only exists in the DOM while its panel is open.
- **Medium:** the search palette's combobox had no `Home`/`End` handling (ARIA APG expects it); added.
- **Medium:** opening the search palette while its index was still fetching showed a false "No results found." instead of a loading state; added.
- **Medium:** JSON-LD was serialized with no escaping - a title/description containing the literal substring "closing script tag" would corrupt the *prerendered static HTML*, not just the live DOM, by ending the tag early. Every less-than character is now replaced with its escaped Unicode code point before being written into the script tag, so the substring can no longer appear literally.
- **Medium:** the hero's auto-cycling language text paused on mouse hover/focus, but the element had no `tabindex` and so was never natively focusable - a keyboard-only user had no way to pause it (WCAG 2.2.2). Now focusable.
- **Low:** `build-content.mjs` had no per-file error handling around markdown compilation, so an unsupported code-fence language or similar Shiki/rehype-pretty-code failure in any single doc/recipe would fail the entire production build with no indication of which file caused it. Now wrapped with a clear `Failed to compile <file>` message.
- 5 new regression tests.

### Not changed in this release

`@ngx-runtime-i18n/primeng` had no functional changes (only a README wording correction on its PrimeNG-17 support claim, clarifying what's actually verified against a real install vs. structurally assumed) and stays at 3.0.0, consistent with this project's practice of not bumping a package for a docs-only change.

### Packages

Bumped `@ngx-runtime-i18n/core`, `/angular`, `/material`, `/schematics`, and `/cli` to v2.2.0.

## @ngx-runtime-i18n/primeng 3.0.0 (2026-08-17)

Released on its own, out of lockstep with the other five packages (which have no changes here) - the fix below is scoped to this one package and didn't warrant five no-op version bumps.

`@ngx-runtime-i18n/primeng`'s peer range (`primeng: >=17 <20.4.0`) was wrong the moment it shipped: `PrimeNGConfig`, the class this package imported from `primeng/api`, was removed from that module starting PrimeNG 18.0.0 - PrimeNG renamed and relocated it to `PrimeNG` in `primeng/config`. Nothing caught this because `primeng` was never actually installed in this workspace; a hand-written type shim stood in for it in every build and test run. Anyone on PrimeNG 18.x or 19.x - versions inside the range this package claimed to support - would have hit a build failure.

- **Breaking:** `providePrimeNgRuntimeI18n()` now takes a required `configToken` option: the PrimeNG config class installed in your app (`PrimeNGConfig` from `primeng/api` on v17, `PrimeNG` from `primeng/config` on v18-21), typed structurally rather than imported by this package. This package no longer has any compile-time dependency on `primeng` at all, so it isn't coupled to whatever PrimeNG renames next.
- Peer range corrected to `primeng: >=17 <22` - v17 through v21, every release actually licensed MIT. PrimeNG 22 moved to a commercial license ([PrimeTek's announcement](https://primeui.dev/nextchapter)); verified by pulling the real `LICENSE.md` out of each published version's npm tarball, not the registry's summary field. This package doesn't claim to support v22.
- Removed the hand-written `primeng/api` type shim. Added a new spec that installs a real, current PrimeNG version (21.1.9) as a devDependency and drives the adapter through the real APP_INITIALIZER + `effect()` pipeline against the actual `PrimeNG` class - the first time this package has been tested against real PrimeNG rather than a fake stand-in.

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
