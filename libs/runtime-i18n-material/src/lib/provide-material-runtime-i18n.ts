import { APP_INITIALIZER, inject, Provider, effect } from '@angular/core';
import { I18nService } from '@ngx-runtime-i18n/angular';
import type { MaterialI18nLabels } from './material-i18n-labels';

export interface ProvideMaterialRuntimeI18nOptions {
  /**
   * Return MaterialI18nLabels for a given language code.
   * Can be sync or async (e.g., dynamic import).
   */
  resolveLabels: (lang: string) => MaterialI18nLabels | Promise<MaterialI18nLabels>;

  /** Optional callback when labels are applied (for debugging). */
  onApplied?: (lang: string) => void;
}

const LOG_TOPIC = '[ngx-runtime-i18n/material]';

/** @internal */
export function createMaterialRuntimeI18nEffect(
  i18n: I18nService,
  options: ProvideMaterialRuntimeI18nOptions,
  paginatorIntl?: { itemsPerPageLabel: string; nextPageLabel: string; previousPageLabel: string; firstPageLabel: string; lastPageLabel: string; getRangeLabel: (p: number, ps: number, l: number) => string; changes: { next: () => void } },
  sortIntl?: { sortButtonLabel: (id: string) => string; changes?: { next: () => void } },
  stepperIntl?: { optionalLabel: string; completedLabel: string; editLabel: string; changes?: { next: () => void } },
  datepickerIntl?: Record<string, unknown>
): () => void {
  const cache = new Map<string, MaterialI18nLabels>();

  effect(() => {
    const lang = i18n.lang();
    const cached = cache.get(lang);

    const applyLabels = (labels: MaterialI18nLabels) => {
      if (paginatorIntl && labels.paginator) {
        Object.assign(paginatorIntl, labels.paginator);
        paginatorIntl.changes.next();
      }
      if (sortIntl && labels.sort) {
        Object.assign(sortIntl, labels.sort);
        sortIntl.changes?.next();
      }
      if (stepperIntl && labels.stepper) {
        Object.assign(stepperIntl, labels.stepper);
        stepperIntl.changes?.next();
      }
      if (datepickerIntl && labels.datepicker) {
        Object.assign(datepickerIntl, labels.datepicker);
      }
      options.onApplied?.(lang);
    };

    if (cached) {
      applyLabels(cached);
      return;
    }

    let labelsPromise: Promise<MaterialI18nLabels>;
    try {
      labelsPromise = Promise.resolve(options.resolveLabels(lang));
    } catch (error) {
      console.error(`${LOG_TOPIC} unable to resolve labels for "${lang}"`, error);
      return;
    }

    labelsPromise
      .then((labels) => {
        if (!labels) return;
        cache.set(lang, labels);
        if (i18n.lang() !== lang) return;
        applyLabels(labels);
      })
      .catch((err) => {
        console.error(`${LOG_TOPIC} failed to apply labels for "${lang}"`, err);
      });
  });

  return () => undefined;
}

/**
 * Registers Angular Material IntL services to react to runtime language changes.
 *
 * @example
 * // app.config.ts
 * provideMaterialRuntimeI18n({
 *   resolveLabels: (lang) => import(`./i18n/material/${lang}`).then(m => m.default)
 * })
 *
 * @publicApi
 */
export function provideMaterialRuntimeI18n(
  options: ProvideMaterialRuntimeI18nOptions
): Provider[] {
  return [
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const i18n = inject(I18nService);

        // Lazily inject Material IntL services — they may not be available if
        // the consuming app doesn't use those Material components.
        let paginatorIntl: Parameters<typeof createMaterialRuntimeI18nEffect>[2];
        let sortIntl: Parameters<typeof createMaterialRuntimeI18nEffect>[3];
        let stepperIntl: Parameters<typeof createMaterialRuntimeI18nEffect>[4];
        let datepickerIntl: Parameters<typeof createMaterialRuntimeI18nEffect>[5];

        try {
          // Dynamic require to avoid hard dependency
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { MatPaginatorIntl } = require('@angular/material/paginator');
          paginatorIntl = inject(MatPaginatorIntl, { optional: true }) as typeof paginatorIntl;
        } catch { /* not available */ }

        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { MatSortHeaderIntl } = require('@angular/material/sort');
          sortIntl = inject(MatSortHeaderIntl, { optional: true }) as typeof sortIntl;
        } catch { /* not available */ }

        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { MatStepperIntl } = require('@angular/material/stepper');
          stepperIntl = inject(MatStepperIntl, { optional: true }) as typeof stepperIntl;
        } catch { /* not available */ }

        return createMaterialRuntimeI18nEffect(i18n, options, paginatorIntl, sortIntl, stepperIntl, datepickerIntl);
      },
    },
  ];
}
