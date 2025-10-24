import {
  ENVIRONMENT_INITIALIZER,
  Provider,
  TransferState,
  inject,
  makeStateKey,
} from '@angular/core';

export interface I18nSnapshot {
  lang: string;
  catalogs: Record<string, unknown>;
}

/**
 * Server-only providers that seed TransferState with the active lang and catalogs.
 * This runs inside Angular on the server render (via ENVIRONMENT_INITIALIZER).
 */
export function i18nServerProviders(snapshot: I18nSnapshot): Provider[] {
  const STATE_PREFIX = '@ngx-runtime-i18n/core';
  return [
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        const ts = inject(TransferState);

        // Bootstrap snapshot: {lang, catalogs}
        const bootKey = makeStateKey<{
          lang: string;
          catalogs: Record<string, unknown>;
        }>(`${STATE_PREFIX}:bootstrap`);
        ts.set(bootKey, { lang: snapshot.lang, catalogs: snapshot.catalogs });

        // Individual catalog keys for client lookups (avoid refetch on first view)
        for (const [l, cat] of Object.entries(snapshot.catalogs)) {
          const k = makeStateKey<Record<string, unknown>>(
            `${STATE_PREFIX}:catalog:${l}`
          );
          ts.set(k, cat);
        }
      },
    },
  ];
}
