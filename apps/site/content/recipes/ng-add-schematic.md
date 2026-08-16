---
title: ng add schematic
description: See exactly what the ng-add schematic generates and patches in an existing Angular workspace, so running it holds no surprises.
eyebrow: recipes.ng-add-schematic
order: 8
packages: ['@ngx-runtime-i18n/schematics']
---

`@ngx-runtime-i18n/schematics` provides an `ng-add` schematic that wires `@ngx-runtime-i18n/angular` into an existing Angular workspace in one command, instead of following the manual setup steps in [Getting started](/docs/getting-started) by hand.

```bash
ng add @ngx-runtime-i18n/schematics --default-lang=en --additional-langs=hi,de
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `project` | `string` | — | The Angular project to configure. Required. |
| `defaultLang` | `string` | `en` | The default language tag (BCP-47). |
| `additionalLangs` | `string[]` | `[]` | Additional language tags to scaffold catalogs for. |
| `ssr` | `boolean` | `false` | Reserved for SSR provider setup. |

`ssr` is accepted but not yet wired to anything — it's reserved for a future release that also patches the server bootstrap. For SSR today, follow [SSR with Express](/recipes/ssr-with-express) after `ng add` finishes.

## What actually runs, step by step

Running the schematic executes four steps in order, each of which is safe to reason about independently.

### 1. Dependencies

Adds `@ngx-runtime-i18n/angular` and `@ngx-runtime-i18n/core` to `dependencies` in `package.json`, pinned to `^<version>` matching the schematics package's own version.

### 2. Catalog files

Scaffolds `public/i18n/<lang>.json` for `defaultLang` and each `additionalLangs` entry, but only for files that don't already exist — it never overwrites a catalog you've already started editing. The generated sample catalog is the same shape for every language:

```json
{
  "app": { "title": "My App" },
  "nav": { "home": "Home", "about": "About" }
}
```

### 3. `app.config.ts` patch

The schematic checks three conventional locations in order — `projects/<project>/src/app/app.config.ts`, `src/app/app.config.ts`, `apps/<project>/src/app/app.config.ts` — and patches the first one it finds. If the file already contains `provideRuntimeI18n`, the schematic treats it as already configured and leaves the file untouched. Re-running `ng add` after a partial manual setup is safe for this reason — it won't produce duplicate providers.

Otherwise it inserts an import and a provider entry built from your options:

```ts
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';

// ...

providers: [
    provideRuntimeI18n({
      defaultLang: 'en',
      supported: ['en', 'hi', 'de'],
      fetchCatalog: (lang, signal) => fetch(`/i18n/${lang}.json`, { signal }).then(r => r.json()),
    }),
  // ...your existing providers
],
```

If the target file doesn't contain a `providers: [` array in a recognizable shape, the schematic fails loudly with a `SchematicsException` naming the file. Check the error message for the exact path it tried — it does not silently leave an unused import with no provider registered.

### 4. Install

Schedules an `npm install` via `NodePackageInstallTask` so the new dependencies are on disk immediately after the schematic finishes, with no separate install step to remember.

## Validation before anything runs

Before touching the tree, the schematic validates `--project` against a plain kebab-case identifier pattern and every language tag (`defaultLang` plus each of `additionalLangs`) against a BCP-47-style pattern. An invalid tag or project name throws before any file is written — a malformed `--additional-langs` value can't produce a half-scaffolded workspace.

<content-callout data-type="tip">

Run the schematic once against a scratch project to see the exact diff it produces for your own `app.config.ts` shape, then decide whether to keep it or wire `provideRuntimeI18n()` by hand per [Getting started](/docs/getting-started) — both leave you in the same place.

</content-callout>
