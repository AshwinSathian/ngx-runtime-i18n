import { TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Catalog, RuntimeI18nConfig } from '@ngx-runtime-i18n/core';
import { I18nService } from './i18n.service';
import { provideRuntimeI18n } from './provide-runtime-i18n';
import {
  RUNTIME_I18N_CATALOGS,
  RUNTIME_I18N_LOCALES,
  RuntimeI18nOptions,
} from './tokens';

describe('I18nService', () => {
  let service: I18nService;
  let fetchCatalogMock: jest.Mock<Promise<Catalog>, [string, AbortSignal?]>;
  const defaultLocales = new Set<string>(['en', 'hi', 'de']);
  type I18nServiceInternals = {
    options: RuntimeI18nOptions;
    fetchCatalogFromNetwork(lang: string): Promise<void>;
  };

  interface SetupOptions {
    catalogs?: Map<string, Catalog>;
    config?: Partial<RuntimeI18nConfig>;
    options?: Partial<RuntimeI18nOptions>;
    fetchResult?: Catalog;
  }

  async function setup(opts: SetupOptions = {}) {
    TestBed.resetTestingModule();
    const seededCatalogs = opts.catalogs ?? createDefaultCatalogs();
    const fetchImpl =
      opts.config?.fetchCatalog ??
      (async (_lang?: string, _signal?: AbortSignal) => {
        void _lang;
        void _signal;
        return opts.fetchResult ?? {};
      });
    fetchCatalogMock = jest.fn<Promise<Catalog>, [string, AbortSignal?]>(
      (lang, signal) => fetchImpl(lang, signal)
    );
    const cfg: RuntimeI18nConfig = {
      defaultLang: opts.config?.defaultLang ?? 'en',
      supported: opts.config?.supported ?? ['en', 'hi', 'de'],
      fallbacks: opts.config?.fallbacks ?? ['de'],
      fetchCatalog: fetchCatalogMock,
      onMissingKey: opts.config?.onMissingKey ?? ((k) => k),
    };

    const normalizedOptions: RuntimeI18nOptions = {
      autoDetect: false,
      storageKey: null,
      cacheMode: 'memory',
      cacheKeyPrefix: '@test-cache:',
      preferNavigatorBase: true,
      ...opts.options,
    };

    await TestBed.configureTestingModule({
      providers: [
        provideRuntimeI18n(cfg, {
          options: normalizedOptions,
          localeLoaders: {},
        }),
        { provide: RUNTIME_I18N_CATALOGS, useValue: seededCatalogs },
        { provide: RUNTIME_I18N_LOCALES, useValue: new Set(defaultLocales) },
        TransferState,
      ],
    }).compileComponents();

    service = TestBed.inject(I18nService);
  }

  beforeEach(async () => {
    await setup();
  });

  afterEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it('translates using the active language catalog first', () => {
    const s = service.t('hello.user', { name: 'Ashwin' });
    expect(s).toBe('Hello, Ashwin!');
  });

  it('resolves keys from configured fallbacks before defaultLang', async () => {
    const catalogs = TestBed.inject(RUNTIME_I18N_CATALOGS);
    catalogs.set('hi', {
      hello: { user: 'नमस्ते, {name}!' },
    });

    await service.setLang('hi');
    expect(service.t('germanOnly')).toBe('Nur Deutsch');
    expect(service.t('defaultsOnly')).toBe('Default only');
  });

  it('warns once when a key is missing throughout the chain', () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const result = service.t('totally.missing');
    expect(result).toBe('totally.missing');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain(
      '[ngx-runtime-i18n] Missing key "totally.missing"'
    );
  });

  it('switches language and uses newly available catalog', async () => {
    // Manually inject a Hindi catalog into the shared map to simulate it being loaded
    const catalogs = TestBed.inject(RUNTIME_I18N_CATALOGS);
    catalogs.set('hi', {
      hello: { user: 'नमस्ते, {name}!' },
    });

    await service.setLang('hi');
    expect(service.lang()).toBe('hi');

    const s = service.t('hello.user', { name: 'Ashwin' });
    expect(s).toBe('नमस्ते, Ashwin!');
  });

  it('exposes DX helper methods', async () => {
    await service.setLang('en');
    expect(service.getCurrentLang()).toBe('en');
    expect(service.getLoadedLangs()).toEqual(
      expect.arrayContaining(['en', 'de'])
    );
    expect(service.hasKey('hello.user')).toBe(true);
    expect(service.hasKey('does.not.exist')).toBe(false);
  });

  it('hydrates catalogs from localStorage when cacheMode=storage', async () => {
    const cached = {
      hello: { user: 'Cache hit, {name}!' },
    } satisfies Catalog;
    const storage = window.localStorage;
    storage.clear();
    storage.setItem('@cache:hi', JSON.stringify(cached));

    const slowFetch = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { hello: { user: 'नमस्ते, {name}!' } } satisfies Catalog;
    };

    const baseCatalogs = createDefaultCatalogs();

    await setup({
      catalogs: new Map<string, Catalog>([
        ['en', requiredCatalog(baseCatalogs, 'en')],
        ['de', requiredCatalog(baseCatalogs, 'de')],
      ]),
      options: { cacheMode: 'storage', cacheKeyPrefix: '@cache:' },
      config: { fetchCatalog: slowFetch },
    });

    const internals = service as unknown as I18nServiceInternals;
    expect(internals.options.cacheMode).toBe('storage');
    expect(internals.options.cacheKeyPrefix).toBe('@cache:');

    await service.setLang('hi');
    expect(service.t('hello.user', { name: 'Ashwin' })).toBe(
      'Cache hit, Ashwin!'
    );
    expect(fetchCatalogMock).toHaveBeenCalledWith(
      'hi',
      expect.any(AbortSignal)
    );

    await internals.fetchCatalogFromNetwork('hi');
    expect(storage.getItem('@cache:hi')).toBe(
      JSON.stringify({ hello: { user: 'नमस्ते, {name}!' } })
    );
  });

  it.each(['memory', 'none'] as const)(
    'does not touch localStorage when cacheMode=%s',
    async (mode) => {
      const storage = window.localStorage;
      storage.clear();

      await setup({ options: { cacheMode: mode } });
      await service.setLang('hi');
      expect(storage.length).toBe(0);
      expect(storage.getItem('@cache:hi')).toBeNull();
    }
  );
});

function requiredCatalog(map: Map<string, Catalog>, key: string): Catalog {
  const catalog = map.get(key);
  if (!catalog) {
    throw new Error(`Missing default catalog for "${key}"`);
  }
  return catalog;
}

function createDefaultCatalogs(): Map<string, Catalog> {
  return new Map<string, Catalog>([
    [
      'en',
      {
        hello: { user: 'Hello, {name}!' },
        cart: {
          items: '{count, plural, =0 {No items} one {1 item} other {# items}}',
        },
        defaultsOnly: 'Default only',
      } as Catalog,
    ],
    [
      'de',
      {
        hello: { user: 'Hallo, {name}!' },
        germanOnly: 'Nur Deutsch',
      } as Catalog,
    ],
  ]);
}
