import { Provider } from '@angular/core';
import type { Catalog } from '@ngx-runtime-i18n/core';
import {
  RUNTIME_I18N_CATALOGS,
  RUNTIME_I18N_CONFIG,
  RUNTIME_I18N_LOCALE_LOADERS,
  RUNTIME_I18N_LOCALES,
  RUNTIME_I18N_OPTIONS,
  RUNTIME_I18N_STATE_KEY,
} from '../lib/tokens';
import { DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX } from '../lib/transfer-state-keys';

export interface RuntimeI18nTestingOptions {
  catalogs?: Record<string, Catalog>;
  defaultLang?: string;
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
    { provide: RUNTIME_I18N_LOCALES, useValue: new Set(supported.map(l => l.toLowerCase().split('-')[0])) },
    { provide: RUNTIME_I18N_STATE_KEY, useValue: DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX },
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
