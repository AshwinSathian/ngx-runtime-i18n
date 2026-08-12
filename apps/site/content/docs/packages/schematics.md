---
title: "@ngx-runtime-i18n/schematics"
description: An ng add schematic that wires provideRuntimeI18n() and sample catalogs into an existing Angular workspace.
eyebrow: docs.packages.schematics
order: 5
section: Packages
---

## Install

```bash
ng add @ngx-runtime-i18n/schematics --default-lang=en --additional-langs=hi,de
```

## What `ng add` does

Running the schematic against an Angular project:

1. Adds `@ngx-runtime-i18n/angular` and `@ngx-runtime-i18n/core` to `dependencies` in `package.json`.
2. Scaffolds sample catalog files at `public/i18n/<lang>.json` for the default language and any additional languages requested.
3. Patches `app.config.ts` — checking common Angular and Nx project locations — to import and register `provideRuntimeI18n()`, unless it detects the provider is already configured.
4. Schedules an `npm install` so the new dependencies install immediately.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `project` | `string` | — | The Angular project to configure. Required. |
| `defaultLang` | `string` | `en` | The default language tag (BCP-47). |
| `additionalLangs` | `string[]` | `[]` | Additional language tags to scaffold catalogs for. |
| `ssr` | `boolean` | `false` | Reserved for SSR provider setup. |

<content-callout data-type="tip">

Run the schematic once against a fresh project to see the exact diff it produces, then compare against [Getting started](/docs/getting-started) if you'd rather wire `provideRuntimeI18n()` by hand.

</content-callout>
