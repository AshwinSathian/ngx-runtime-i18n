import { makeStateKey, PLATFORM_ID, signal, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Catalog, RuntimeI18nConfig } from '@ngx-runtime-i18n/core';
import { I18nService } from './i18n.service';
import { provideRuntimeI18n } from './provide-runtime-i18n';
import {
  RUNTIME_I18N_CATALOGS,
  RUNTIME_I18N_LOCALES,
  RuntimeI18nOptions,
} from './tokens';
import {
  DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX,
  getRuntimeI18nBootstrapStateKey,
} from './transfer-state-keys';

describe('I18nService', () => {
  let service: I18nService;
  let fetchCatalogMock: jest.Mock<Promise<Catalog>, [string, AbortSignal?, string?]>;
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
      (async (_lang?: string, _signal?: AbortSignal, _scope?: string) => {
        void _lang;
        void _signal;
        void _scope;
        return opts.fetchResult ?? {};
      });
    fetchCatalogMock = jest.fn<Promise<Catalog>, [string, AbortSignal?, string?]>(
      (lang, signal, scope) => fetchImpl(lang, signal, scope)
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

  it('seeds _lang from an SSR TransferState snapshot synchronously - before ApplicationRef ever stabilizes - so first render does not flash defaultLang', async () => {
    TestBed.resetTestingModule();
    const cfg: RuntimeI18nConfig = {
      defaultLang: 'en',
      supported: ['en', 'hi'],
      fetchCatalog: async () => ({}),
    };

    await TestBed.configureTestingModule({
      providers: [
        provideRuntimeI18n(cfg, { options: { autoDetect: false, storageKey: null } }),
        TransferState,
      ],
    }).compileComponents();

    // Seed the bootstrap TransferState key BEFORE I18nService is ever
    // injected/constructed - exactly as provideRuntimeI18nSsr() does on the
    // server for a non-default resolved language.
    const ts = TestBed.inject(TransferState);
    const bootstrapKey = makeStateKey<{ lang: string; catalogs: Record<string, Catalog> }>(
      getRuntimeI18nBootstrapStateKey(DEFAULT_RUNTIME_I18N_STATE_KEY_PREFIX)
    );
    ts.set(bootstrapKey, { lang: 'hi', catalogs: {} });

    const seededService = TestBed.inject(I18nService);

    // Must already be 'hi' RIGHT NOW - synchronously, immediately after
    // construction - not defaultLang until ApplicationRef.isStable fires
    // later. Previously this read defaultLang ('en') until stability, which
    // is a visible hydration-mismatch flash whenever SSR resolved a
    // non-default language.
    expect(seededService.lang()).toBe('hi');
  });

  it('registers locale data on the server too (SSR), not only in the browser', async () => {
    TestBed.resetTestingModule();
    const cfg: RuntimeI18nConfig = {
      defaultLang: 'en',
      supported: ['en', 'hi'],
      fetchCatalog: async () => ({ greeting: 'Namaste' }),
    };
    const hiLocaleLoader = jest.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      providers: [
        provideRuntimeI18n(cfg, {
          options: { autoDetect: false, storageKey: null },
          localeLoaders: { hi: hiLocaleLoader },
        }),
        TransferState,
        // Simulate SSR: previously ensureLocale() skipped the locale loader
        // entirely whenever isBrowserPlatform was false, leaving
        // server-rendered DatePipe/DecimalPipe mis-localized.
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    }).compileComponents();

    const serverService = TestBed.inject(I18nService);
    await serverService.setLang('hi');

    expect(hiLocaleLoader).toHaveBeenCalledTimes(1);
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

  it('treats keys that shadow Object.prototype members as missing, not present', () => {
    // hasKey() must use hasOwnProperty, not `in` - `in` walks the prototype
    // chain, so a key literally named "constructor"/"toString"/etc would be
    // (incorrectly) reported as present on every catalog, bypassing the
    // fallback-chain continuation and the dev-mode missing-key warning below.
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const result = service.t('constructor');
    expect(result).toBe('constructor');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain(
      '[ngx-runtime-i18n] Missing key "constructor"'
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

  it('reports switching state while loading a new language', async () => {
    let resolveFetch: (catalog: Catalog) => void;
    const fetchPromise = new Promise<Catalog>((resolve) => {
      resolveFetch = resolve;
    });
    await setup({
      config: {
        fetchCatalog: () => fetchPromise,
      },
    });

    const pending = service.setLang('hi');
    expect(service.switching()).toBe(true);
    expect(service.activeSwitchLang()).toBe('hi');

    resolveFetch!({
      hello: { user: 'नमस्ते, {name}!' },
    } as Catalog);

    await pending;
    expect(service.switching()).toBe(false);
    expect(service.activeSwitchLang()).toBeNull();
  });

  it('settles on the LAST requested language, not whichever fetch resolves first, under rapid concurrent switching', async () => {
    // Promises (and their resolvers) built upfront, independent of call
    // timing/ordering - avoids racing against exactly how many microtask
    // ticks setLang() takes internally before it invokes fetchCatalog.
    let resolveDe!: (catalog: Catalog) => void;
    let resolveHi!: (catalog: Catalog) => void;
    const dePromise = new Promise<Catalog>((resolve) => {
      resolveDe = resolve;
    });
    const hiPromise = new Promise<Catalog>((resolve) => {
      resolveHi = resolve;
    });
    const baseCatalogs = createDefaultCatalogs();
    await setup({
      // Only 'en' pre-seeded, so both 'de' and 'hi' genuinely go to fetchCatalog.
      catalogs: new Map<string, Catalog>([['en', requiredCatalog(baseCatalogs, 'en')]]),
      config: {
        // No fallbacks: otherwise 'de' being a fallback of 'hi' would make the
        // 'hi' switch also wait on 'de' resolving, entangling the two fetches
        // this test needs to control independently.
        fallbacks: [],
        fetchCatalog: async (lang: string) => {
          if (lang === 'de') return dePromise;
          if (lang === 'hi') return hiPromise;
          return {};
        },
      },
    });

    const firstRequested = service.setLang('de'); // requested first
    const lastRequested = service.setLang('hi'); // requested second (more recent)

    // Resolve the FIRST-requested switch's fetch LAST, to prove the final
    // active lang is whichever was requested last ('hi'), not whichever
    // fetch happened to settle last in real time by coincidence.
    resolveHi({ hello: { user: 'Namaste' } });
    await lastRequested;
    resolveDe({ hello: { user: 'Hallo' } });
    await firstRequested.catch(() => void 0);

    expect(service.lang()).toBe('hi');
    expect(service.switching()).toBe(false);
    expect(service.activeSwitchLang()).toBeNull();
  });

  it('does not let a concurrent setLang() abort an unrelated preloadLang() fetch', async () => {
    const resolvers = new Map<string, (catalog: Catalog) => void>();
    await setup({
      config: {
        fetchCatalog: (lang: string) =>
          new Promise<Catalog>((resolve) => {
            resolvers.set(lang, resolve);
          }),
      },
    });

    // Start a deliberate preload for 'hi' that's still in flight...
    const preloadPending = service.preloadLang('hi');
    // ...then switch to 'de', which is already cached (createDefaultCatalogs())
    // so setLang() resolves immediately and calls cancelFetchesOutside() -
    // that call must not abort the unrelated 'hi' preload fetch above.
    await service.setLang('de');

    resolvers.get('hi')?.({ hello: { user: 'Namaste' } });
    await preloadPending;

    expect(service.getLoadedLangs()).toContain('hi');
  });

  it('resets switching when a language fails to load', async () => {
    await setup({
      config: {
        fetchCatalog: async () => {
          throw new Error('network');
        },
      },
    });

    await expect(service.setLang('hi')).rejects.toThrow('network');

    expect(service.switching()).toBe(false);
    expect(service.activeSwitchLang()).toBeNull();
  });

  it('preloads a language without mutating the active lang', async () => {
    await setup();
    fetchCatalogMock.mockClear();

    await service.preloadLang('hi');

    expect(service.lang()).toBe('en');
    expect(fetchCatalogMock).toHaveBeenCalledWith(
      'hi',
      expect.any(AbortSignal)
    );
  });

  it('preloads multiple languages', async () => {
    const baseCatalogs = createDefaultCatalogs();
    const initialCatalogs = new Map<string, Catalog>([
      ['en', requiredCatalog(baseCatalogs, 'en')],
    ]);
    await setup({ catalogs: initialCatalogs });
    fetchCatalogMock.mockClear();

    await service.preloadLangs(['hi', 'de']);

    expect(fetchCatalogMock).toHaveBeenCalledWith(
      'hi',
      expect.any(AbortSignal)
    );
    expect(fetchCatalogMock).toHaveBeenCalledWith(
      'de',
      expect.any(AbortSignal)
    );
  });

  it('preloads the fallback chain for a requested lang', async () => {
    const baseCatalogs = createDefaultCatalogs();
    const initialCatalogs = new Map<string, Catalog>([
      ['en', requiredCatalog(baseCatalogs, 'en')],
    ]);
    await setup({ catalogs: initialCatalogs });
    fetchCatalogMock.mockClear();

    await service.preloadFallbackChain('hi');

    expect(fetchCatalogMock).toHaveBeenCalledWith(
      'hi',
      expect.any(AbortSignal)
    );
    expect(fetchCatalogMock).toHaveBeenCalledWith(
      'de',
      expect.any(AbortSignal)
    );
    expect(service.lang()).toBe('en');
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

  describe('scope catalogs', () => {
    it('loadScope calls fetchCatalog with the bare lang plus the scope name (not a pre-built URL)', async () => {
      // fetchCatalog's contract is (lang, signal?, scope?) — the same shape used for
      // global catalogs, just with `scope` set — so a single fetchCatalog implementation
      // (e.g. `fetch(scope ? `/i18n/${scope}/${lang}.json` : `/i18n/${lang}.json`)`) works
      // for both global and scoped loads.
      await setup({
        config: {
          fetchCatalog: async (lang: string, _signal?: AbortSignal, scope?: string) => {
            if (lang === 'en' && scope === 'checkout') {
              return { checkout: { title: 'Checkout' } };
            }
            return {};
          },
        },
      });

      await service.loadScope('checkout');
      expect(service.t('checkout.title')).toBe('Checkout');
    });

    it('scope key takes precedence over global catalog', async () => {
      const catalogs = TestBed.inject(RUNTIME_I18N_CATALOGS);
      catalogs.set('en', { checkout: { title: 'Global Checkout' } });

      await setup({
        config: {
          fetchCatalog: async (lang: string, _signal?: AbortSignal, scope?: string) => {
            if (lang === 'en' && scope === 'checkout') {
              return { checkout: { title: 'Scope Checkout' } };
            }
            return {};
          },
        },
      });

      await service.loadScope('checkout');
      expect(service.t('checkout.title')).toBe('Scope Checkout');
    });

    it('re-loading an already-loaded scope makes it "most recent" again, winning over a scope loaded after it originally', async () => {
      await setup({
        config: {
          fetchCatalog: async (lang: string, _signal?: AbortSignal, scope?: string) => {
            if (lang === 'en' && scope === 'parent') return { title: { key: 'Parent title' } };
            if (lang === 'en' && scope === 'child') return { title: { key: 'Child title' } };
            return {};
          },
        },
      });

      await service.loadScope('parent');
      await service.loadScope('child');
      // 'child' loaded after 'parent' -> child currently wins (expected).
      expect(service.t('title.key')).toBe('Child title');

      // Re-entering 'parent' (e.g. its route reactivating) must make it the
      // most-recently-loaded scope again, not leave 'child' permanently
      // winning just because it happened to load once, later, in the past.
      await service.loadScope('parent');
      expect(service.t('title.key')).toBe('Parent title');
    });

    it('unloadScope removes the scope catalog so global key is used again', async () => {
      const baseCatalogs = createDefaultCatalogs();
      await setup({
        catalogs: baseCatalogs,
        config: {
          fetchCatalog: async (lang: string, _signal?: AbortSignal, scope?: string) => {
            if (lang === 'en' && scope === 'checkout') {
              return { checkout: { title: 'Scope Checkout' } };
            }
            // for en catalog
            return requiredCatalog(baseCatalogs, 'en');
          },
        },
      });

      await service.loadScope('checkout');
      expect(service.t('checkout.title')).toBe('Scope Checkout');

      service.unloadScope('checkout');
      // After unload, the key doesn't exist in global catalog so returns key
      expect(service.t('checkout.title')).toBe('checkout.title');
    });
  });

  describe('t$()', () => {
    it('returns a Signal (function)', () => {
      const sig = service.t$('hello.user', { name: 'Ashwin' });
      expect(typeof sig).toBe('function');
    });

    it('resolves the translation synchronously via the Signal', () => {
      const sig = service.t$('hello.user', { name: 'Ashwin' });
      expect(sig()).toBe('Hello, Ashwin!');
    });

    it('recomputes when language switches', async () => {
      const catalogs = TestBed.inject(RUNTIME_I18N_CATALOGS);
      catalogs.set('de', { hello: { user: 'Hallo, {name}!' } });

      const sig = service.t$('hello.user', { name: 'World' });
      expect(sig()).toBe('Hello, World!');

      await service.setLang('de');
      expect(sig()).toBe('Hallo, World!');
    });

    it('accepts a Signal<params> for reactive params', () => {
      const paramsSignal = signal<Record<string, unknown>>({ name: 'Ashwin' });
      const sig = service.t$('hello.user', paramsSignal as unknown as Parameters<typeof service.t$>[1]);
      expect(sig()).toBe('Hello, Ashwin!');
    });
  });
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
