import { TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Catalog, RuntimeI18nConfig } from '@ngx-runtime-i18n/core';
import { I18nService } from './i18n.service';
import { provideRuntimeI18n } from './provide-runtime-i18n';
import { RUNTIME_I18N_CATALOGS, RUNTIME_I18N_LOCALES } from './tokens';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(async () => {
    // Pre-seed default catalog and locales to avoid async boot work.
    const seededCatalogs = new Map<string, Catalog>([
      [
        'en',
        {
          hello: { user: 'Hello, {name}!' },
          cart: {
            items:
              '{count, plural, =0 {No items} one {1 item} other {# items}}',
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
    const seededLocales = new Set<string>(['en', 'hi', 'de']);

    const cfg: RuntimeI18nConfig = {
      defaultLang: 'en',
      supported: ['en', 'hi', 'de'],
      fallbacks: ['de'],
      // Not used in these tests (we avoid network); still required by type.
      fetchCatalog: async () => ({}),
      onMissingKey: (k) => k,
    };

    await TestBed.configureTestingModule({
      providers: [
        provideRuntimeI18n(cfg, {
          options: {
            autoDetect: false, // <– force tests to use defaultLang ('en')
            storageKey: null, // <– avoid localStorage messing with things
          },
          // No dynamic locale loading in unit tests
          localeLoaders: {},
        }),
        { provide: RUNTIME_I18N_CATALOGS, useValue: seededCatalogs },
        { provide: RUNTIME_I18N_LOCALES, useValue: seededLocales },
        TransferState,
      ],
    }).compileComponents();

    service = TestBed.inject(I18nService);

    // Angular's ApplicationRef.isStable subscription happens in constructor.
    // We don't rely on ready() in these tests; we operate on seeded catalogs.
    expect(service).toBeTruthy();
  });

  it('translates using default language', () => {
    const s = service.t('hello.user', { name: 'Ashwin' });
    expect(s).toBe('Hello, Ashwin!');
  });

  it('falls back to key when missing (using onMissingKey)', () => {
    const s = service.t('does.not.exist');
    expect(s).toBe('does.not.exist');
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

  it('falls back through configured chain before defaultLang', async () => {
    const catalogs = TestBed.inject(RUNTIME_I18N_CATALOGS);
    catalogs.set('hi', {
      hello: { user: 'नमस्ते, {name}!' },
    });

    await service.setLang('hi');
    expect(service.t('germanOnly')).toBe('Nur Deutsch'); // via fallback "de"
    expect(service.t('defaultsOnly')).toBe('Default only'); // via default "en"
  });

  it('exposes DX helper methods', async () => {
    // Ensure a deterministic starting language for the test
    await service.setLang('en');

    expect(service.getCurrentLang()).toBe('en');
    const loaded = service.getLoadedLangs();
    expect(loaded).toEqual(expect.arrayContaining(['en', 'de']));
    expect(service.hasKey('hello.user')).toBe(true);
  });
});
