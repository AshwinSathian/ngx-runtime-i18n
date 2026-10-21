import {
  EnvironmentProviders,
  TransferState,
  inject,
  makeStateKey,
  provideEnvironmentInitializer,
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

/**
 * Seeds TransferState with the catalogs `provideRuntimeI18n()` reads on the client.
 *
 * Pass a snapshot, or a factory that returns one. The factory runs in an injection
 * context, which is how a per-request snapshot reaches the app under
 * `AngularNodeAppEngine`: its `handle(req, requestContext)` takes an opaque context
 * value (not providers), exposed to the app as `REQUEST_CONTEXT`.
 *
 * ```ts
 * // server.ts
 * angularApp.handle(req, buildSnapshot(req));
 * // app.config.server.ts
 * provideRuntimeI18nSsr(() => inject(REQUEST_CONTEXT) as RuntimeI18nSsrSnapshot | null)
 * ```
 *
 * A factory that returns `null` or `undefined` seeds nothing, so prerendering
 * (where there is no request) falls back to normal client-side loading.
 */
export function provideRuntimeI18nSsr(
  snapshot: RuntimeI18nSsrSnapshot | (() => RuntimeI18nSsrSnapshot | null | undefined),
  opts?: ProvideRuntimeI18nSsrOptions
): EnvironmentProviders {
  const stateKeyPrefix =
    opts?.stateKeyPrefix ?? DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX;

  return provideEnvironmentInitializer(() => {
    const ts = inject(TransferState, { optional: true });
    if (!ts) return;
    const snap = typeof snapshot === 'function' ? snapshot() : snapshot;
    if (!snap) return;
    const catalogs: Record<string, Catalog> = {
      ...(snap.catalogs ?? {}),
      [snap.lang]: snap.bootstrap,
    };

    const bootstrapKey = makeStateKey<{
      lang: string;
      catalogs: Record<string, Catalog>;
    }>(getRuntimeI18nBootstrapStateKey(stateKeyPrefix));

    ts.set(bootstrapKey, { lang: snap.lang, catalogs });

    for (const [lang, catalog] of Object.entries(catalogs)) {
      const catalogKey = makeStateKey<Catalog>(
        getRuntimeI18nCatalogStateKey(stateKeyPrefix, lang)
      );
      ts.set(catalogKey, catalog);
    }
  });
}
