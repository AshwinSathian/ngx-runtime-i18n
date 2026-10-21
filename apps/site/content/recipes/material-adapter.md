---
title: Angular Material adapter
description: Wire provideMaterialRuntimeI18n() into an app so the paginator, sort, stepper and datepicker Intl services switch language with everything else.
eyebrow: recipes.material-adapter
order: 5
packages: ['@ngx-runtime-i18n/material']
---

Angular Material's paginator, sort header, stepper and datepicker each read their labels from a dedicated `Intl` service (`MatPaginatorIntl`, `MatSortHeaderIntl`, `MatStepperIntl`, `MatDatepickerIntl`), and none of them react to `I18nService.lang()` on their own. `@ngx-runtime-i18n/material` bridges that gap: it listens for language changes and pushes updated labels into whichever of those services your app has actually imported, with no page reload.

`@ngx-runtime-i18n/material` is published on npm and versioned together with `core` and `angular`. It works with `@ngx-runtime-i18n/angular` 2.x and 3.x.

```bash
npm install @ngx-runtime-i18n/material
```

`@ngx-runtime-i18n/angular` and `@angular/material` must already be installed alongside it.

## 1. Write a label file per language

`MaterialI18nLabels` has a field for each of Material's four label groups. Every field is optional — provide only what your app actually uses. All four are applied to their Intl services automatically:

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

`getRangeLabel` and `sortButtonLabel` are functions, not strings — Material calls them with the current page/count or column id, so a translated label can still interpolate runtime values. Repeat the file per language (`de.ts`, `fr.ts`, ...), translating the strings and adjusting the functions' output as needed.

## 2. Register the adapter

`provideMaterialRuntimeI18n()` takes a `resolveLabels` factory and registers itself as `EnvironmentProviders`, alongside `provideRuntimeI18n()`:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';
import { provideMaterialRuntimeI18n } from '@ngx-runtime-i18n/material';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRuntimeI18n({
      defaultLang: 'en',
      supported: ['en', 'de', 'fr'],
      fetchCatalog: (lang, signal) =>
        fetch(`/i18n/${lang}.json`, { signal }).then((r) => r.json()),
    }),
    provideMaterialRuntimeI18n({
      resolveLabels: (lang) => import(`./i18n/material/${lang}`).then((m) => m.default),
      onApplied: (lang) => console.log(`Material labels applied for ${lang}`),
    }),
  ],
};
```

`resolveLabels` receives the language tag on every switch and can return `MaterialI18nLabels` directly or a `Promise` — the dynamic `import()` above code-splits each language's label file so only the active one downloads.

## What happens when a Material module isn't imported

The adapter injects each of the four Intl services optionally. If your app never imports `MatPaginatorModule`, there's no `MatPaginatorIntl` in the injector, and the adapter skips the paginator labels without an error or a warning. So it's safe to register `provideMaterialRuntimeI18n()` once, globally, even in an app that only uses one or two of these components; the branches for the ones you don't use do nothing.

## Datepicker labels

Up to 2.1.0 the adapter accepted a `datepicker` block but never applied it, so a datepicker needed a provider of its own. Since 2.2.0, `MatDatepickerIntl` is handled exactly like the other three: the adapter assigns `labels.datepicker` to it and calls `changes.next()`, so the calendar re-renders in the new language. If you wrote a separate datepicker provider for an older version, you can delete it.

## Caching and reactivity

- Labels are cached per language internally — switching back to a previously-used language re-applies the cached object instead of re-running `resolveLabels` or re-triggering a network request.
- The adapter uses Angular's `effect()` to track `I18nService.lang` reactively, so no manual subscription or `setLang()` hook is needed in your own code — registering the provider is the entire integration.

<content-callout data-type="tip">

`onApplied` fires once per language after the `paginator`/`sort`/`stepper` branches have run — whether or not each one actually had a matching Intl service to update — so it's useful for confirming in a diagnostics panel that a switch reached whichever of those three your app uses, separately from confirming it reached your own catalog. It fires the same way regardless of `datepicker`, so it isn't a signal that datepicker labels were applied.

</content-callout>
