# @ngx-runtime-i18n/material

Angular Material adapter for [`@ngx-runtime-i18n/angular`](../runtime-i18n-angular).

Keeps Angular Material's built-in IntL services (paginator, sort, stepper, datepicker) in sync with runtime language switches. No page reload required.

## Installation

> **Not yet published to npm.** This package currently ships as part of this workspace only; there is no npm registry entry to install from yet. Once published, installation will be:
>
> ```bash
> npm install @ngx-runtime-i18n/material
> ```
>
> `@ngx-runtime-i18n/angular` and `@angular/material` must already be installed. In the meantime, build it from source: see the [Contributing guide](../../CONTRIBUTING.md).

## Usage

### 1. Create per-language label files

```typescript
// src/i18n/material/en.ts
import type { MaterialI18nLabels } from '@ngx-runtime-i18n/material';

const labels: MaterialI18nLabels = {
  paginator: {
    itemsPerPageLabel: 'Items per page:',
    nextPageLabel: 'Next page',
    previousPageLabel: 'Previous page',
    firstPageLabel: 'First page',
    lastPageLabel: 'Last page',
    getRangeLabel: (page, pageSize, length) =>
      `${page * pageSize + 1} – ${Math.min((page + 1) * pageSize, length)} of ${length}`,
  },
  sort: {
    sortButtonLabel: (id) => `Sort by ${id}`,
  },
  stepper: {
    optionalLabel: 'Optional',
    completedLabel: 'Completed',
    editLabel: 'Edit',
  },
  datepicker: {
    openCalendarLabel: 'Open calendar',
    prevMonthLabel: 'Previous month',
    nextMonthLabel: 'Next month',
  },
};
export default labels;
```

### 2. Register in `app.config.ts`

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';
import { provideMaterialRuntimeI18n } from '@ngx-runtime-i18n/material';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRuntimeI18n({
      defaultLang: 'en',
      supported: ['en', 'de', 'fr'],
      fetchCatalog: (lang, signal) =>
        fetch(`/i18n/${lang}.json`, { signal }).then(r => r.json()),
    }),
    provideMaterialRuntimeI18n({
      resolveLabels: (lang) =>
        import(`./i18n/material/${lang}`).then(m => m.default),
      onApplied: (lang) => console.log(`Material labels applied for ${lang}`),
    }),
  ],
};
```

## API

### `provideMaterialRuntimeI18n(options)`

Returns Angular `EnvironmentProviders` to register in your application.

| Option | Type | Description |
|--------|------|-------------|
| `resolveLabels` | `(lang: string) => MaterialI18nLabels \| Promise<MaterialI18nLabels>` | Factory that returns labels for a given language. Supports dynamic imports. |
| `onApplied` | `(lang: string) => void` | Optional callback invoked after labels are applied. Useful for debugging. |

### `MaterialI18nLabels`

Every field is optional. Provide only what your app uses:

```typescript
interface MaterialI18nLabels {
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

## Notes

- Material IntL services are injected optionally: if `@angular/material` is not installed or a specific component's module is not imported, the adapter simply skips that service without errors.
- Labels are cached per language: switching back to a previously-used language does not trigger a network request.
- The adapter uses Angular's `effect()` API to reactively track language changes from `I18nService.lang`.

## License

MIT
