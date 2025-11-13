import { InjectionToken } from '@angular/core';
import type { Catalog, RuntimeI18nConfig } from '@ngx-runtime-i18n/core';

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

/** Ergonomic options that don’t belong in the core runtime config. */
export interface RuntimeI18nOptions {
  /** Auto-detect from `navigator.language` on first boot if no SSR snapshot or persisted choice. (default: true) */
  autoDetect?: boolean;
  /** LocalStorage key to persist the chosen language. Set falsy/empty to disable. (default: '@ngx-runtime-i18n:lang') */
  storageKey?: string | null;
  /** Catalog caching strategy: 'none' (keep active chain only), 'memory' (default), or 'storage' (persist to localStorage). */
  cacheMode?: 'none' | 'memory' | 'storage';
  /** localStorage prefix used when `cacheMode === 'storage'`. */
  cacheKeyPrefix?: string;
  /**
   * When navigator is a regional tag (e.g., en-GB) but only base exists (en), prefer base if exact not supported.
   * (default: true)
   */
  preferNavigatorBase?: boolean;
}

export const RUNTIME_I18N_OPTIONS = new InjectionToken<RuntimeI18nOptions>(
  'RUNTIME_I18N_OPTIONS'
);
