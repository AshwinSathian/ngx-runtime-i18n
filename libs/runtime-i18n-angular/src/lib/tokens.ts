import { InjectionToken } from '@angular/core';
import type { Catalog, RuntimeI18nConfig } from '@ngx-runtime-i18n';

export const RUNTIME_I18N_CONFIG = new InjectionToken<RuntimeI18nConfig>(
  'RUNTIME_I18N_CONFIG'
);

export const RUNTIME_I18N_CATALOGS = new InjectionToken<Map<string, Catalog>>(
  'RUNTIME_I18N_CATALOGS'
);

export const RUNTIME_I18N_LOCALES = new InjectionToken<Set<string>>(
  'RUNTIME_I18N_LOCALES'
);

export const RUNTIME_I18N_STATE_KEY = new InjectionToken<string>(
  'RUNTIME_I18N_STATE_KEY'
);

export const RUNTIME_I18N_LOCALE_LOADERS = new InjectionToken<
  Record<string, () => Promise<unknown>>
>('RUNTIME_I18N_LOCALE_LOADERS');
