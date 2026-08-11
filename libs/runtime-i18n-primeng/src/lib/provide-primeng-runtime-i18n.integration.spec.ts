import { Signal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18nService } from '@ngx-runtime-i18n/angular';
import { PrimeNGConfig } from 'primeng/api';
import {
  createPrimeNgRuntimeI18nEffect,
  ProvidePrimeNgRuntimeI18nOptions,
} from './provide-primeng-runtime-i18n';

// `primeng` is a peer dependency, not installed in this workspace (only a type
// shim exists at ../../types/primeng-api.d.ts), so we can't stand up a real
// PrimeNGConfig via TestBed the way the material adapter's integration spec
// does. What we CAN — and must — verify without mocking `effect()` away (as
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
    const primeng = { setTranslation: jest.fn() } as unknown as PrimeNGConfig;
    const resolveTranslation = jest.fn(() => ({ firstDayOfWeek: 0 }));
    const onApplied = jest.fn();

    expect(() => {
      TestBed.runInInjectionContext(() => {
        createPrimeNgRuntimeI18nEffect(i18n, primeng, {
          resolveTranslation,
          onApplied,
        } as ProvidePrimeNgRuntimeI18nOptions);
      });
      TestBed.flushEffects();
    }).not.toThrow();

    expect(resolveTranslation).toHaveBeenCalledWith('en');
  });
});
