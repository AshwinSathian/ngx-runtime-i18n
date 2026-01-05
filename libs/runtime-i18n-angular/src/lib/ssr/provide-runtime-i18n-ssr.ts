import {
  ENVIRONMENT_INITIALIZER,
  Provider,
  TransferState,
  inject,
  makeStateKey,
} from '@angular/core';
import type { Catalog } from '@ngx-runtime-i18n/core';
import {
  DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX,
  getRuntimeI18nBootstrapStateKey,
  getRuntimeI18nCatalogStateKey,
} from '../transfer-state-keys';

export interface RuntimeI18nSsrSnapshot {
  lang: string;
  bootstrap: Catalog;
  catalogs?: Record<string, Catalog>;
}

export interface ProvideRuntimeI18nSsrOptions {
  stateKeyPrefix?: string;
}

export function provideRuntimeI18nSsr(
  snapshot: RuntimeI18nSsrSnapshot,
  opts?: ProvideRuntimeI18nSsrOptions
): Provider[] {
  const stateKeyPrefix =
    opts?.stateKeyPrefix ?? DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX;
  const catalogs: Record<string, Catalog> = {
    ...(snapshot.catalogs ?? {}),
    [snapshot.lang]: snapshot.bootstrap,
  };

  return [
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useFactory: () => () => {
        const ts = inject(TransferState, { optional: true });
        if (!ts) return;

        const bootstrapKey = makeStateKey<{
          lang: string;
          catalogs: Record<string, Catalog>;
        }>(getRuntimeI18nBootstrapStateKey(stateKeyPrefix));

        ts.set(bootstrapKey, { lang: snapshot.lang, catalogs });

        for (const [lang, catalog] of Object.entries(catalogs)) {
          const catalogKey = makeStateKey<Catalog>(
            getRuntimeI18nCatalogStateKey(stateKeyPrefix, lang)
          );
          ts.set(catalogKey, catalog);
        }
      },
    },
  ];
}
