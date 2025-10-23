import {
  ENVIRONMENT_INITIALIZER,
  inject,
  makeStateKey,
  Provider,
  TransferState,
} from '@angular/core';
import type { Catalog, RuntimeI18nConfig } from '@ngx-runtime-i18n';
import {
  RUNTIME_I18N_CATALOGS,
  RUNTIME_I18N_CONFIG,
  RUNTIME_I18N_LOCALE_LOADERS,
  RUNTIME_I18N_LOCALES,
  RUNTIME_I18N_STATE_KEY,
} from './tokens';

export function provideRuntimeI18n(
  cfg: RuntimeI18nConfig,
  opts?: {
    stateKeyPrefix?: string;
    localeLoaders?: Record<string, () => Promise<unknown>>;
  }
): Provider[] {
  const catalogs = new Map<string, Catalog>();
  const locales = new Set<string>();
  const stateKeyPrefix = opts?.stateKeyPrefix ?? '@ngx-runtime-i18n';

  return [
    { provide: RUNTIME_I18N_CONFIG, useValue: cfg },
    { provide: RUNTIME_I18N_CATALOGS, useValue: catalogs },
    { provide: RUNTIME_I18N_LOCALES, useValue: locales },
    { provide: RUNTIME_I18N_STATE_KEY, useValue: stateKeyPrefix },
    {
      provide: RUNTIME_I18N_LOCALE_LOADERS,
      useValue: opts?.localeLoaders ?? {},
    },

    // Pre-fill catalogs from TransferState (client)
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        const ts = inject(TransferState, { optional: true });
        if (!ts) return;
        const key = makeStateKey<{
          lang: string;
          catalogs: Record<string, Catalog>;
        }>(`${stateKeyPrefix}:bootstrap`);
        if (ts.hasKey(key)) {
          const snap = ts.get(key, {
            lang: cfg.defaultLang,
            catalogs: {} as Record<string, Catalog>,
          });
          for (const [l, c] of Object.entries(snap.catalogs))
            catalogs.set(l, c);
        }
      },
    },
  ];
}
