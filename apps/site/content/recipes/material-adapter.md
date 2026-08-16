---
title: Angular Material adapter
description: Wire provideMaterialRuntimeI18n() into an app so the paginator, sort, and stepper Intl services switch language with everything else — plus what it takes to cover the datepicker too.
eyebrow: recipes.material-adapter
order: 5
packages: ['@ngx-runtime-i18n/material']
---

Angular Material's paginator, sort header, and stepper each read their labels from a dedicated `Intl` service (`MatPaginatorIntl`, `MatSortHeaderIntl`, `MatStepperIntl`) — none of them react to `I18nService.lang()` on their own. `@ngx-runtime-i18n/material` bridges that gap for those three: it listens for language changes and pushes updated labels into whichever of those services your app has actually imported, with no page reload. The datepicker is a partial exception — see the dedicated section below before assuming it's covered the same way.

`@ngx-runtime-i18n/material` is published on npm at the same `2.1.0` version as the rest of the library.

```bash
npm install @ngx-runtime-i18n/material
```

`@ngx-runtime-i18n/angular` and `@angular/material` must already be installed alongside it.

## 1. Write a label file per language

`MaterialI18nLabels` has a field for each of Material's four label groups. Every field is optional — provide only what your app actually uses. As covered below, three of the four (`paginator`, `sort`, `stepper`) are applied to their Intl services automatically; `datepicker` needs one extra step in your own code:

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

The `datepicker` block is part of `MaterialI18nLabels` and worth filling in, but hold off on assuming it behaves like the other three — the section below on datepicker labels explains why before you wire up a datepicker-only app.

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

For `paginator`, `sort`, and `stepper`, the adapter injects each Intl service optionally: if your app never imports `MatPaginatorModule`, there's no `MatPaginatorIntl` in the injector, and the adapter silently skips applying paginator labels for that reason — no error, no warning. It's safe to register `provideMaterialRuntimeI18n()` once, globally, even in an app that only uses one or two of the three; the branches for the modules you don't use are no-ops.

`datepicker` doesn't follow this pattern — see the next section.

## Datepicker labels need one extra step

Unlike the other three, the adapter never injects `MatDatepickerIntl` and never applies `labels.datepicker` to anything. Reading `provide-material-runtime-i18n.ts` directly shows the datepicker branch is a deliberate no-op:

```ts
if (labels.datepicker) {
  // Datepicker Intl is handled per-token by apps; expose via onApplied callback
}
```

Registering `provideMaterialRuntimeI18n()` in a datepicker-only app does not localize the datepicker on its own — `resolveLabels` still runs and `onApplied` still fires, but nothing gets pushed into Material's calendar UI, because `MatDatepickerIntl` is never injected by the adapter in the first place. `onApplied` only receives the language tag, not the resolved labels, so it isn't a usable hook for this either.

To cover the datepicker, register a second provider that follows the exact same shape as the adapter's internal implementation — inject `I18nService` and `MatDatepickerIntl`, react to `lang()` inside an `effect()`, and apply labels with `Object.assign` + `changes.next()`:

```ts
// datepicker-i18n.providers.ts
import { EnvironmentProviders, effect, inject, provideAppInitializer } from '@angular/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';
import { I18nService } from '@ngx-runtime-i18n/angular';

export function provideDatepickerRuntimeI18n(
  resolveDatepickerLabels: (lang: string) => Promise<Partial<MatDatepickerIntl>>,
): EnvironmentProviders {
  return provideAppInitializer(() => {
    const i18n = inject(I18nService);
    const datepickerIntl = inject(MatDatepickerIntl, { optional: true });

    effect(() => {
      const lang = i18n.lang();
      resolveDatepickerLabels(lang).then((labels) => {
        if (!datepickerIntl) return;
        Object.assign(datepickerIntl, labels);
        datepickerIntl.changes.next();
      });
    });
  });
}
```

```ts
// app.config.ts
provideMaterialRuntimeI18n({ resolveLabels: /* ... */ }),
provideDatepickerRuntimeI18n((lang) => import(`./i18n/material/${lang}`).then((m) => m.default.datepicker ?? {})),
```

`inject()` is only valid inside an injection context. The function passed to `provideAppInitializer()` is one, the same way it is inside `provideMaterialRuntimeI18n()`'s own implementation; a plain `onApplied` callback fired later from inside a `.then()` is not. That's why covering the datepicker needs its own provider instead of a hook added to the existing one.

## Caching and reactivity

- Labels are cached per language internally — switching back to a previously-used language re-applies the cached object instead of re-running `resolveLabels` or re-triggering a network request.
- The adapter uses Angular's `effect()` to track `I18nService.lang` reactively, so no manual subscription or `setLang()` hook is needed in your own code — registering the provider is the entire integration.

<content-callout data-type="tip">

`onApplied` fires once per language after the `paginator`/`sort`/`stepper` branches have run — whether or not each one actually had a matching Intl service to update — so it's useful for confirming in a diagnostics panel that a switch reached whichever of those three your app uses, separately from confirming it reached your own catalog. It fires the same way regardless of `datepicker`, so it isn't a signal that datepicker labels were applied.

</content-callout>
