# Engineering Plan — ngx-runtime-i18n

> **Document type:** Engineering Execution Plan  
> **Status:** Active — v2.0.1 through v3.x  
> **Last updated:** June 2026  
> **Audience:** All engineers contributing to `@ngx-runtime-i18n/*`

This document is the authoritative source of truth for what the engineering team is building, why, in what order, and to what quality standard. It is intentionally prescriptive. Engineers should read each phase completely before beginning work, commit frequently and atomically throughout, and verify each task's acceptance criteria before closing it.

---

## Table of Contents

1. [Mission & Quality Bar](#1-mission--quality-bar)
2. [Engineering Norms](#2-engineering-norms)
   - 2.1 Conventional Commits
   - 2.2 Branch Strategy
   - 2.3 Pull Request Process
   - 2.4 Testing Standards
   - 2.5 Definition of Done
3. [Phase 0 — Critical Fixes (v2.0.1)](#3-phase-0--critical-fixes-v201)
4. [Phase 1 — Type Safety (v3.0)](#4-phase-1--type-safety-v30)
5. [Phase 2 — ICU Completeness (v2.1)](#5-phase-2--icu-completeness-v21)
6. [Phase 3 — DX Tooling (v3.x)](#6-phase-3--dx-tooling-v3x)
7. [Phase 4 — Ecosystem (v3.x)](#7-phase-4--ecosystem-v3x)
8. [Release Process](#8-release-process)

---

## 1. Mission & Quality Bar

**Mission:** Make `ngx-runtime-i18n` the obvious choice for runtime internationalisation in new Angular 18+ projects by being the only Angular i18n library that delivers all of: native Signals, Level-3 type safety, first-class SSR, route-level lazy loading, and production-grade tooling.

**Quality bar:** Every feature and fix must be at the level expected by the teams maintaining Angular CDK, NgRx, and transloco. That means:

- No feature ships without tests that cover the happy path, error paths, and edge cases
- No public API change ships without updated documentation and, where relevant, a migration note
- TypeScript strict mode is non-negotiable — no `any`, no `// @ts-ignore`, no implicit return types on public methods
- Bundle size is a first-class constraint — every addition to `@ngx-runtime-i18n/core` must be justified against its gzipped cost
- Backward compatibility is the default assumption; breaking changes require a major version bump and a documented migration path

---

## 2. Engineering Norms

### 2.1 Conventional Commits

This repository uses the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification, matching the style used by Angular, NgRx, and Angular Material. Every commit must conform. CI will enforce this via commitlint (to be wired in Phase 0).

**Format:**
```
<type>(<scope>): <short imperative description>

[optional body: why, not what]

[optional footer: BREAKING CHANGE: <description>]
```

**Types:**

| Type | Use for |
|---|---|
| `feat` | A new user-visible feature |
| `fix` | A bug fix |
| `perf` | A performance improvement without behaviour change |
| `refactor` | Internal restructuring with no behaviour change |
| `test` | Adding or fixing tests only |
| `docs` | Documentation only |
| `chore` | Build system, tooling, dependency updates |
| `ci` | Changes to CI configuration |
| `revert` | Reverts a previous commit |

**Scopes** (match the Nx project name or concern):

| Scope | Covers |
|---|---|
| `core` | `libs/runtime-i18n` — the core package |
| `angular` | `libs/runtime-i18n-angular` — the Angular package |
| `primeng` | `libs/runtime-i18n-primeng` — PrimeNG adapter |
| `material` | `libs/runtime-i18n-material` — Angular Material adapter (Phase 4) |
| `testing` | Testing helpers / `testing` entry point |
| `schematics` | `ng add` schematic package |
| `cli` | CLI extractor tool |
| `packaging` | `package.json`, peer deps, exports map, `ng-package.json` |
| `demo` | Demo apps only |
| `docs` | Documentation site |
| `ci` | GitHub Actions workflows |

**Examples:**
```
fix(packaging): widen Angular peer dep range from <21 to <22
feat(angular): export RUNTIME_I18N_OPTIONS from public API
feat(testing): add provideRuntimeI18nTesting() helper and /testing entry point
feat(core): add I18nSchema module augmentation interface
feat(core): add DeepKeys and ExtractParams utility types
feat(angular): type-narrow t() signature against I18nSchema
feat(core): add plural resolver hook for CLDR-aware plural selection
feat(core): add select form to ICU message formatter
feat(angular): wire Angular CLDR plural resolver to formatIcu
feat(schematics): add ng-add schematic for @ngx-runtime-i18n/angular
feat(angular): add withI18nScope() for route-level catalog splitting
feat(angular): add t$() computed signal helper on I18nService
feat(cli): add extract and check commands to @ngx-runtime-i18n/cli
feat(material): add Angular Material adapter package
```

**Commit cadence:** Commit after every discrete, passing change. Do not accumulate multiple concerns into one commit. If you are mid-task and need to switch context, stash or create a `wip:` prefixed branch commit. Never push a `wip:` commit to `main`.

### 2.2 Branch Strategy

```
main                    ← production-ready at all times
├── phase/0-critical-fixes
├── phase/1-type-safety
├── phase/2-icu-completeness
├── phase/3-dx-tooling
│   ├── feat/schematic-ng-add
│   ├── feat/scope-catalogs
│   └── feat/cli-extractor
└── phase/4-ecosystem
    ├── feat/material-adapter
    └── feat/docs-site
```

- Phase branches are long-lived and cut from `main`
- Feature branches are cut from the phase branch they belong to
- Phase branches merge into `main` only when all tasks in that phase pass CI and the team has signed off
- All PRs must be rebased onto their target branch before merging (no merge commits on feature branches; squash-merge is acceptable for small feature branches, rebase-merge for larger ones)

### 2.3 Pull Request Process

**Before opening a PR:**
- [ ] All new code has corresponding tests
- [ ] `npm run ci` passes locally (build + test for all three packages)
- [ ] `nx affected:lint` reports zero errors
- [ ] Bundle size has been checked (`npm run build:libs` and inspect dist size)
- [ ] Public API changes are documented (JSDoc on exported symbols)
- [ ] `CHANGELOG.md` entries are drafted (or will be part of the PR description)

**PR description template:**

```markdown
## What

[1-3 sentences: what this PR does]

## Why

[1-3 sentences: motivation; link to ENGINEERING_PLAN.md task ID]

## How

[Brief technical summary if non-obvious]

## Testing

[What tests were added and why they are sufficient]

## Checklist
- [ ] Unit tests added/updated
- [ ] Public API documented
- [ ] Bundle impact checked
- [ ] No breaking changes (or BREAKING CHANGE footer added to commits)
```

**Review requirements:**
- At least one approving review before merge
- All CI checks green
- No unresolved review comments

### 2.4 Testing Standards

The testing pyramid for this codebase:

```
        ┌──────────────┐
        │   E2E / SSR  │  ← Playwright: smoke test real rendering
        │  (smallest)  │
        ├──────────────┤
        │ Integration  │  ← TestBed: service+pipe wired together
        │  (medium)    │
        ├──────────────┤
        │    Unit      │  ← Jest: pure functions, isolated service logic
        │  (largest)   │
        └──────────────┘
```

**Minimums per task:**

| Task type | Unit tests | Integration tests | E2E |
|---|---|---|---|
| Core utility (ICU, types) | Required | Not required | Not required |
| Service method | Required | Required | Not required |
| Provider function | Required | Required | Not required |
| Pipe / Directive | Required | Required | Consider |
| Schematic | Unit (collection runner) | Required (real Angular workspace) | Not required |
| CLI command | Unit (command logic) | Required (real FS fixture) | Not required |

**Test naming conventions** (mirrors Angular source):

```typescript
describe('ClassName', () => {
  describe('methodName()', () => {
    it('does X when Y', () => { ... });
    it('throws when Z', () => { ... });
  });
});
```

**Coverage target:** Lines ≥ 90%, Branches ≥ 85% for `core` and `angular` packages. Coverage gates are enforced in CI. Do not exempt lines without a comment explaining why.

**What makes a test good in this codebase:**
- It tests the documented contract, not the implementation detail
- It does not use `// @ts-ignore` or cast to `any` to avoid type errors
- It cleans up after itself (no shared mutable state between tests)
- It is deterministic — no `setTimeout`, no real network calls, no real filesystem reads without mocking
- Missing-key warnings in dev mode must be tested with `jest.spyOn(console, 'warn')`

### 2.5 Definition of Done

A task is **Done** when:

1. Implementation is complete and matches the API design in this document
2. All tests pass (`npm run ci`)
3. Coverage thresholds are not regressed
4. The public API is documented with TSDoc (`@publicApi` on exported symbols, `@experimental` where appropriate)
5. `CHANGELOG.md` has a draft entry for the change
6. The relevant section of `README.md` or package README is updated
7. A commit (or squashed set of commits) following the Conventional Commits format has been made
8. The task's acceptance criteria (listed per task below) are met

---

## 3. Phase 0 — Critical Fixes (v2.0.1)

**Goal:** Unblock real-world users with zero behavioural changes. Ship as a patch within days of this document being adopted.

**Branch:** `phase/0-critical-fixes`

**Target version:** `2.0.1` for all packages

---

### Task 0.1 — Widen Angular peer dependency range

**Priority:** P0 — blocks installation for users on Angular 20 inside strict monorepos and will block all Angular 21 users.

**Context:** The published packages declare `"@angular/core": ">=16 <21"`. The monorepo itself builds with Angular 20. Documentation and code comments state the intent is `<22`. This mismatch causes npm/pnpm/yarn to reject the package with a peer dependency conflict in workspaces that have hoisted Angular 20 or 21.

**Files to change:**

- `libs/runtime-i18n-angular/package.json`
- `libs/runtime-i18n-primeng/package.json`

**Exact change in both files:**

```jsonc
// Before
"peerDependencies": {
  "@angular/common": ">=16 <21",
  "@angular/core": ">=16 <21",
  "@angular/platform-browser": ">=16 <21"
}

// After
"peerDependencies": {
  "@angular/common": ">=16 <22",
  "@angular/core": ">=16 <22",
  "@angular/platform-browser": ">=16 <22"
}
```

For the PrimeNG adapter, also verify and update:

```jsonc
// libs/runtime-i18n-primeng/package.json
"peerDependencies": {
  "@ngx-runtime-i18n/angular": "^2.0.0",
  "primeng": ">=15 <19"   // verify current PrimeNG range; widen if needed
}
```

**Test plan:**
1. Run `npm run build:libs` — must pass
2. Run `npm run pack:angular && npm run pack:core` to produce tarballs
3. In a separate throw-away Angular 20 workspace: `npm install <path-to-tarball> --legacy-peer-deps=false` — must succeed without warnings

**Verification step:**
```bash
# After the fix, from repo root:
node -e "
  const pkg = require('./dist/libs/runtime-i18n-angular/package.json');
  console.assert(pkg.peerDependencies['@angular/core'] === '>=16 <22', 'peer dep wrong');
  console.log('peer dep OK:', pkg.peerDependencies['@angular/core']);
"
```

**Commit message:**
```
fix(packaging): widen Angular peer dep range from <21 to <22

Angular 20 users in strict monorepos and all future Angular 21
users were blocked by the overly narrow range. The declared intent
(code comments, docs) has always been <22.

Affects: runtime-i18n-angular, runtime-i18n-primeng
```

**Acceptance criteria:**
- [ ] Both package.json files updated
- [ ] Build passes
- [ ] No regressions in existing tests
- [ ] Manual install verification passes in a clean workspace

---

### Task 0.2 — Export `RUNTIME_I18N_OPTIONS` from the public API

**Priority:** P0 — blocks advanced SSR setups that need to inspect resolved options.

**Context:** `RUNTIME_I18N_OPTIONS` is an `InjectionToken<RuntimeI18nOptions>` declared in `libs/runtime-i18n-angular/src/lib/tokens.ts`. It is injected internally by `I18nService` and `provide-runtime-i18n.ts`. The `RuntimeI18nOptions` interface is also useful to consuming apps that want to type their own config objects or write conditional logic against the resolved options. Neither the token nor the interface is currently exported from the package's public barrel.

**Files to change:**

`libs/runtime-i18n-angular/src/index.ts`

```typescript
// Add to existing exports:
export {
  RUNTIME_I18N_CONFIG,
  RUNTIME_I18N_CATALOGS,
  RUNTIME_I18N_LOCALES,
  RUNTIME_I18N_STATE_KEY,
  RUNTIME_I18N_LOCALE_LOADERS,
  RUNTIME_I18N_OPTIONS,          // ← ADD
} from './lib/tokens';

export type { RuntimeI18nOptions } from './lib/tokens'; // ← ADD
```

**Test plan:**

Add a smoke test to `libs/runtime-i18n-angular/src/lib/i18n.service.spec.ts`:

```typescript
it('RUNTIME_I18N_OPTIONS resolves to the provided options', () => {
  const opts = TestBed.inject(RUNTIME_I18N_OPTIONS);
  expect(opts.cacheMode).toBe('memory');
  expect(opts.autoDetect).toBe(false);
});
```

This test also validates that the token is injectable, not just exported.

**Verification step:**

```bash
# After building, confirm the symbol appears in the bundle:
grep -r 'RUNTIME_I18N_OPTIONS' dist/libs/runtime-i18n-angular/
```

**Commit message:**
```
fix(angular): export RUNTIME_I18N_OPTIONS token and RuntimeI18nOptions type

Both were used internally but absent from the public barrel. Consuming
apps that inject the token for advanced SSR inspection or that want to
type their own config objects now have a clean import path.
```

**Acceptance criteria:**
- [ ] Token and interface exported from `@ngx-runtime-i18n/angular`
- [ ] Importable by consuming apps: `import { RUNTIME_I18N_OPTIONS } from '@ngx-runtime-i18n/angular'`
- [ ] Test added and passing

---

### Task 0.3 — Add `provideRuntimeI18nTesting()` and a `/testing` entry point

**Priority:** P1 — significant adoption friction: every app that writes component tests must manually wire fake providers. This is the pattern used by Angular itself (`provideNoopAnimations()`), NgRx (`provideMockStore()`), and transloco (`TranslocoTestingModule`).

**Context:** Without a testing helper, consuming teams write boilerplate like this in every spec:

```typescript
TestBed.configureTestingModule({
  providers: [
    { provide: RUNTIME_I18N_CONFIG, useValue: { ... } },
    { provide: RUNTIME_I18N_CATALOGS, useValue: new Map([['en', { key: 'Value' }]]) },
    { provide: RUNTIME_I18N_LOCALES, useValue: new Set(['en']) },
    // ... 4 more tokens
  ]
});
```

This is fragile, verbose, and breaks whenever new tokens are added.

**New file:** `libs/runtime-i18n-angular/src/testing/provide-runtime-i18n-testing.ts`

```typescript
import { Provider, signal } from '@angular/core';
import type { Catalog } from '@ngx-runtime-i18n/core';
import {
  RUNTIME_I18N_CATALOGS,
  RUNTIME_I18N_CONFIG,
  RUNTIME_I18N_LOCALE_LOADERS,
  RUNTIME_I18N_LOCALES,
  RUNTIME_I18N_OPTIONS,
  RUNTIME_I18N_STATE_KEY,
} from '../lib/tokens';
import { DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX } from '../lib/transfer-state-keys';

export interface RuntimeI18nTestingOptions {
  /**
   * Translation catalogs keyed by language. Defaults to `{ en: {} }`.
   * Example: `{ en: { 'hello': 'Hello!' }, de: { 'hello': 'Hallo!' } }`
   */
  catalogs?: Record<string, Catalog>;
  /** The active default language. Defaults to `'en'`. */
  defaultLang?: string;
  /** Supported languages. Defaults to the keys of `catalogs`. */
  supported?: string[];
}

/**
 * Returns Angular providers that wire up a fully-functional I18nService
 * for use in component and service unit tests — no HTTP, no TransferState,
 * no localStorage. The initial catalog is available synchronously.
 *
 * @example
 * TestBed.configureTestingModule({
 *   providers: [
 *     provideRuntimeI18nTesting({
 *       catalogs: { en: { 'app.title': 'My App' } }
 *     })
 *   ]
 * });
 *
 * @publicApi
 */
export function provideRuntimeI18nTesting(
  opts: RuntimeI18nTestingOptions = {}
): Provider[] {
  const defaultLang = opts.defaultLang ?? 'en';
  const catalogs = opts.catalogs ?? { [defaultLang]: {} };
  const supported = opts.supported ?? Object.keys(catalogs);

  const catalogMap = new Map<string, Catalog>(
    Object.entries(catalogs)
  );

  return [
    {
      provide: RUNTIME_I18N_CONFIG,
      useValue: {
        defaultLang,
        supported,
        fallbacks: [],
        fetchCatalog: (_lang: string) =>
          Promise.resolve(catalogs[_lang] ?? {}),
        onMissingKey: (k: string) => k,
      },
    },
    { provide: RUNTIME_I18N_CATALOGS, useValue: catalogMap },
    { provide: RUNTIME_I18N_LOCALES, useValue: new Set(supported.map(l => l.toLowerCase().split('-')[0])) },
    { provide: RUNTIME_I18N_STATE_KEY, useValue: DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX },
    { provide: RUNTIME_I18N_LOCALE_LOADERS, useValue: {} },
    {
      provide: RUNTIME_I18N_OPTIONS,
      useValue: {
        autoDetect: false,
        storageKey: null,
        cacheMode: 'memory',
        cacheKeyPrefix: '@ngx-runtime-i18n:catalog:',
        preferNavigatorBase: false,
      },
    },
  ];
}
```

**New barrel:** `libs/runtime-i18n-angular/src/testing/index.ts`

```typescript
export { provideRuntimeI18nTesting } from './provide-runtime-i18n-testing';
export type { RuntimeI18nTestingOptions } from './provide-runtime-i18n-testing';
```

**Update `ng-package.json`** to add the secondary entry point:

`libs/runtime-i18n-angular/ng-package.json`

```jsonc
{
  "$schema": "...",
  "lib": {
    "entryFile": "src/index.ts"
  },
  "secondaryEntries": [
    {
      "lib": {
        "entryFile": "src/testing/index.ts"
      }
    }
  ]
}
```

**Update the published `package.json` exports map:**

`libs/runtime-i18n-angular/package.json`

```jsonc
"exports": {
  ".": {
    "import": "./fesm2022/ngx-runtime-i18n-angular.mjs"
  },
  "./testing": {
    "import": "./testing/ngx-runtime-i18n-angular-testing.mjs"
  }
}
```

**Tests for the helper itself:**

New file: `libs/runtime-i18n-angular/src/testing/provide-runtime-i18n-testing.spec.ts`

```typescript
import { TestBed } from '@angular/core/testing';
import { I18nService } from '../lib/i18n.service';
import { provideRuntimeI18nTesting } from './provide-runtime-i18n-testing';

describe('provideRuntimeI18nTesting()', () => {
  it('provides I18nService with synchronous catalog access', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRuntimeI18nTesting({
          catalogs: { en: { 'app.title': 'My App' } }
        })
      ]
    });
    const i18n = TestBed.inject(I18nService);
    // Catalog is available immediately — no async boot needed
    expect(i18n.t('app.title')).toBe('My App');
  });

  it('returns the key when a key is missing', () => {
    TestBed.configureTestingModule({
      providers: [provideRuntimeI18nTesting()]
    });
    const i18n = TestBed.inject(I18nService);
    expect(i18n.t('does.not.exist')).toBe('does.not.exist');
  });

  it('reflects the defaultLang on the lang signal', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRuntimeI18nTesting({
          defaultLang: 'de',
          catalogs: { de: { 'key': 'Wert' } }
        })
      ]
    });
    const i18n = TestBed.inject(I18nService);
    expect(i18n.lang()).toBe('de');
  });

  it('supports multi-language catalogs', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRuntimeI18nTesting({
          catalogs: {
            en: { 'greeting': 'Hello' },
            fr: { 'greeting': 'Bonjour' }
          }
        })
      ]
    });
    const i18n = TestBed.inject(I18nService);
    await i18n.setLang('fr');
    expect(i18n.t('greeting')).toBe('Bonjour');
  });

  it('infers supported languages from catalog keys when not provided', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRuntimeI18nTesting({
          catalogs: { en: {}, de: {}, hi: {} }
        })
      ]
    });
    // setLang must not throw for any inferred language
    const i18n = TestBed.inject(I18nService);
    expect(() => i18n.setLang('de')).not.toThrow();
  });
});
```

**Commit sequence for this task:**

```
feat(testing): add testing/ secondary entry point scaffold
feat(testing): implement provideRuntimeI18nTesting() with options
test(testing): add tests for provideRuntimeI18nTesting()
feat(packaging): register /testing secondary entry in ng-package.json and exports map
```

**Acceptance criteria:**
- [ ] `import { provideRuntimeI18nTesting } from '@ngx-runtime-i18n/angular/testing'` works in a consuming app
- [ ] Secondary entry point is tree-shaken from production builds
- [ ] All 5 tests pass
- [ ] ng-packagr builds both primary and secondary entry points without error

---

### Phase 0 — Wrap-up

After all three tasks are done and passing:

```bash
# Bump all packages to 2.0.1
# Edit libs/runtime-i18n/package.json
# Edit libs/runtime-i18n-angular/package.json
# Edit libs/runtime-i18n-primeng/package.json

npm run ci  # full build + test

# Tag and release
git tag v2.0.1
git push origin phase/0-critical-fixes
# Open PR → main
```

```
chore(release): bump all packages to 2.0.1

Includes:
- fix(packaging): peer dep <21 → <22
- fix(angular): export RUNTIME_I18N_OPTIONS
- feat(testing): provideRuntimeI18nTesting() + /testing entry point
```

---

## 4. Phase 1 — Type Safety (v3.0)

**Goal:** Make `ngx-runtime-i18n` the only Angular runtime i18n library with Level-3 type safety: key autocomplete + typed interpolation parameters. Zero breaking changes for existing users who do not opt in.

**Branch:** `phase/1-type-safety`

**Target version:** `3.0.0` for `core` and `angular` packages

**Background on type safety levels** (for the whole team's context):

| Level | Description | Example |
|---|---|---|
| 0 | No types — key is `string`, return is `string` | `t(key: string): string` |
| 1 | Typed return, any key | Same but return is always `string` |
| 2 | Key autocomplete, untyped params | `t(key: keyof Translations): string` |
| 3 | Key autocomplete + typed params per key | `t(key: K, params: ParamsFor<K>): string` |
| 4 | Compile-time code generation | Paraglide, typesafe-i18n |

We are targeting Level 3. Level 4 requires a code generation step we are explicitly not doing.

---

### Task 1.1 — Add `I18nSchema` module augmentation interface to core

**Context:** The cleanest pattern for opt-in type safety in a library is TypeScript module augmentation. The library exports an empty interface; consuming apps augment it by extending it with their catalog type. This is the same pattern used by Express's `Request` augmentation and by i18next since v22.

**File:** `libs/runtime-i18n/src/lib/types.ts`

Add after the existing type declarations:

```typescript
/**
 * Module-augmentation hook for typed translation keys.
 *
 * Augment this interface in your application to enable compile-time key
 * checking and parameter inference on `I18nService.t()` and `I18nPipe`.
 *
 * @example
 * // src/i18n.d.ts (in your application)
 * import type en from '../public/i18n/en.json';
 *
 * declare module '@ngx-runtime-i18n/core' {
 *   interface I18nSchema {
 *     translations: typeof en;
 *   }
 * }
 *
 * When this interface is NOT augmented, all APIs fall back to accepting
 * `string` keys with `Record<string, unknown>` params — no breaking change.
 *
 * @publicApi
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface I18nSchema {}

/**
 * Resolves to the user's catalog type when `I18nSchema` is augmented,
 * or `Record<string, unknown>` otherwise.
 * @internal
 */
export type ActiveCatalogType =
  'translations' extends keyof I18nSchema
    ? I18nSchema['translations']
    : Record<string, unknown>;
```

**Commit message:**
```
feat(core): add I18nSchema module augmentation interface

Adds the opt-in hook that allows consuming apps to provide their
catalog type. When not augmented, the library behaves identically
to v2 — no breaking change.
```

---

### Task 1.2 — Add `DeepKeys<T>` utility type with depth guard

**Context:** `DeepKeys<T>` must produce a union of all dot-notation paths into a nested object. The naive recursive implementation causes TypeScript to slow catastrophically at catalogs with 2000+ keys (documented i18next issue #1914). We must cap recursion depth at 5 levels.

**File:** `libs/runtime-i18n/src/lib/types.ts`

```typescript
/**
 * Produces a union of all dot-notation key paths in T up to MaxDepth levels.
 * Depth guard prevents TypeScript compile-time slowdown on large catalogs.
 * @internal
 */
type Prev = [never, 0, 1, 2, 3, 4, ...0[]];

export type DeepKeys<T, Depth extends number = 4> =
  [Depth] extends [never]
    ? never
    : T extends Record<string, unknown>
    ? {
        [K in keyof T & string]:
          | K
          | (T[K] extends Record<string, unknown>
              ? `${K}.${DeepKeys<T[K], Prev[Depth]>}`
              : never);
      }[keyof T & string]
    : never;

/**
 * The union of valid translation keys, or `string` when no schema is provided.
 * @publicApi
 */
export type TranslationKey =
  'translations' extends keyof I18nSchema
    ? DeepKeys<I18nSchema['translations']>
    : string;
```

**Tests:** Add to `libs/runtime-i18n/src/lib/types.spec.ts` (new file — type-level tests using `tsd` or `expect-type`):

```typescript
// libs/runtime-i18n/src/lib/types.spec-d.ts
// Type-level tests — these have no runtime equivalent.
// We use the pattern: `const _: ExpectedType = value as ActualType`
// A compile error here means the types are wrong.

import type { DeepKeys } from './types';

type TestCatalog = {
  hello: { user: string };
  cart: { items: string };
  nested: { a: { b: { c: string } } };
};

// Valid leaf paths
const _1: DeepKeys<TestCatalog> = 'hello.user';
const _2: DeepKeys<TestCatalog> = 'cart.items';
const _3: DeepKeys<TestCatalog> = 'nested.a.b.c';

// Intermediate paths (object nodes) are also valid keys
const _4: DeepKeys<TestCatalog> = 'hello';
const _5: DeepKeys<TestCatalog> = 'nested.a.b';

// @ts-expect-error — invalid path
const _bad: DeepKeys<TestCatalog> = 'does.not.exist';
```

Wire the `types.spec-d.ts` pattern: either run with `tsd` (add as devDependency) or include in the Jest config via `ts-jest` with `diagnostics: true`. Recommendation: use `tsd` for a dedicated type-test run separate from Jest.

```bash
# Add to devDependencies:
npm install -D tsd
```

```json
// libs/runtime-i18n/package.json (local project)
"scripts": {
  "type-test": "tsd"
}
```

**Commit message:**
```
feat(core): add DeepKeys<T> utility type with depth guard

Produces dot-notation key paths for typed t() signatures. Depth is
capped at 5 levels (4 by default) to prevent TypeScript compile-time
slowdown at 2000+ key catalogs (see i18next issue #1914).

Includes spec-d.ts type-level tests validated with tsd.
```

---

### Task 1.3 — Add `ExtractParams<S>` for interpolation parameter inference

**Context:** Given a translation value like `"Hello, {name}! You have {count} items"`, we want TypeScript to infer `{ name: string | number; count: string | number }` as the required params type. This is done entirely with template literal types at compile time — no runtime cost.

**File:** `libs/runtime-i18n/src/lib/types.ts`

```typescript
/**
 * Extracts interpolation param names from an ICU message string literal.
 * Works for simple `{name}` tokens and ICU blocks `{count, plural, ...}`.
 *
 * Examples:
 *   ExtractParams<'Hello, {name}!'> → { name: string | number }
 *   ExtractParams<'{count, plural, one{# item} other{# items}}'> → { count: number }
 *
 * @internal
 */
export type ExtractParams<S extends string> =
  S extends `${string}{${infer Token}}${infer Rest}`
    ? Token extends `${infer Arg},${infer Keyword},${string}`
      ? Keyword extends 'plural' | 'select' | 'selectordinal'
        ? { [K in Arg]: number } & ExtractParams<Rest>  // ICU keyword block
        : { [K in Token]: string | number } & ExtractParams<Rest>
      : { [K in Token]: string | number } & ExtractParams<Rest>  // simple token
    : {};

/**
 * Resolves the parameters type for a given translation key when the
 * schema is augmented. Falls back to `Record<string, unknown>`.
 * @publicApi
 */
export type TranslationParams<K extends TranslationKey> =
  'translations' extends keyof I18nSchema
    ? K extends string
      ? ResolveValue<I18nSchema['translations'], K> extends string
        ? ExtractParams<ResolveValue<I18nSchema['translations'], K>>
        : Record<string, unknown>
      : Record<string, unknown>
    : Record<string, unknown>;

/**
 * Resolves the value type at a dot-notation path P within object T.
 * @internal
 */
type ResolveValue<T, P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? ResolveValue<T[K], Rest>
      : never
    : P extends keyof T
    ? T[P]
    : never;
```

**Type-level tests** (add to `types.spec-d.ts`):

```typescript
import type { ExtractParams } from './types';

// Simple interpolation
type P1 = ExtractParams<'Hello, {name}!'>;
const _p1: P1 = { name: 'Ashwin' };    // ✓
const _p1n: P1 = { name: 42 };          // ✓ (number allowed)

// ICU plural block
type P2 = ExtractParams<'{count, plural, one{# item} other{# items}}'>;
const _p2: P2 = { count: 5 };           // ✓

// Multiple params
type P3 = ExtractParams<'{count, plural, one{# item} other{# items}} in {category}'>;
const _p3: P3 = { count: 3, category: 'Books' }; // ✓

// @ts-expect-error — missing required param
const _bad3: P3 = { count: 3 };
```

**Commit message:**
```
feat(core): add ExtractParams<S> type for interpolation parameter inference

Extracts { paramName: string | number } from ICU message string literals
at compile time. Handles both simple {token} interpolation and ICU
keyword blocks ({count, plural, ...}).
```

---

### Task 1.4 — Update `t()` signature in `I18nService`

**Context:** The `t()` method must now accept typed keys and infer typed params when the schema is augmented. The change must be fully backward-compatible — apps that do not augment `I18nSchema` must see no TypeScript errors.

**File:** `libs/runtime-i18n-angular/src/lib/i18n.service.ts`

```typescript
// Change the t() signature:

// Before:
t(key: string, params?: Record<string, unknown>): string

// After:
t<K extends TranslationKey>(
  key: K,
  params?: TranslationParams<K>
): string
```

Add the imports at the top of the file:

```typescript
import type {
  Catalog,
  TranslationKey,
  TranslationParams,
} from '@ngx-runtime-i18n/core';
```

**Export the new types from core's public API:**

`libs/runtime-i18n/src/index.ts`

```typescript
export type {
  Catalog,
  RuntimeI18nConfig,
  I18nSchema,
  TranslationKey,
  TranslationParams,
  DeepKeys,
  ExtractParams,
} from './lib/types';
```

**Update `I18nPipe`:**

`libs/runtime-i18n-angular/src/lib/i18n.pipe.ts`

```typescript
// Before:
transform(key: string, params?: Record<string, unknown>): string

// After:
transform<K extends TranslationKey>(
  key: K,
  params?: TranslationParams<K>
): string
```

**Update `I18nCompatService`:**

`libs/runtime-i18n-angular/src/lib/i18n-compat.service.ts`

```typescript
// Same t() signature change
t<K extends TranslationKey>(key: K, params?: TranslationParams<K>): string {
  return this.signals.t(key, params as Record<string, unknown>);
}
```

**End-to-end type test** (in the demo app or a dedicated type test file):

```typescript
// Type validation: create a file that MUST compile cleanly
// If this file has TS errors, the type safety feature is broken.

import type en from '../../public/i18n/en.json';

declare module '@ngx-runtime-i18n/core' {
  interface I18nSchema {
    translations: typeof en;
  }
}

// In a component:
// i18n.t('hello.user', { name: 'Ashwin' })  ← must compile
// i18n.t('hello.user', { typo: 'x' })       ← must be a TS error
// i18n.t('does.not.exist')                   ← must be a TS error
// i18n.t('hello.user')                       ← must compile (params optional if none extracted)
```

**Commit sequence:**
```
feat(core): export TranslationKey, TranslationParams, and related types
feat(angular): update I18nService.t() to TranslationKey/TranslationParams
feat(angular): update I18nPipe.transform() to typed key signature
feat(angular): update I18nCompatService.t() to typed key signature
docs(core): add module augmentation guide to core README
```

**Acceptance criteria:**
- [ ] `t('valid.key')` compiles when schema is augmented
- [ ] `t('invalid.key')` is a TypeScript error when schema is augmented
- [ ] `t('any.string')` compiles when schema is NOT augmented (backward compat)
- [ ] Params are inferred from the translation value string
- [ ] The i18n pipe type-narrows correctly in Angular templates (verify with `ng build --aot`)
- [ ] All existing tests pass (no runtime behaviour change)
- [ ] `tsd` type-level tests pass

---

### Task 1.5 — Documentation: Module Augmentation Guide

This is not optional. Type safety is useless if developers don't know it exists or how to enable it.

**Update `libs/runtime-i18n-angular/README.md`** — add a "Type Safety" section after the Usage section:

```markdown
## Type Safety (optional, recommended)

`ngx-runtime-i18n` supports Level-3 type safety: key autocomplete and
typed interpolation parameters. Opt in by creating a declaration file
in your application:

```typescript
// src/i18n.d.ts
import type en from '../public/i18n/en.json';

declare module '@ngx-runtime-i18n/core' {
  interface I18nSchema {
    translations: typeof en;
  }
}
```

Once augmented:
- `i18n.t('hello.user', { name: 'Ashwin' })` — compiles ✓
- `i18n.t('does.not.exist')` — TypeScript error ✓
- `i18n.t('hello.user', { typo: 'x' })` — TypeScript error ✓

**Requirement:** Your catalog JSON must be typed (`resolveJsonModule: true` in `tsconfig.json`).

To disable type checking for a specific call, cast the key:
```typescript
i18n.t('dynamic.key' as TranslationKey, params)
```
```

**Commit message:**
```
docs(angular): add Type Safety section with module augmentation guide
```

---

### Phase 1 — Wrap-up

After all type safety tasks pass:

```bash
npm run ci

# Update versions:
# core: 2.0.1 → 3.0.0
# angular: 2.0.1 → 3.0.0
# primeng: 2.0.1 → 3.0.0 (peer dep update to reflect new core/angular)

git tag v3.0.0
```

`CHANGELOG.md` entry:

```markdown
## 3.0.0 (2026-XX-XX)

### BREAKING: Peer Dependency

`@angular/core` peer now `>=16 <22` (widened from `<21`).

### New: Level-3 Type Safety

Opt-in TypeScript module augmentation for typed translation keys and
typed interpolation parameters. See the Type Safety guide in the README.

### New: `/testing` Entry Point

`import { provideRuntimeI18nTesting } from '@ngx-runtime-i18n/angular/testing'`

### New Exports

`I18nSchema`, `TranslationKey`, `TranslationParams`, `DeepKeys`, `ExtractParams`,
`RUNTIME_I18N_OPTIONS`, `RuntimeI18nOptions`
```

---

## 5. Phase 2 — ICU Completeness (v2.1)

**Goal:** Support the full CLDR plural rule set and the `select` form. Remove the English-language bias of the current implementation without growing the bundle significantly.

**Branch:** `phase/2-icu-completeness`

**Target version:** `2.1.0` for `core` and `angular`

**Background:** The Unicode CLDR plural specification defines six plural categories: `zero`, `one`, `two`, `few`, `many`, `other`. The current ICU-lite implements only `=N`, `one`, and `other`. This works for English but fails for:

- **Arabic**: 6 distinct forms (`zero`, `one`, `two`, `few`, `many`, `other`)
- **Russian, Polish, Czech, Slovak**: distinct `few` and `many` forms
- **Welsh, Mandarin (zero/one/two/few/many)**: non-Western rules
- **French, Portuguese**: `one` applies to 0 in some locales

Gender agreement (`select` form) is needed for French, Spanish, German, Portuguese, Italian, Russian, and most non-English languages.

---

### Task 2.1 — Add plural resolver hook to core

**Context:** `@ngx-runtime-i18n/core` must stay framework-agnostic (zero Angular dependencies). The CLDR plural rules live in `@angular/common`. The solution is to add a resolver hook to the core that is populated by the Angular package at runtime.

**File:** `libs/runtime-i18n/src/lib/types.ts`

```typescript
/**
 * Plural category as defined by Unicode CLDR.
 * @see https://unicode.org/reports/tr35/tr35-numbers.html#Language_Plural_Rules
 * @publicApi
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * A function that resolves the CLDR plural category for a count in a given locale.
 * When not provided, the formatter falls back to the built-in English-biased logic.
 * @publicApi
 */
export type PluralResolver = (count: number, locale: string) => PluralCategory;
```

**File:** `libs/runtime-i18n/src/lib/icu.ts`

Update `formatIcu` signature to accept an optional resolver:

```typescript
export function formatIcu(
  lang: string,
  key: string,
  cat: Catalog,
  params: Record<string, unknown> = {},
  onMissingKey?: (k: string) => string,
  pluralResolver?: PluralResolver   // ← ADD
): string {
```

Update `replacePluralBlocks` to use the resolver:

```typescript
out = replacePluralBlocks(out, lang, params, pluralResolver);
```

Update the internal `render` callback in `replacePluralBlocks`:

```typescript
function replacePluralBlocks(
  s: string,
  lang: string,
  params: Record<string, unknown>,
  pluralResolver?: PluralResolver
): string {
  // ...inside the render callback:
  const n = Number(params[arg] ?? 0);
  const options = parsePluralBody(body);

  if (Number.isFinite(n)) {
    // 1. Exact match always wins
    const exact = options[`=${n}`];
    if (exact) return replaceHash(exact, n);

    // 2. CLDR category via resolver (or fallback)
    const category: PluralCategory = pluralResolver
      ? pluralResolver(n, lang)
      : n === 1 ? 'one' : 'other';      // English fallback

    // 3. Walk CLDR category → 'other' fallback
    const match =
      options[category] ??
      options['other'] ??
      '';
    return replaceHash(match, n);
  }
  return replaceHash(options['other'] ?? '', n);
}

function replaceHash(s: string, n: number): string {
  return s.replace(/#/g, String(n));
}
```

**Commit message:**
```
feat(core): add PluralResolver hook to formatIcu for CLDR-aware plurals

The core remains framework-agnostic. Angular wires the CLDR resolver
in a later task. Without a resolver, English-biased (one/other) logic
is preserved — no behaviour change for existing users.
```

---

### Task 2.2 — Wire Angular's CLDR plural resolver

**Context:** Angular ships CLDR plural rules for all locales in `@angular/common`. The function `getLocalePluralCase()` maps a count to a CLDR category for a given locale string. We register this as the resolver when the Angular package initialises the service.

**File:** `libs/runtime-i18n-angular/src/lib/provide-runtime-i18n.ts`

Add a new `RUNTIME_I18N_PLURAL_RESOLVER` token and wire it:

```typescript
// libs/runtime-i18n-angular/src/lib/tokens.ts — add:
import type { PluralResolver } from '@ngx-runtime-i18n/core';

export const RUNTIME_I18N_PLURAL_RESOLVER =
  new InjectionToken<PluralResolver>('RUNTIME_I18N_PLURAL_RESOLVER');
```

```typescript
// libs/runtime-i18n-angular/src/lib/provide-runtime-i18n.ts — add to returned providers:
import { getLocalePluralCase, Plural } from '@angular/common';
import type { PluralCategory } from '@ngx-runtime-i18n/core';

const CLDR_CATEGORY_MAP: Record<number, PluralCategory> = {
  [Plural.Zero]:  'zero',
  [Plural.One]:   'one',
  [Plural.Two]:   'two',
  [Plural.Few]:   'few',
  [Plural.Many]:  'many',
  [Plural.Other]: 'other',
};

// Inside provideRuntimeI18n(), add to the returned array:
{
  provide: RUNTIME_I18N_PLURAL_RESOLVER,
  useValue: (count: number, locale: string): PluralCategory => {
    try {
      const plural = getLocalePluralCase(locale)(count);
      return CLDR_CATEGORY_MAP[plural] ?? 'other';
    } catch {
      return count === 1 ? 'one' : 'other';
    }
  },
},
```

**Inject the resolver in `I18nService.t()`:**

```typescript
// i18n.service.ts
private pluralResolver = inject(RUNTIME_I18N_PLURAL_RESOLVER, { optional: true });

t<K extends TranslationKey>(key: K, params?: TranslationParams<K>): string {
  // ...
  return formatIcu(
    candidate,
    key,
    catalog,
    params as Record<string, unknown>,
    this.cfg.onMissingKey,
    this.pluralResolver ?? undefined
  );
}
```

**Commit message:**
```
feat(angular): wire Angular CLDR plural resolver to formatIcu

Uses getLocalePluralCase() from @angular/common to resolve all six
CLDR plural categories (zero/one/two/few/many/other). Falls back to
English-biased logic when locale data is not loaded.
```

---

### Task 2.3 — Add `select` form to the ICU formatter

**Context:** The `select` form (`{gender, select, male{...} female{...} other{...}}`) is the standard way to express gender-dependent strings and categorical choice in ICU. The parser structure is nearly identical to `plural` — we extend `replaceMessageBlocks` to handle both.

**File:** `libs/runtime-i18n/src/lib/icu.ts`

```typescript
// Replace `replacePluralBlocks` with `replaceMessageBlocks`
// supporting both `plural` and `select` keyword blocks.

function replaceMessageBlocks(
  s: string,
  lang: string,
  params: Record<string, unknown>,
  pluralResolver?: PluralResolver
): string {
  // Same brace-balanced scanner as before, but match keyword:
  const prefixMatch = /\{(\w+),\s*(plural|select|selectordinal),\s*/y;

  // ...inside the render callback:
  if (keyword === 'plural' || keyword === 'selectordinal') {
    // existing plural logic using pluralResolver
  } else {
    // select: look up the param value directly as the key
    const val = String(params[arg] ?? 'other');
    const options = parsePluralBody(body); // reuse same body parser
    return options[val] ?? options['other'] ?? '';
  }
}
```

**Tests for `select`:**

```typescript
// icu.spec.ts — add:

describe('formatIcu() — select form', () => {
  const cat = {
    gender: '{pronoun, select, male{He ordered} female{She ordered} other{They ordered}} {count} items',
  };

  it('resolves male branch', () => {
    const s = formatIcu('en', 'gender', cat, { pronoun: 'male', count: 3 });
    expect(s).toBe('He ordered 3 items');
  });

  it('resolves female branch', () => {
    const s = formatIcu('en', 'gender', cat, { pronoun: 'female', count: 1 });
    expect(s).toBe('She ordered 1 items');
  });

  it('falls back to other for unknown values', () => {
    const s = formatIcu('en', 'gender', cat, { pronoun: 'nonbinary', count: 2 });
    expect(s).toBe('They ordered 2 items');
  });
});
```

**Tests for CLDR plurals (using the resolver mock):**

```typescript
// icu.spec.ts — add:

describe('formatIcu() — CLDR plurals via resolver', () => {
  const arabicResolver = (n: number) => {
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    if (n >= 3 && n <= 10) return 'few';
    if (n >= 11 && n <= 99) return 'many';
    return 'other';
  };

  const cat = {
    items: '{count, plural, zero{لا عناصر} one{عنصر واحد} two{عنصران} few{# عناصر} many{# عنصرًا} other{# عنصر}}',
  };

  it.each([
    [0, 'ar', 'لا عناصر'],
    [1, 'ar', 'عنصر واحد'],
    [2, 'ar', 'عنصران'],
    [5, 'ar', '5 عناصر'],
    [15, 'ar', '15 عنصرًا'],
    [100, 'ar', '100 عنصر'],
  ])('count=%i returns correct Arabic plural', (count, lang, expected) => {
    const s = formatIcu(lang, 'items', cat, { count }, undefined, arabicResolver);
    expect(s).toBe(expected);
  });
});
```

**Commit sequence:**
```
feat(core): add select form support to ICU message formatter
feat(core): unify plural/select handling in replaceMessageBlocks
test(core): add tests for select form and CLDR plurals via resolver
docs(core): update ICU reference to document select, zero, two, few, many
```

**Acceptance criteria:**
- [ ] `{gender, select, male{...} female{...} other{...}}` works correctly
- [ ] All 6 CLDR plural categories resolve correctly when a resolver is provided
- [ ] English `=N / one / other` fallback still works without a resolver
- [ ] No regression in existing plural tests
- [ ] Arabic 6-form plural test passes with a mock resolver
- [ ] Angular integration test: load Arabic locale data and verify plural forms via `I18nService.t()`

---

## 6. Phase 3 — DX Tooling (v3.x)

**Branch:** `phase/3-dx-tooling`

This phase contains four independent feature branches. They can be worked on in parallel.

---

### Task 3.1 — `t$()` computed Signal helper on `I18nService`

**Priority:** High — addresses the impure pipe performance concern at scale and is the signals-native way to express reactive translations.

**Context:** The `I18nPipe` is deliberately impure, which means it re-executes on every change-detection cycle. For small apps this is fine. For apps with 50+ translated components and high-frequency signals, it creates unnecessary work. A `t$()` method returning a `Signal<string>` solves this: Angular's reactive graph only recomputes the translated string when `lang()` or `params` change.

**File:** `libs/runtime-i18n-angular/src/lib/i18n.service.ts`

```typescript
/**
 * Returns a `Signal<string>` that recomputes only when the active language
 * or `params` change. Use in components that need reactive translation
 * without the overhead of an impure pipe.
 *
 * @example
 * // In a component:
 * readonly greeting = this.i18n.t$('hello.user', { name: this.username });
 * // In the template: {{ greeting() }}
 *
 * @publicApi
 */
t$<K extends TranslationKey>(
  key: K,
  params?: TranslationParams<K> | Signal<TranslationParams<K>>
): Signal<string> {
  return computed(() => {
    // Establish reactive dependency on lang signal
    this._lang();
    const resolvedParams = isSignal(params) ? params() : (params ?? {});
    return this.t(key, resolvedParams as TranslationParams<K>);
  });
}
```

Note: `isSignal` is importable from `@angular/core` since Angular 17.1.

**Export from `index.ts`:** No additional export needed — it's a method on the already-exported `I18nService`.

**Tests:**

```typescript
// i18n.service.spec.ts — add:
describe('t$()', () => {
  it('returns a Signal<string> for the given key', () => {
    const sig = service.t$('hello.user', { name: 'Ashwin' });
    expect(typeof sig).toBe('function'); // Signals are functions
    expect(sig()).toBe('Hello, Ashwin!');
  });

  it('recomputes when language switches', async () => {
    const catalogs = TestBed.inject(RUNTIME_I18N_CATALOGS);
    catalogs.set('de', { hello: { user: 'Hallo, {name}!' } });

    const sig = service.t$('hello.user', { name: 'Ashwin' });
    expect(sig()).toBe('Hello, Ashwin!');

    await service.setLang('de');
    expect(sig()).toBe('Hallo, Ashwin!');
  });

  it('accepts a Signal<params> and recomputes when params change', () => {
    const name = signal('Alice');
    const sig = service.t$('hello.user', name as unknown as Signal<Record<string, unknown>>);
    // Full type-safe variant tested in type spec
    expect(sig()).toContain('Alice');
  });
});
```

**Commit message:**
```
feat(angular): add t$() computed Signal helper to I18nService

Returns a Signal<string> that recomputes only when lang() or params
change — eliminates the impure pipe overhead in signal-heavy templates.
Accepts static params or a Signal<params> for fully reactive chains.
```

---

### Task 3.2 — `ng add @ngx-runtime-i18n/angular` Schematic

**Priority:** High — "serious library" signal; removes manual setup friction.

**New package:** `libs/runtime-i18n-schematics`

This is a separate Nx library project of type `@nx/js:library`. It has no Angular dependency — only `@angular-devkit/schematics` and `@angular-devkit/core`.

**Package name:** The schematic is shipped inside `@ngx-runtime-i18n/angular` itself (wired via `"ng-add"` in the package's `package.json`), not as a separate npm package. This matches the Angular Material, CDK, and transloco pattern.

**Project.json entry for nx** (new library):

```json
{
  "name": "runtime-i18n-schematics",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/libs/runtime-i18n-schematics",
        "tsConfig": "libs/runtime-i18n-schematics/tsconfig.lib.json"
      }
    }
  }
}
```

**File structure:**

```
libs/runtime-i18n-schematics/
├── src/
│   └── ng-add/
│       ├── index.ts         ← schematic entry point
│       ├── schema.json      ← schematic parameter schema
│       ├── schema.d.ts      ← TypeScript interface for schema
│       └── ng-add.spec.ts   ← schematic tests
├── collection.json          ← schematic collection manifest
└── package.json
```

**`collection.json`:**

```json
{
  "$schema": "../node_modules/@angular-devkit/schematics/collection-schema.json",
  "schematics": {
    "ng-add": {
      "description": "Add @ngx-runtime-i18n/angular to an Angular project.",
      "factory": "./src/ng-add/index",
      "schema": "./src/ng-add/schema.json"
    }
  }
}
```

**`schema.json`:**

```json
{
  "$schema": "http://json-schema.org/schema",
  "$id": "NgxRuntimeI18nNgAdd",
  "title": "Add @ngx-runtime-i18n/angular",
  "properties": {
    "project": {
      "type": "string",
      "description": "The Angular project to configure.",
      "$default": { "$source": "projectName" }
    },
    "defaultLang": {
      "type": "string",
      "description": "The default language tag (BCP-47).",
      "default": "en"
    },
    "additionalLangs": {
      "type": "array",
      "description": "Additional language tags to scaffold (comma-separated).",
      "items": { "type": "string" },
      "default": []
    },
    "ssr": {
      "type": "boolean",
      "description": "Include SSR provider setup.",
      "default": false
    }
  },
  "required": ["project"]
}
```

**`index.ts` — schematic logic:**

```typescript
import { Rule, SchematicContext, Tree, chain } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { addPackageJsonDependency, NodeDependencyType } from '@schematics/angular/utility/dependencies';
import { Schema } from './schema';

export function ngAdd(options: Schema): Rule {
  return chain([
    addDependencies(),
    createCatalogFiles(options),
    patchAppConfig(options),
    options.ssr ? patchServerConfig(options) : () => {},
    scheduleInstall(),
  ]);
}

function addDependencies(): Rule {
  return (tree: Tree) => {
    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Default,
      name: '@ngx-runtime-i18n/angular',
      version: '^3.0.0',
    });
    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Default,
      name: '@ngx-runtime-i18n/core',
      version: '^3.0.0',
    });
  };
}

function createCatalogFiles(options: Schema): Rule {
  return (tree: Tree) => {
    const langs = [options.defaultLang, ...(options.additionalLangs ?? [])];
    for (const lang of langs) {
      const path = `public/i18n/${lang}.json`;
      if (!tree.exists(path)) {
        const sampleCatalog = {
          app: { title: 'My App' },
          nav: { home: 'Home', about: 'About' },
        };
        tree.create(path, JSON.stringify(sampleCatalog, null, 2));
      }
    }
  };
}

function patchAppConfig(options: Schema): Rule {
  return (tree: Tree) => {
    // Locate app.config.ts via angular.json project configuration
    // Parse and inject provideRuntimeI18n() into providers array
    // Uses AST-based patching (TypeScript Compiler API or simple string insertion with guards)
    // Full implementation: see libs/runtime-i18n-schematics/src/ng-add/index.ts
  };
}

function scheduleInstall(): Rule {
  return (_: Tree, context: SchematicContext) => {
    context.addTask(new NodePackageInstallTask());
  };
}
```

**Tests** — use `@angular-devkit/schematics/testing`:

```typescript
// ng-add.spec.ts
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';

const collectionPath = path.join(__dirname, '../../collection.json');
const runner = new SchematicTestRunner('schematics', collectionPath);

describe('ng-add schematic', () => {
  let appTree: UnitTestTree;

  beforeEach(async () => {
    // Create a minimal Angular workspace tree
    appTree = await runner.runExternalSchematic(
      '@schematics/angular', 'workspace', { name: 'test-workspace', version: '20' }
    );
    appTree = await runner.runExternalSchematic(
      '@schematics/angular', 'application',
      { name: 'my-app', routing: false, style: 'css' }, appTree
    );
  });

  it('adds @ngx-runtime-i18n/angular to package.json', async () => {
    const tree = await runner.runSchematic('ng-add', { project: 'my-app' }, appTree);
    const pkg = JSON.parse(tree.readContent('/package.json'));
    expect(pkg.dependencies['@ngx-runtime-i18n/angular']).toBeDefined();
    expect(pkg.dependencies['@ngx-runtime-i18n/core']).toBeDefined();
  });

  it('creates public/i18n/en.json by default', async () => {
    const tree = await runner.runSchematic('ng-add', { project: 'my-app' }, appTree);
    expect(tree.exists('/public/i18n/en.json')).toBe(true);
    const catalog = JSON.parse(tree.readContent('/public/i18n/en.json'));
    expect(catalog.app.title).toBe('My App');
  });

  it('creates catalog files for each additional language', async () => {
    const tree = await runner.runSchematic(
      'ng-add',
      { project: 'my-app', defaultLang: 'en', additionalLangs: ['de', 'fr'] },
      appTree
    );
    expect(tree.exists('/public/i18n/de.json')).toBe(true);
    expect(tree.exists('/public/i18n/fr.json')).toBe(true);
  });

  it('patches app.config.ts to include provideRuntimeI18n()', async () => {
    const tree = await runner.runSchematic('ng-add', { project: 'my-app' }, appTree);
    const config = tree.readContent('/projects/my-app/src/app/app.config.ts');
    expect(config).toContain('provideRuntimeI18n');
    expect(config).toContain('@ngx-runtime-i18n/angular');
  });

  it('does not create catalog files that already exist', async () => {
    appTree.create('/public/i18n/en.json', '{"existing": true}');
    const tree = await runner.runSchematic('ng-add', { project: 'my-app' }, appTree);
    const catalog = JSON.parse(tree.readContent('/public/i18n/en.json'));
    // Must not overwrite
    expect(catalog.existing).toBe(true);
  });
});
```

**Wire `ng-add` into the Angular package's `package.json`:**

```jsonc
// libs/runtime-i18n-angular/package.json
"ng-add": {
  "save": "dependencies"
}
```

**Commit sequence:**
```
feat(schematics): scaffold ng-add schematic package with collection.json
feat(schematics): implement addDependencies and createCatalogFiles rules
feat(schematics): implement patchAppConfig with AST-based provider injection
test(schematics): add ng-add schematic integration tests
feat(packaging): wire ng-add schematic into @ngx-runtime-i18n/angular
```

---

### Task 3.3 — Route-Scoped Lazy Catalogs (`withI18nScope()`)

**Priority:** High — transloco's single largest competitive advantage. Removes the only hard reason for large-app teams to choose transloco over this library.

**Context:** In large apps, loading all translations at boot is expensive. A checkout feature with 200 keys should not cost the home page. The Angular Router already supports route-level providers (`loadComponent` + `providers: [...]`). We extend this pattern to lazy-load catalog fragments.

**API design:**

```typescript
// Consumers write:
export const checkoutRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./checkout.component'),
    providers: [withI18nScope('checkout')],  // ← loads /i18n/checkout/en.json
  }
];
```

**Scope resolution rules:**
1. A scoped catalog for `'checkout'` is fetched at URL `<base>/checkout/<lang>.json` (configurable)
2. Scope keys are namespaced: `t('checkout.total')` first checks the `checkout` scope catalog, then the global catalog
3. Multiple scopes can be composed: `providers: [withI18nScope('checkout'), withI18nScope('shared')]`
4. Scopes are garbage-collected when their route is destroyed (no memory leak)

**New token:** `RUNTIME_I18N_SCOPES`

```typescript
// tokens.ts — add:
export const RUNTIME_I18N_SCOPES = new InjectionToken<string[]>('RUNTIME_I18N_SCOPES', {
  providedIn: 'root',
  factory: () => [],
});
```

**New file:** `libs/runtime-i18n-angular/src/lib/with-i18n-scope.ts`

```typescript
import {
  DestroyRef,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { I18nService } from './i18n.service';
import { RUNTIME_I18N_SCOPES } from './tokens';

/**
 * Registers a translation scope for a route or feature module.
 * The scope catalog is loaded lazily when the route is activated
 * and unregistered when the route is destroyed.
 *
 * @param scope The scope name. Must match the JSON file path fragment.
 *              e.g., 'checkout' fetches `/i18n/checkout/<lang>.json`
 *
 * @example
 * // In a route definition:
 * {
 *   path: 'checkout',
 *   loadComponent: () => import('./checkout.component'),
 *   providers: [withI18nScope('checkout')]
 * }
 *
 * @publicApi
 */
export function withI18nScope(scope: string): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: RUNTIME_I18N_SCOPES,
      useValue: scope,
      multi: true,
    },
    {
      provide: /* SCOPE_INITIALIZER — new token */ Symbol(),
      useFactory: () => {
        const i18n = inject(I18nService);
        const destroyRef = inject(DestroyRef);

        // Load the scoped catalog immediately
        i18n.loadScope(scope);

        // Clean up on route destroy
        destroyRef.onDestroy(() => i18n.unloadScope(scope));

        return () => {};
      },
    },
  ]);
}
```

**Add `loadScope` / `unloadScope` / `t()` scope-aware resolution to `I18nService`:**

The `t()` fallback chain becomes:
```
scope catalogs (in registration order) → global catalog → fallbacks → defaultLang
```

This is a significant addition to `I18nService`. The scope catalogs are stored in a separate `Map<string, Map<string, Catalog>>` (scope name → lang → catalog).

**Key design invariant:** The global `t('checkout.total')` is equivalent to the scope-aware call if the `checkout` scope is loaded. There is no separate scope-aware `t()` — the resolution chain is transparent to the caller.

**Commit sequence:**
```
feat(angular): add RUNTIME_I18N_SCOPES token and scope catalog map
feat(angular): add loadScope/unloadScope methods to I18nService
feat(angular): integrate scope catalogs into t() fallback chain
feat(angular): implement withI18nScope() EnvironmentProviders factory
test(angular): add tests for scope loading, key resolution, and cleanup on destroy
docs(angular): add Route-Scoped Catalogs section to README
```

---

### Task 3.4 — CLI Extractor / Validator (`@ngx-runtime-i18n/cli`)

**Priority:** Medium-High — only feature in the Angular i18n space that catches missing translation keys at CI time.

**New package:** Separate npm package `@ngx-runtime-i18n/cli`. Lives in `tools/cli/` (outside `libs/` since it's not an Angular library).

**Two commands:**

#### `extract` — find all keys used in code

```bash
npx @ngx-runtime-i18n/cli extract \
  --src=src \
  --output=translation-manifest.json
```

Scans for:
- `'some.key' | i18n` in `.html` files (regex: `'([^']+)'\s*\|\s*i18n`)
- `"some.key" | i18n` in `.html` files
- `` `some.key` | i18n `` in `.html` files (template literal — less common)
- `i18n.t('some.key'` in `.ts` files (regex: `\.t\(\s*['"]([^'"]+)['"]`)
- `service.t('some.key'` in `.ts` files

Outputs `translation-manifest.json`:

```json
{
  "keys": ["app.title", "nav.home", "checkout.total"],
  "sources": {
    "app.title": [
      { "file": "src/app/app.component.html", "line": 3 }
    ]
  }
}
```

#### `check` — validate catalogs against manifest or usage

```bash
npx @ngx-runtime-i18n/cli check \
  --catalog=public/i18n \
  --langs=en,de,hi \
  [--manifest=translation-manifest.json] \
  [--fail-on-missing] \
  [--fail-on-unused]
```

Reports (with exit code 0 on success, 1 on failure when `--fail-on-*` is set):

```
✓ en: 24/24 keys present
✗ de: 3 keys missing:
    - checkout.total (used in checkout.component.html:12)
    - checkout.discount (used in checkout.component.ts:45)
    - checkout.summary.vat (used in checkout.component.html:38)
✓ hi: 24/24 keys present

⚠ 2 keys in en.json are unused:
    - legacy.old_key
    - admin.deprecated
```

**Implementation plan:**

```
tools/cli/
├── src/
│   ├── commands/
│   │   ├── extract.ts        ← extract command logic
│   │   └── check.ts          ← check command logic
│   ├── scanner/
│   │   ├── html-scanner.ts   ← scan .html files
│   │   └── ts-scanner.ts     ← scan .ts files using TS compiler API
│   ├── catalog/
│   │   └── reader.ts         ← read and flatten JSON catalog files
│   └── cli.ts                ← main entry point (commander.js or yargs)
├── package.json
└── tsconfig.json
```

**`ts-scanner.ts`** uses the TypeScript Compiler API for accuracy:

```typescript
import ts from 'typescript';

export function scanTypeScriptFile(filePath: string): string[] {
  const program = ts.createProgram([filePath], { allowJs: false });
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) return [];

  const keys: string[] = [];
  function visit(node: ts.Node) {
    // Match: [identifier].t([StringLiteral])
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 't' &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      keys.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return keys;
}
```

**Tests for the CLI** (use a temporary directory fixture):

```typescript
// extract.spec.ts
import { extract } from '../src/commands/extract';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('extract command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
  });
  afterEach(() => fs.rmSync(tmpDir, { recursive: true }));

  it('extracts keys from Angular templates', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'app.component.html'),
      `<h1>{{ 'app.title' | i18n }}</h1><p>{{ 'nav.home' | i18n }}</p>`
    );

    const manifest = await extract({ src: tmpDir });
    expect(manifest.keys).toContain('app.title');
    expect(manifest.keys).toContain('nav.home');
  });

  it('extracts keys from TypeScript files', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'app.service.ts'),
      `class AppService { getTitle() { return this.i18n.t('app.title'); } }`
    );

    const manifest = await extract({ src: tmpDir });
    expect(manifest.keys).toContain('app.title');
  });

  it('deduplicates keys across files', async () => {
    fs.writeFileSync(path.join(tmpDir, 'a.html'), `{{ 'shared.key' | i18n }}`);
    fs.writeFileSync(path.join(tmpDir, 'b.html'), `{{ 'shared.key' | i18n }}`);

    const manifest = await extract({ src: tmpDir });
    expect(manifest.keys.filter(k => k === 'shared.key').length).toBe(1);
  });
});
```

**Commit sequence:**
```
feat(cli): scaffold @ngx-runtime-i18n/cli package with commander
feat(cli): implement HTML template scanner for | i18n pipe usage
feat(cli): implement TypeScript scanner using compiler API
feat(cli): implement catalog reader and key flattener
feat(cli): implement extract command with manifest output
feat(cli): implement check command with missing/unused reporting
feat(cli): add --fail-on-missing and --fail-on-unused exit codes
test(cli): add unit tests for HTML scanner, TS scanner, and catalog reader
test(cli): add integration tests for extract and check commands
ci: add i18n-check step to the GitHub Actions workflow
```

---

## 7. Phase 4 — Ecosystem (v3.x)

**Branch:** `phase/4-ecosystem`

This phase runs after Phase 3 and can have features worked on in parallel across team members.

---

### Task 4.1 — Angular Material Adapter

**Priority:** High — Angular Material is 10–20× more widely used than PrimeNG in enterprise Angular apps.

**New package:** `libs/runtime-i18n-material`

**Package name:** `@ngx-runtime-i18n/material`

**What it solves:** Angular Material's internationalisation is component-specific, requiring separate services:

| Component | Service |
|---|---|
| Paginator | `MatPaginatorIntl` |
| Date Picker | `MatDatepickerIntl` |
| Sort Header | `MatSortHeaderIntl` |
| Stepper | `MatStepperIntl` |
| Bottom Sheet | N/A |
| Select | `MatSelect` aria labels via `MatFormFieldDefaultOptions` |

The adapter registers an effect that replaces each IntL service's labels when the language changes.

**API:**

```typescript
import { provideMaterialRuntimeI18n } from '@ngx-runtime-i18n/material';

// In app.config.ts:
provideMaterialRuntimeI18n({
  resolveLabels: (lang) => import(`./i18n/material/${lang}`).then(m => m.default),
})
```

**`resolveLabels` contract:** Returns a `MaterialI18nLabels` object:

```typescript
export interface MaterialI18nLabels {
  paginator?: Partial<{
    itemsPerPageLabel: string;
    nextPageLabel: string;
    previousPageLabel: string;
    firstPageLabel: string;
    lastPageLabel: string;
    getRangeLabel: (page: number, pageSize: number, length: number) => string;
  }>;
  sort?: Partial<{
    sortButtonLabel: (id: string) => string;
  }>;
  stepper?: Partial<{
    optionalLabel: string;
    completedLabel: string;
    editLabel: string;
  }>;
  datepicker?: Partial<{
    openCalendarLabel: string;
    prevMonthLabel: string;
    nextMonthLabel: string;
    prevYearLabel: string;
    nextYearLabel: string;
    switchToMonthViewLabel: string;
    switchToMultiYearViewLabel: string;
  }>;
}
```

The adapter registers an Angular `effect()` that watches `i18n.lang()`, resolves the label object, and patches each IntL service with the new strings. The pattern mirrors the PrimeNG adapter exactly.

**Commit sequence:**
```
feat(material): scaffold @ngx-runtime-i18n/material package
feat(material): define MaterialI18nLabels interface
feat(material): implement createMaterialRuntimeI18nEffect
feat(material): implement provideMaterialRuntimeI18n provider factory
test(material): add tests for label application and reactive lang switching
docs(material): add Angular Material adapter README
```

---

### Task 4.2 — Documentation Site

**Priority:** High — the most visible signal of library maturity.

**Technology:** Astro + Starlight (used by Astro, Tauri, Vite, and most major 2025–2026 OSS docs sites). Deploys to GitHub Pages at no cost.

**Location in repo:** `apps/docs/` (new Nx app, excluded from library builds)

**Navigation structure:**

```
Guides/
├── Getting Started — CSR
├── Getting Started — SSR
├── Type Safety
├── ICU Message Format
├── Lazy Loading (Scoped Catalogs)
├── Testing
└── Migrating from ngx-translate
└── Migrating from transloco

API Reference/
├── provideRuntimeI18n()
├── I18nService
├── I18nPipe
├── t$() Signal Helper
├── provideRuntimeI18nSsr()
├── withI18nScope()
├── provideRuntimeI18nTesting()
└── Tokens & Interfaces

Adapters/
├── PrimeNG
└── Angular Material

CLI/
├── extract
└── check
```

**Migration guides** are the highest-priority pages. They intercept developers who are already frustrated with their current library. Each guide should:
1. Show the ngx-translate / transloco code
2. Show the equivalent ngx-runtime-i18n code side-by-side
3. List feature equivalences and known gaps
4. Provide a one-command migration estimate

**Deploy workflow** (`ci: add docs deploy to GitHub Pages`):

```yaml
# .github/workflows/docs.yml
name: Deploy Docs
on:
  push:
    branches: [main]
    paths: ['apps/docs/**', 'libs/*/README.md']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: nx build docs
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: dist/apps/docs
```

**Commit sequence:**
```
chore(docs): scaffold Astro + Starlight documentation site
docs: add Getting Started (CSR) guide
docs: add Getting Started (SSR) guide
docs: add Type Safety guide
docs: add ICU Message Format reference
docs: add Lazy Loading guide
docs: add Testing guide
docs: add Migration from ngx-translate guide
docs: add Migration from transloco guide
docs: add API Reference pages for all public exports
ci: add automated docs deploy to GitHub Pages on main push
```

---

### Task 4.3 — Angular DevTools Integration

**Priority:** Medium — differentiator, no other Angular i18n library has this.

**Context:** Angular DevTools (the Chrome extension) exposes a message bridge that third-party tools can use. A custom panel shows the current i18n state without needing `console.log` or browser storage inspection.

**What the panel displays:**
- Currently active language
- `ready()` and `switching()` signal states
- All loaded catalogs and their key counts
- A searchable key explorer (type a key, see the resolved translation in all loaded languages)
- Missing keys log (keys requested but not found, in order of first occurrence)
- Performance: translation call count per second (detect hot-path issues)

**Implementation approach:** The panel communicates with the Angular app via `window.postMessage`. The `I18nService` emits structured events on a `devtools` channel when `ngDevMode` is true. The DevTools panel listens for these events and renders the UI.

**New file:** `libs/runtime-i18n-angular/src/lib/devtools/i18n-devtools.ts`

This file must be completely tree-shaken in production. Use `ngDevMode` guard at the call site:

```typescript
// In I18nService constructor, dev-mode only:
if (typeof ngDevMode !== 'undefined' && ngDevMode) {
  import('./devtools/i18n-devtools').then(({ I18nDevtools }) => {
    new I18nDevtools(this).connect();
  });
}
```

**Commit sequence:**
```
feat(angular): add devtools message bridge to I18nService (dev mode only)
feat(devtools): scaffold Chrome extension panel
feat(devtools): implement language state display in DevTools panel
feat(devtools): implement key explorer in DevTools panel
feat(devtools): implement missing keys log in DevTools panel
ci: add DevTools extension build to CI
```

---

## 8. Release Process

This section defines how versions are bumped, changelogs generated, and packages published. It mirrors the practices of Angular Material and NgRx.

### Versioning Strategy

This project follows [Semantic Versioning](https://semver.org/):

| Change | Version bump |
|---|---|
| Bug fix, no API change | PATCH (`2.0.0` → `2.0.1`) |
| New feature, backward-compatible | MINOR (`2.0.1` → `2.1.0`) |
| Breaking API change | MAJOR (`2.1.0` → `3.0.0`) |

All three packages (`core`, `angular`, `primeng`, `material`) are versioned in lockstep — they always share the same version. This simplifies installation and avoids peer dependency version matrix problems.

### Changelog Generation

`CHANGELOG.md` is maintained manually, not generated. Automated changelogs (from commit messages alone) produce noise. Each release entry must be human-authored and follow this structure:

```markdown
## X.Y.Z (YYYY-MM-DD)

### Breaking Changes (major only)
[What changed and how to migrate]

### New Features
[Feature name — one sentence description. See [Guide](link)]

### Bug Fixes
[Bug name — what was wrong and what was fixed]

### Performance
[What changed and the measurable impact]

### Internal / Developer Experience
[Things that matter to contributors but not end users]
```

### Pre-release Checklist

Before creating a release commit:

- [ ] All tests pass: `npm run ci`
- [ ] Bundle sizes checked and acceptable (no accidental dependency inclusion)
- [ ] `CHANGELOG.md` updated with the new version entry
- [ ] All three `package.json` files have the new version number
- [ ] Peer dependencies are correct and consistent
- [ ] Documentation site builds: `nx build docs`
- [ ] Demo apps build and run: `nx build demo && nx build demo-ssr`
- [ ] SSR demo renders correctly without hydration mismatches

### Release Commit

```bash
# After updating all package.json versions and CHANGELOG.md:
git add libs/*/package.json CHANGELOG.md
git commit -m "chore(release): bump all packages to X.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

### Publishing

```bash
# Build production output
npm run build:libs

# Dry run to verify contents
npm run publish:core:dry
npm run publish:angular:dry
npm run publish:primeng:dry

# Publish (requires npm OTP or CI automation)
cd dist/libs/runtime-i18n && npm publish
cd dist/libs/runtime-i18n-angular && npm publish
cd dist/libs/runtime-i18n-primeng && npm publish
```

**CI automation (future):** Add a `release.yml` GitHub Action that triggers on `v*.*.*` tag push, runs the build, and publishes to npm using a stored `NPM_TOKEN` secret. This eliminates manual publish steps and ensures the published output always comes from a clean CI environment.

### Post-release

- [ ] Verify packages appear on npm: `npm view @ngx-runtime-i18n/angular`
- [ ] Create a GitHub Release with the CHANGELOG entry as the body
- [ ] Update the documentation site if it has any version-pinned content
- [ ] Close the phase milestone on GitHub Issues

---

## Appendix — Engineering Checklist (Print and Post)

```
BEFORE YOU COMMIT:
  □ Does this commit do exactly one thing?
  □ Does the commit message follow Conventional Commits?
  □ Are there new tests for this change?
  □ Do all tests pass? (npm run ci)
  □ Is the public API documented with TSDoc?
  □ Does the change affect bundle size? (check dist/)

BEFORE YOU OPEN A PR:
  □ Is the branch rebased onto the target?
  □ Is the CHANGELOG.md updated?
  □ Has the README or package README been updated?
  □ Does the PR description explain why (not just what)?
  □ Have you checked the diff for accidental debug code or console.logs?

BEFORE YOU MERGE:
  □ Has at least one reviewer approved?
  □ Are all CI checks green?
  □ Are all review comments resolved?
  □ Is the version bump correct for the type of change?
```
