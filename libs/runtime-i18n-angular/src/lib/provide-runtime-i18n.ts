import {
  ENVIRONMENT_INITIALIZER,
  inject,
  makeStateKey,
  Provider,
  TransferState,
} from '@angular/core';
import type { Catalog, RuntimeI18nConfig } from '@ngx-runtime-i18n/core';
import {
  RUNTIME_I18N_CATALOGS,
  RUNTIME_I18N_CONFIG,
  RUNTIME_I18N_LOCALE_LOADERS,
  RUNTIME_I18N_LOCALES,
  RUNTIME_I18N_OPTIONS,
  RUNTIME_I18N_STATE_KEY,
  RuntimeI18nOptions,
} from './tokens';
import {
  DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX,
  getRuntimeI18nBootstrapStateKey,
} from './transfer-state-keys';

/**
 * Register runtime i18n in an Angular app.
 *
 * @example
 * provideRuntimeI18n({
 *   defaultLang: 'en',
 *   supported: ['en','hi','de'],
 *   fetchCatalog: (lang, signal) => fetch(`/i18n/${lang}.json`, { signal }).then(r => r.json()),
 *   onMissingKey: (k) => k
 * }, {
 *   localeLoaders: { en: () => import('@angular/common/locales/global/en') },
 *   autoDetect: true,
 *   storageKey: '@ngx-runtime-i18n:lang',
 *   preferNavigatorBase: true
 * });
 */
export function provideRuntimeI18n(
  cfg: RuntimeI18nConfig,
  opts?: {
    stateKeyPrefix?: string;
    localeLoaders?: Record<string, () => Promise<unknown>>;
    /** See {@link RuntimeI18nOptions} */
    options?: RuntimeI18nOptions;
  }
): Provider[] {
  const catalogs = new Map<string, Catalog>();
  const locales = new Set<string>();
  const stateKeyPrefix =
    opts?.stateKeyPrefix ?? DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX;

  // Ensure a default onMissingKey (echo key) for consistent behavior
  const dedupedFallbacks = Array.from(
    new Set(
      (cfg.fallbacks ?? [])
        .map((lang) => lang?.trim())
        .filter((lang): lang is string => !!lang && lang !== cfg.defaultLang)
    )
  );

  const providedOptions = opts?.options;

  const normalizedCfg: RuntimeI18nConfig = {
    ...cfg,
    fallbacks: dedupedFallbacks.length ? dedupedFallbacks : undefined,
    onMissingKey: cfg.onMissingKey ?? ((k) => k),
  };

  const normalizedOpts: RuntimeI18nOptions = {
    autoDetect: providedOptions?.autoDetect ?? true,
    storageKey:
      providedOptions?.storageKey === undefined
        ? '@ngx-runtime-i18n:lang'
        : providedOptions.storageKey,
    cacheMode: providedOptions?.cacheMode ?? 'memory',
    cacheKeyPrefix:
      providedOptions?.cacheKeyPrefix ?? '@ngx-runtime-i18n:catalog:',
    preferNavigatorBase: providedOptions?.preferNavigatorBase ?? true,
  };

  return [
    { provide: RUNTIME_I18N_CONFIG, useValue: normalizedCfg },
    { provide: RUNTIME_I18N_CATALOGS, useValue: catalogs },
    { provide: RUNTIME_I18N_LOCALES, useValue: locales },
    { provide: RUNTIME_I18N_STATE_KEY, useValue: stateKeyPrefix },
    {
      provide: RUNTIME_I18N_LOCALE_LOADERS,
      useValue: opts?.localeLoaders ?? {},
    },
    { provide: RUNTIME_I18N_OPTIONS, useValue: normalizedOpts },

    // Client boot: populate catalogs from TransferState if present (SSR→CSR).
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        const ts = inject(TransferState, { optional: true });
        if (!ts) return;
        const key = makeStateKey<{
          lang: string;
          catalogs: Record<string, Catalog>;
        }>(getRuntimeI18nBootstrapStateKey(stateKeyPrefix));
        if (ts.hasKey(key)) {
          const snap = ts.get(key, {
            lang: normalizedCfg.defaultLang,
            catalogs: {} as Record<string, Catalog>,
          });
          for (const [l, c] of Object.entries(snap.catalogs)) {
            catalogs.set(l, c);
          }
        }
      },
    },
  ];
}
