import { TestBed } from '@angular/core/testing';
import { TransferState } from '@angular/core';
import { I18nService } from '../lib/i18n.service';
import { provideRuntimeI18nTesting } from './provide-runtime-i18n-testing';

describe('provideRuntimeI18nTesting', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('makes I18nService injectable and translates a key synchronously', async () => {
    TestBed.configureTestingModule({
      providers: [
        TransferState,
        provideRuntimeI18nTesting({
          catalogs: { en: { app: { title: 'My App' } } },
        }),
      ],
    });

    const i18n = TestBed.inject(I18nService);
    expect(i18n.t('app.title')).toBe('My App');
  });

  it('returns the key itself for a missing key', async () => {
    TestBed.configureTestingModule({
      providers: [
        TransferState,
        provideRuntimeI18nTesting({
          catalogs: { en: { app: { title: 'My App' } } },
        }),
      ],
    });

    const i18n = TestBed.inject(I18nService);
    expect(i18n.t('does.not.exist')).toBe('does.not.exist');
  });

  it('reports the defaultLang as the active lang', async () => {
    TestBed.configureTestingModule({
      providers: [
        TransferState,
        provideRuntimeI18nTesting({
          defaultLang: 'en',
          catalogs: { en: { greeting: 'Hello' } },
        }),
      ],
    });

    const i18n = TestBed.inject(I18nService);
    expect(i18n.lang()).toBe('en');
  });

  it('returns correct value after setLang() switches to a different language', async () => {
    TestBed.configureTestingModule({
      providers: [
        TransferState,
        provideRuntimeI18nTesting({
          catalogs: {
            en: { greeting: 'Hello' },
            fr: { greeting: 'Bonjour' },
          },
        }),
      ],
    });

    const i18n = TestBed.inject(I18nService);
    expect(i18n.t('greeting')).toBe('Hello');

    await i18n.setLang('fr');
    expect(i18n.t('greeting')).toBe('Bonjour');
  });

  it('infers supported langs from catalog keys when not specified', () => {
    TestBed.configureTestingModule({
      providers: [
        TransferState,
        provideRuntimeI18nTesting({
          catalogs: {
            en: { greeting: 'Hello' },
            de: { greeting: 'Hallo' },
          },
        }),
      ],
    });

    const i18n = TestBed.inject(I18nService);
    // Both languages should be recognized (setLang should not throw)
    expect(() => i18n.setLang('de')).not.toThrow();
  });
});
