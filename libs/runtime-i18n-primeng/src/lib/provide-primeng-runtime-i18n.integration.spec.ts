import { Signal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18nService } from '@ngx-runtime-i18n/angular';
import {
  createPrimeNgRuntimeI18nEffect,
  ProvidePrimeNgRuntimeI18nOptions,
  RuntimeI18nPrimeNgConfig,
} from './provide-primeng-runtime-i18n';

// This package has no compile-time dependency on `primeng` at all (see
// RuntimeI18nPrimeNgConfig) - the caller supplies whichever config class
// matches their installed PrimeNG version via `configToken`. A plain object
// satisfying the structural shape is a faithful stand-in here; the real
// class's identity has already been exercised for real against an actually
// installed PrimeNG package in provide-primeng-runtime-i18n.real-primeng.spec.ts.
// What we CAN — and must — verify without mocking `effect()` away (as
// provide-primeng-runtime-i18n.spec.ts does) is that the real, unmocked
// `effect()` call inside `createPrimeNgRuntimeI18nEffect` doesn't throw
// NG0203 when invoked the way `providePrimeNgRuntimeI18n`'s APP_INITIALIZER
// factory actually invokes it: inside an Angular injection context.
class MockI18nService implements Partial<I18nService> {
  private readonly _lang = signal('en');
  readonly lang: Signal<string> = this._lang.asReadonly();

  switchLang(lang: string) {
    this._lang.set(lang);
  }
}

describe('createPrimeNgRuntimeI18nEffect (real, unmocked effect())', () => {
  it('does not throw NG0203 and applies the resolved translation when called within an injection context', () => {
    const i18n = new MockI18nService() as unknown as I18nService;
    const primeng: RuntimeI18nPrimeNgConfig = { setTranslation: jest.fn() };
    const resolveTranslation = jest.fn(() => ({ firstDayOfWeek: 0 }));
    const onApplied = jest.fn();

    expect(() => {
      TestBed.runInInjectionContext(() => {
        createPrimeNgRuntimeI18nEffect(i18n, primeng, {
          configToken: class {} as unknown as ProvidePrimeNgRuntimeI18nOptions['configToken'],
          resolveTranslation,
          onApplied,
        } satisfies ProvidePrimeNgRuntimeI18nOptions);
      });
      TestBed.flushEffects();
    }).not.toThrow();

    expect(resolveTranslation).toHaveBeenCalledWith('en');
  });
});
