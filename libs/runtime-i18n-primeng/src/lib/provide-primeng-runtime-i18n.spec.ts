let effectCallback: (() => void) | undefined;

jest.mock('@angular/core', () => {
  const actual = jest.requireActual('@angular/core');
  return {
    ...actual,
    effect: (fn: () => void) => {
      effectCallback = fn;
      fn();
      return () => undefined;
    },
  };
});

import { Signal, signal } from '@angular/core';
import { I18nService } from '@ngx-runtime-i18n/angular';
import {
  createPrimeNgRuntimeI18nEffect,
  ProvidePrimeNgRuntimeI18nOptions,
  RuntimeI18nPrimeNgConfig,
} from './provide-primeng-runtime-i18n';

class MockI18nService implements Partial<I18nService> {
  private readonly _lang = signal('en');
  readonly lang: Signal<string> = this._lang.asReadonly();

  switchLang(lang: string) {
    this._lang.set(lang);
  }
}

// Deliberately a plain object, not a class imported from `primeng` - this
// package no longer has a compile-time dependency on any specific PrimeNG
// module, so nothing here should either. See RuntimeI18nPrimeNgConfig.
const createPrimeNgConfig = () =>
  ({
    setTranslation: jest.fn(),
  } as RuntimeI18nPrimeNgConfig & {
    setTranslation: jest.Mock<void, [Record<string, unknown>]>;
  });

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(() => resolve()));

describe('providePrimeNgRuntimeI18n', () => {
  const translations = {
    en: { firstDayOfWeek: 0 },
    es: { firstDayOfWeek: 1 },
  } as const;

  let resolveTranslation: jest.Mock<Record<string, unknown>, [string]>;
  let onApplied: jest.Mock<void, [string]>;
  let primeNgConfig: ReturnType<typeof createPrimeNgConfig>;
  let i18n: MockI18nService;

  beforeEach(() => {
    resolveTranslation = jest.fn(
      (lang: string) => translations[lang as keyof typeof translations]
    );
    onApplied = jest.fn();
    primeNgConfig = createPrimeNgConfig();
    i18n = new MockI18nService();
    effectCallback = undefined;
    createPrimeNgRuntimeI18nEffect(
      i18n as unknown as I18nService,
      primeNgConfig,
      {
        configToken: class {} as unknown as ProvidePrimeNgRuntimeI18nOptions['configToken'],
        resolveTranslation,
        onApplied,
      } satisfies ProvidePrimeNgRuntimeI18nOptions
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    effectCallback = undefined;
  });

  it('applies translations and reuses cached results', async () => {
    await flushMicrotasks();
    expect(resolveTranslation).toHaveBeenCalledWith('en');
    expect(primeNgConfig.setTranslation).toHaveBeenCalledWith(translations.en);
    expect(onApplied).toHaveBeenCalledWith('en');

    i18n.switchLang('es');
    effectCallback?.();
    await flushMicrotasks();

    expect(resolveTranslation).toHaveBeenCalledWith('es');
    expect(primeNgConfig.setTranslation).toHaveBeenLastCalledWith(
      translations.es
    );
    expect(onApplied).toHaveBeenLastCalledWith('es');

    i18n.switchLang('en');
    effectCallback?.();
    await flushMicrotasks();

    expect(resolveTranslation).toHaveBeenCalledTimes(2);
    expect(primeNgConfig.setTranslation).toHaveBeenLastCalledWith(
      translations.en
    );
    expect(onApplied).toHaveBeenLastCalledWith('en');
  });
});
