---
title: "@ngx-runtime-i18n/material"
description: Angular Material adapter that keeps the paginator, sort, stepper, and datepicker Intl services in sync with runtime language switches.
eyebrow: docs.packages.material
order: 4
section: Packages
---

## Install

`material` is optional. Install it alongside `@ngx-runtime-i18n/angular` and `@angular/material`:

```bash
npm install @ngx-runtime-i18n/material
```

`@ngx-runtime-i18n/angular` and `@angular/material` must already be installed.

## Usage

### 1. Create per-language label files

```ts
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

```ts
import { ApplicationConfig } from '@angular/core';
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';
import { provideMaterialRuntimeI18n } from '@ngx-runtime-i18n/material';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRuntimeI18n({
      defaultLang: 'en',
      supported: ['en', 'de', 'fr'],
      fetchCatalog: (lang, signal) => fetch(`/i18n/${lang}.json`, { signal }).then((r) => r.json()),
    }),
    provideMaterialRuntimeI18n({
      resolveLabels: (lang) => import(`./i18n/material/${lang}`).then((m) => m.default),
      onApplied: (lang) => console.log(`Material labels applied for ${lang}`),
    }),
  ],
};
```

## `provideMaterialRuntimeI18n(options)`

Returns `EnvironmentProviders` to register in your application.

| Option | Type | Description |
| --- | --- | --- |
| `resolveLabels` | `(lang: string) => MaterialI18nLabels \| Promise<MaterialI18nLabels>` | Factory that returns labels for a given language. Supports dynamic imports for per-language code splitting. |
| `onApplied?` | `(lang: string) => void` | Optional callback invoked after labels are applied. Useful for debugging. |

## `MaterialI18nLabels`

Every field is optional — provide only the sections your app uses:

```ts
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

## Optional injection and caching

<content-callout data-type="note">

Material's Intl services are injected optionally. If `@angular/material` is not installed, or a specific component's module (e.g. `MatPaginatorModule`) is not imported, the adapter skips that service without errors.

</content-callout>

- Labels are cached per language — switching back to a previously used language does not trigger another `resolveLabels` call.
- The adapter uses Angular's `effect()` API to track language changes from `I18nService.lang` and reapply labels when it changes.
