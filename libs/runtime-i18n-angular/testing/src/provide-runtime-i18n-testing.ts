import { Provider } from '@angular/core';
import type { Catalog } from '@ngx-runtime-i18n/core';
import {
  RUNTIME_I18N_CATALOGS,
  RUNTIME_I18N_CONFIG,
  RUNTIME_I18N_LOCALE_LOADERS,
  RUNTIME_I18N_LOCALES,
  RUNTIME_I18N_OPTIONS,
  RUNTIME_I18N_STATE_KEY,
} from '@ngx-runtime-i18n/angular';

export interface RuntimeI18nTestingOptions {
  /** Translation catalogs keyed by language. Defaults to `{ en: {} }`. */
  catalogs?: Record<string, Catalog>;
  /** The active default language. Defaults to `'en'`. */
  defaultLang?: string;
  /** Supported languages. Defaults to the keys of `catalogs`. */
  supported?: string[];
}

/**
 * Returns Angular providers for testing components/services that use I18nService.
 * No HTTP, no TransferState, no localStorage. Catalog available synchronously.
 *
 * @example
 * TestBed.configureTestingModule({
 *   providers: [provideRuntimeI18nTesting({ catalogs: { en: { 'app.title': 'My App' } } })]
 * });
 * @publicApi
 */
export function provideRuntimeI18nTesting(opts: RuntimeI18nTestingOptions = {}): Provider[] {
  const defaultLang = opts.defaultLang ?? 'en';
  const catalogs = opts.catalogs ?? { [defaultLang]: {} };
  const supported = opts.supported ?? Object.keys(catalogs);
  const catalogMap = new Map<string, Catalog>(Object.entries(catalogs));

  return [
    {
      provide: RUNTIME_I18N_CONFIG,
      useValue: {
        defaultLang,
        supported,
        fallbacks: [],
        fetchCatalog: (_lang: string) => Promise.resolve(catalogs[_lang] ?? {}),
        onMissingKey: (k: string) => k,
      },
    },
    { provide: RUNTIME_I18N_CATALOGS, useValue: catalogMap },
    {
      provide: RUNTIME_I18N_LOCALES,
      useValue: new Set(supported.map(l => l.toLowerCase().split('-')[0])),
    },
    // '@ngx-runtime-i18n/core' is the default state key prefix
    { provide: RUNTIME_I18N_STATE_KEY, useValue: '@ngx-runtime-i18n/core' },
    { provide: RUNTIME_I18N_LOCALE_LOADERS, useValue: {} },
    {
      provide: RUNTIME_I18N_OPTIONS,
      useValue: {
        autoDetect: false,
        storageKey: null,
        cacheMode: 'memory',
        cacheKeyPrefix: '@ngx-runtime-i18n:catalog:',
        preferNavigatorBase: false,
      },
    },
  ];
}
