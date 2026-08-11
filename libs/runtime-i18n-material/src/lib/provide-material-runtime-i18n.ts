import { EnvironmentProviders, inject, provideAppInitializer, effect } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MatSortHeaderIntl } from '@angular/material/sort';
import { MatStepperIntl } from '@angular/material/stepper';
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
export function applyMaterialLabels(
  labels: MaterialI18nLabels,
  lang: string,
  paginatorIntl: MatPaginatorIntl | null,
  sortIntl: MatSortHeaderIntl | null,
  stepperIntl: MatStepperIntl | null,
  onApplied?: (lang: string) => void,
): void {
  if (paginatorIntl && labels.paginator) {
    Object.assign(paginatorIntl, labels.paginator);
    paginatorIntl.changes.next();
  }
  if (sortIntl && labels.sort) {
    Object.assign(sortIntl, labels.sort);
    sortIntl.changes.next();
  }
  if (stepperIntl && labels.stepper) {
    Object.assign(stepperIntl, labels.stepper);
    stepperIntl.changes.next();
  }
  if (labels.datepicker) {
    // Datepicker Intl is handled per-token by apps; expose via onApplied callback
  }
  onApplied?.(lang);
}

/**
 * Registers Angular Material Intl services to react to runtime language changes.
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
  options: ProvideMaterialRuntimeI18nOptions,
): EnvironmentProviders {
  return provideAppInitializer(() => {
    const i18n = inject(I18nService);
    const paginatorIntl = inject(MatPaginatorIntl, { optional: true });
    const sortIntl = inject(MatSortHeaderIntl, { optional: true });
    const stepperIntl = inject(MatStepperIntl, { optional: true });
    const cache = new Map<string, MaterialI18nLabels>();

    effect(() => {
      const lang = i18n.lang();
      const cached = cache.get(lang);

      if (cached) {
        applyMaterialLabels(cached, lang, paginatorIntl, sortIntl, stepperIntl, options.onApplied);
        return;
      }

      Promise.resolve(options.resolveLabels(lang))
        .then((labels) => {
          if (!labels) return;
          cache.set(lang, labels);
          if (i18n.lang() !== lang) return;
          applyMaterialLabels(labels, lang, paginatorIntl, sortIntl, stepperIntl, options.onApplied);
        })
        .catch((err) => {
          console.error(`${LOG_TOPIC} failed to apply labels for "${lang}"`, err);
        });
    });
  });
}
