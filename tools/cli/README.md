# @ngx-runtime-i18n/cli

CLI for `@ngx-runtime-i18n` that scans your source for translation key usage and validates your catalogs against it. Ships as the `ngx-i18n` binary.

> **Not yet published to npm.** This package currently ships as part of this workspace only. Build it from source (see the [Contributing guide](../../CONTRIBUTING.md)) until it's published.

## Commands

### `ngx-i18n extract`

Scans source files for all `i18n` key usages and writes a manifest.

```bash
ngx-i18n extract --src src --output translation-manifest.json
```

| Option     | Default                      | Description                          |
| ---------- | ----------------------------- | ------------------------------------- |
| `--src`    | `src`                         | Source directory to scan.             |
| `--output` | `translation-manifest.json`  | Output manifest JSON file.            |

### `ngx-i18n check`

Validates one or more language catalogs against actual key usage — reporting missing keys (used in code but absent from a catalog) and unused keys (present in a catalog but never referenced).

```bash
ngx-i18n check --catalog public/i18n --langs en,hi,de --src src --fail-on-missing
```

| Option              | Default        | Description                                                  |
| -------------------- | -------------- | -------------------------------------------------------------- |
| `--catalog`          | `public/i18n` | Catalog directory containing `<lang>.json` files.             |
| `--langs`            | `en`          | Comma-separated language codes to validate.                    |
| `--src`              | —             | Source directory to scan for key usage (skip if using `--manifest`). |
| `--manifest`         | —             | Use a pre-computed manifest JSON (from `extract`) instead of re-scanning. |
| `--fail-on-missing`  | `false`       | Exit with code `1` if any catalog is missing keys.              |
| `--fail-on-unused`   | `false`       | Exit with code `1` if any catalog has unused keys.              |

Typical CI usage: run `extract` once, then `check --manifest translation-manifest.json --fail-on-missing` per language to catch drift between code and catalogs before merge.

## License

MIT
