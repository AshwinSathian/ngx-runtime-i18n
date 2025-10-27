# @ngx-runtime-i18n

[![npm version](https://img.shields.io/npm/v/@ngx-runtime-i18n/angular.svg)](https://www.npmjs.com/package/@ngx-runtime-i18n/angular)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Angular runtime i18n — signals-first, SSR-safe, 2.5 kB footprint.**

---

## TL;DR (Getting Started)

```bash
npm i @ngx-runtime-i18n/angular @ngx-runtime-i18n/core
```

```ts
provideRuntimeI18n({
  defaultLang: 'en',
  supported: ['en'],
  fetchCatalog: (lang) => fetch(`/i18n/${lang}.json`).then((r) => r.json()),
});
```

### Try the demos

```bash
nx serve demo        # CSR → http://localhost:4200
nx serve demo-ssr    # SSR → http://localhost:4000
```

Before running, create `apps/demo*/src/public/i18n/{en,hi,de}.json` files.

---

## Packages

| Package                                                            | Description                                                       |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [`@ngx-runtime-i18n/core`](libs/runtime-i18n/README.md)            | Framework-agnostic primitives (ICU-lite formatter, shared types). |
| [`@ngx-runtime-i18n/angular`](libs/runtime-i18n-angular/README.md) | Angular wrapper (signals, SSR-safe, pipes).                       |

---

## Docs

- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)

---

## License

MIT © Ashwin Sathian
