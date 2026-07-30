# @ngx-runtime-i18n/schematics

Angular schematics for `@ngx-runtime-i18n`. Provides an `ng-add` schematic that wires the runtime i18n library into an existing Angular workspace.

> **Not yet published to npm.** This package currently ships as part of this workspace only. Build it from source (see the [Contributing guide](../../CONTRIBUTING.md)) until it's published.

## What `ng-add` does

Running the schematic against an Angular project:

1. Adds `@ngx-runtime-i18n/angular` and `@ngx-runtime-i18n/core` to `dependencies` in `package.json`.
2. Scaffolds sample catalog files at `public/i18n/<lang>.json` for the default language and any additional languages requested.
3. Patches `app.config.ts` (checking common Angular/Nx project locations) to import and register `provideRuntimeI18n()`, unless it detects the provider is already configured.
4. Schedules an `npm install` so the new dependencies are installed immediately.

## Options

| Option           | Type       | Default | Description                                    |
| ---------------- | ---------- | ------- | ----------------------------------------------- |
| `project`        | `string`   | —       | The Angular project to configure (required).    |
| `defaultLang`    | `string`   | `en`    | The default language tag (BCP-47).              |
| `additionalLangs`| `string[]` | `[]`    | Additional language tags to scaffold catalogs for. |
| `ssr`            | `boolean`  | `false` | Reserved for SSR provider setup.                |

## Usage (once published)

```bash
ng add @ngx-runtime-i18n/schematics --default-lang=en --additional-langs=hi,de
```

## License

MIT
