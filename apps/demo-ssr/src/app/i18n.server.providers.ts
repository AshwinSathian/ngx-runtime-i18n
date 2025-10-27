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
 * Server-only providers that seed TransferState with the active lang and any
 * preloaded catalogs. This prevents refetch/flicker on first client view and
 * guarantees hydration-safe text.
 *
 * Usage (server.ts):
 *   const snapshot: I18nSnapshot = { lang, catalogs: { [lang]: catalogJson } };
 *   const providers = i18nServerProviders(snapshot);
 *   engine = new AngularNodeAppEngine(serverDistFolder, { providers });
 */
export function i18nServerProviders(snapshot: I18nSnapshot): Provider[] {
  const STATE_PREFIX = '@ngx-runtime-i18n';

  return [
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useFactory: () => {
        const ts = inject(TransferState);

        // Seed the "bootstrap" snapshot: { lang, catalogs }
        const bootKey = makeStateKey<I18nSnapshot>(`${STATE_PREFIX}:bootstrap`);
        ts.set(bootKey, { lang: snapshot.lang, catalogs: snapshot.catalogs });

        // Also seed individual catalog keys for quick client lookups.
        for (const [lang, catalog] of Object.entries(snapshot.catalogs)) {
          const k = makeStateKey<Record<string, unknown>>(
            `${STATE_PREFIX}:catalog:${lang}`
          );
          ts.set(k, catalog);
        }
      },
    },
  ];
}
