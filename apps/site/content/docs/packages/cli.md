---
title: "@ngx-runtime-i18n/cli"
description: The ngx-i18n binary — extract translation keys from source and validate catalogs against them.
eyebrow: docs.packages.cli
order: 6
section: Packages
---

## Install

```bash
npm install --save-dev @ngx-runtime-i18n/cli
```

The package ships the `ngx-i18n` binary, which scans your source for `i18n` key usage and validates your catalogs against it.

## `ngx-i18n extract`

Scans source files for all translation key usages and writes a manifest.

```bash
ngx-i18n extract --src src --output translation-manifest.json
```

| Option | Default | Description |
| --- | --- | --- |
| `--src` | `src` | Source directory to scan. |
| `--output` | `translation-manifest.json` | Output manifest JSON file. |

## `ngx-i18n check`

Validates one or more language catalogs against actual key usage: reports missing keys (used in code but absent from a catalog) and unused keys (present in a catalog but never referenced).

```bash
ngx-i18n check --catalog public/i18n --langs en,hi,de --src src --fail-on-missing
```

| Option | Default | Description |
| --- | --- | --- |
| `--catalog` | `public/i18n` | Catalog directory containing `<lang>.json` files. |
| `--langs` | `en` | Comma-separated language codes to validate. |
| `--src` | — | Source directory to scan for key usage. Skip if using `--manifest`. |
| `--manifest` | — | Use a pre-computed manifest JSON (from `extract`) instead of re-scanning. |
| `--fail-on-missing` | `false` | Exit with code `1` if any catalog is missing keys. |
| `--fail-on-unused` | `false` | Exit with code `1` if any catalog has unused keys. |

## Typical CI usage

Run `extract` once, then `check --manifest ... --fail-on-missing` per language, so drift between code and catalogs is caught before merge instead of at runtime:

```bash
ngx-i18n extract --src src --output translation-manifest.json
ngx-i18n check --manifest translation-manifest.json --langs en,hi,de --fail-on-missing
```

<content-callout data-type="tip">

For a full CI workflow wiring `extract` and `check` into a pull request gate, see [CI catalog validation](/recipes/ci-catalog-validation).

</content-callout>
