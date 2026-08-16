---
title: CI catalog validation
description: Wire the ngx-i18n CLI's extract and check commands into a pull request gate that fails the build when code and catalogs drift.
eyebrow: recipes.ci-catalog-validation
order: 7
packages: ['@ngx-runtime-i18n/cli']
---

`@ngx-runtime-i18n/cli` ships the `ngx-i18n` binary: it scans your source for every `i18n` key usage and validates one or more language catalogs against that usage, reporting missing keys (used in code, absent from a catalog) and unused keys (present in a catalog, never referenced). This recipe wires it into CI as a two-step gate so drift between code and catalogs fails the pull request instead of shipping.

```bash
npm install --save-dev @ngx-runtime-i18n/cli
```

## Commands

### `ngx-i18n extract`

Scans source files for all `i18n` key usages and writes a manifest:

```bash
ngx-i18n extract --src src --output translation-manifest.json
```

| Option | Default | Description |
| --- | --- | --- |
| `--src` | `src` | Source directory to scan. |
| `--output` | `translation-manifest.json` | Output manifest JSON file. |

### `ngx-i18n check`

Validates catalogs against a manifest (or re-scans source directly) and reports missing and unused keys:

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

## The two-step CI pattern

Run `extract` once per CI job, then reuse the manifest across every language's `check` call instead of re-scanning source per language:

```bash
ngx-i18n extract --src src --output translation-manifest.json
ngx-i18n check --catalog public/i18n --manifest translation-manifest.json --langs en,hi,de --fail-on-missing
```

Splitting the two commands has a practical payoff beyond avoiding repeated scans: the manifest is a plain JSON artifact, so you can upload it as a CI artifact and diff it between runs to see exactly which keys a pull request added or removed, independent of whether any catalog changed.

## Wiring it into GitHub Actions

```yaml
# .github/workflows/i18n-check.yml
name: i18n catalog check
on: pull_request

jobs:
  check-catalogs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx ngx-i18n extract --src src --output translation-manifest.json
      - run: npx ngx-i18n check --catalog public/i18n --manifest translation-manifest.json --langs en,hi,de --fail-on-missing
```

`check` exits with code `1` when `--fail-on-missing` (or `--fail-on-unused`) is set and a violation is found. That non-zero exit is what turns this into a CI gate: the job fails and the PR shows a red check.

## Adding `--fail-on-unused` as a stricter mode

`--fail-on-missing` catches the failure mode that breaks users: a key referenced in code with no translation, which falls through to `onMissingKey` at runtime. `--fail-on-unused` catches a different, lower-stakes problem — dead catalog entries left behind after a key gets renamed or a feature gets removed. Because it's a separate flag, you can adopt it independently and later than `--fail-on-missing`:

```bash
ngx-i18n check --catalog public/i18n --manifest translation-manifest.json --langs en,hi,de --fail-on-missing --fail-on-unused
```

Turn this on once your catalogs are already clean — a codebase with years of accumulated unused keys will fail immediately on adoption, so it's worth running `check` once without `--fail-on-unused` to see the current count before making it a hard gate.

<content-callout data-type="tip">

`--langs` runs `check` once and validates all the listed languages together against the same manifest — there's no need for a matrix job or a separate `check` invocation per language.

</content-callout>
