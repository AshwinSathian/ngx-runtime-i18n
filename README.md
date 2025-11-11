# @ngx-runtime-i18n

**Runtime-first internationalisation (i18n) for Angular. SSR-safe, signals-based, and dynamically updatable.**

---

## Overview

`@ngx-runtime-i18n` is a **modern Angular internationalisation library** designed to solve the limitations of compile-time-only approaches. It allows your translations and locales to be updated dynamically **at runtime**, without rebuilding or redeploying your Angular application.

It is structured as a monorepo containing two libraries:

| Library | NPM Package | Description |
|----------|--------------|--------------|
| **Core** | [`@ngx-runtime-i18n/core`](https://www.npmjs.com/package/@ngx-runtime-i18n/core) | Framework-agnostic core runtime engine that handles catalog loading, language management, ICU message parsing, and hydration safety. |
| **Angular** | [`@ngx-runtime-i18n/angular`](https://www.npmjs.com/package/@ngx-runtime-i18n/angular) | Angular integration layer providing dependency injection, directives, and pipes for effortless use in Angular templates and components. |

This architecture keeps the runtime i18n logic separate from Angular specifics, allowing future adapters for React, Vue, etc.

---

## Key Features

- **Runtime updates:** Switch or update translations without rebuilding the app.
- **Signals-based reactivity:** Built natively on Angular Signals (v16+).
- **SSR and hydration-safe:** Fully compatible with Angular Universal and server-side rendering.
- **ICU message support:** Handles pluralisation, gender, and advanced formatting.
- **Lazy-loading support:** Load translations per feature or route.
- **Lightweight and framework-agnostic core.**
- **TypeScript-first:** Full type safety for translation catalogs.

---

## Why another i18n library?

### Limitations of `@ngx-translate`

- Relies on global `TranslateService` and observables → verbose and side-effect heavy.
- Not SSR-safe by default.
- No built-in signal or hydration awareness.
- No strong typing or runtime catalog validation.

### What `@ngx-runtime-i18n` does differently

- Reactive, declarative API powered by Angular Signals.
- SSR-safe out of the box.
- Dynamic catalog updates at runtime.
- Type-safe translation keys and language switching.
- Modular — use Core anywhere, Angular adapter only where needed.

---

## Installation

```bash
# Install both core and angular libraries
npm install @ngx-runtime-i18n/core @ngx-runtime-i18n/angular
```

or

```bash
yarn add @ngx-runtime-i18n/core @ngx-runtime-i18n/angular
```

---

## Quick Start

### 1. Provide the runtime i18n service

In your `app.config.ts` or root module:

```ts
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';

bootstrapApplication(AppComponent, {
  providers: [
    provideRuntimeI18n({
      defaultLocale: 'en',
      catalogs: {
        en: () => import('./assets/i18n/en.json'),
        fr: () => import('./assets/i18n/fr.json')
      }
    })
  ]
});
```

### 2. Use the pipe in templates

```html
<h1>{{ 'welcome.title' | t }}</h1>
<p>{{ 'home.message' | t:{ name: user.name } }}</p>
```

### 3. Switch language at runtime

```ts
import { inject } from '@angular/core';
import { RuntimeI18n } from '@ngx-runtime-i18n/core';

const i18n = inject(RuntimeI18n);
i18n.setLocale('fr'); // updates instantly
```

---

## Advanced Usage

### Lazy-loaded catalogs

You can load translation catalogs dynamically when a feature module is loaded:

```ts
provideRuntimeI18n({
  defaultLocale: 'en',
  catalogs: {
    en: () => import('./i18n/en.json'),
    de: () => import('./i18n/de.json')
  }
});
```

### Using signals directly

```ts
import { inject } from '@angular/core';
import { useT } from '@ngx-runtime-i18n/angular';

@Component({ ... })
export class WelcomeComponent {
  t = useT();
  message = computed(() => this.t('welcome.title'));
}
```

---

## SSR / Hydration

`@ngx-runtime-i18n` is **SSR and hydration-safe** by design.
- Translations are serialised on the server and hydrated seamlessly on the client.
- Works perfectly with Angular Universal.
- No duplicate fetches or flickering on locale switch.

---

## Repository Structure

```
ngx-runtime-i18n/
├── apps/
│   └── demo/                 # Angular demo app for testing and showcasing the library
├── libs/
│   ├── runtime-i18n/         # Core runtime library (@ngx-runtime-i18n/core)
│   └── runtime-i18n-angular/ # Angular adapter (@ngx-runtime-i18n/angular)
├── .github/workflows/        # CI/CD and Release workflows
├── nx.json                   # Nx monorepo configuration
├── package.json              # Workspace-level dependencies
└── README.md                 # This file
```

---

## Development

This repository uses **Nx** to manage builds and publishable libraries.

### Build all libraries
```bash
nx run-many -t build -p=runtime-i18n,runtime-i18n-angular --configuration=production
```

### Test locally
```bash
nx serve demo
```

### Publish to npm (handled by GitHub Actions)
The repo is configured with automated publishing via CI/CD on tagged commits.

To trigger manually:
```bash
git tag @ngx-runtime-i18n/core@1.0.0
git push origin @ngx-runtime-i18n/core@1.0.0
```

---

## Roadmap

- [x] Runtime catalog switching
- [x] SSR/hydration compatibility
- [x] Angular signal-based API
- [ ] CLI for catalog generation and validation
- [ ] Extended ICU and date/number formatting
- [ ] Developer tools for debugging and runtime overrides
- [ ] React/Vue adapters

---

## Contributing

Contributions, ideas, and PRs are welcome.
Please ensure your changes follow the Nx workspace conventions and include proper unit tests.

To get started:
```bash
git clone https://github.com/AshwinSathian/ngx-runtime-i18n.git
cd ngx-runtime-i18n
npm install
nx build runtime-i18n-angular
```

---

## License

MIT © [Ashwin Sathian](https://github.com/AshwinSathian)
