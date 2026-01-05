import { makeStateKey, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Catalog } from '@ngx-runtime-i18n/core';
import {
  getRuntimeI18nBootstrapStateKey,
  getRuntimeI18nCatalogStateKey,
  DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX,
} from '../transfer-state-keys';
import {
  provideRuntimeI18nSsr,
  RuntimeI18nSsrSnapshot,
} from './provide-runtime-i18n-ssr';

describe('provideRuntimeI18nSsr', () => {
  const catalogs = {
    en: { hello: 'Hello' },
    de: { hello: 'Hallo' },
  } satisfies Record<string, Catalog>;

  const snapshot: RuntimeI18nSsrSnapshot = {
    lang: 'en',
    bootstrap: catalogs.en,
    catalogs,
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('writes TransferState keys using the shared prefix', async () => {
    await TestBed.configureTestingModule({
      providers: [TransferState, ...provideRuntimeI18nSsr(snapshot)],
    }).compileComponents();

    const ts = TestBed.inject(TransferState);
    const bootstrapKey = makeStateKey<{
      lang: string;
      catalogs: Record<string, Catalog>;
    }>(getRuntimeI18nBootstrapStateKey(DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX));

    expect(ts.hasKey(bootstrapKey)).toBe(true);
    expect(ts.get(bootstrapKey, null)).toEqual({
      lang: snapshot.lang,
      catalogs,
    });
  });

  it('also seeds per-catalog keys for hydration', async () => {
    await TestBed.configureTestingModule({
      providers: [TransferState, ...provideRuntimeI18nSsr(snapshot)],
    }).compileComponents();

    const ts = TestBed.inject(TransferState);
    for (const [lang, catalog] of Object.entries(catalogs)) {
      const key = makeStateKey<Catalog>(
        getRuntimeI18nCatalogStateKey(
          DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX,
          lang
        )
      );
      expect(ts.get(key, null)).toBe(catalog);
    }
  });
});
