import { provideRuntimeI18n } from './provide-runtime-i18n';

describe('provideRuntimeI18n', () => {
  it('throws a clear startup error when defaultLang is not in supported', () => {
    // Otherwise getFallbackChain() silently resolves to an empty chain and
    // every single t() call falls through to onMissingKey()/the raw key,
    // with no error pointing at the actual misconfiguration.
    expect(() =>
      provideRuntimeI18n({
        defaultLang: 'fr',
        supported: ['en', 'hi'],
        fetchCatalog: async () => ({}),
      })
    ).toThrow(/defaultLang "fr" must be included in "supported"/);
  });

  it('does not throw when defaultLang is included in supported', () => {
    expect(() =>
      provideRuntimeI18n({
        defaultLang: 'en',
        supported: ['en', 'hi'],
        fetchCatalog: async () => ({}),
      })
    ).not.toThrow();
  });
});
