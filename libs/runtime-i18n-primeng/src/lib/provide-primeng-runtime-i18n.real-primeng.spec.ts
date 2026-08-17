import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PrimeNG } from 'primeng/config';
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';
import { providePrimeNgRuntimeI18n } from './provide-primeng-runtime-i18n';

// Everything else in this package tests against a structural mock
// (RuntimeI18nPrimeNgConfig), because the package itself has no compile-time
// dependency on `primeng` - the caller supplies whatever config class
// matches their installed version. That's the right design, but it means
// nothing else here proves the actual, real `primeng` package still exports
// a class at this path with this shape. This spec is that proof: a real
// `primeng` install (devDependency only - see root package.json) pinned at
// 21.1.9, the last MIT-licensed release, imported and driven through the
// real APP_INITIALIZER + effect() pipeline exactly as a consumer app would.
@Component({ standalone: true, template: '' })
class HostCmp {}

describe('providePrimeNgRuntimeI18n against a real, installed PrimeNG (v21, primeng/config)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('applies the resolved translation to the real PrimeNG config instance', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRuntimeI18n({
          defaultLang: 'en',
          supported: ['en'],
          fetchCatalog: async () => ({}),
        }),
        providePrimeNgRuntimeI18n({
          configToken: PrimeNG,
          resolveTranslation: () => ({ accept: 'Yes', reject: 'No' }),
        }),
      ],
    });

    const fixture = TestBed.createComponent(HostCmp);
    fixture.detectChanges();

    await TestBed.inject(ApplicationRef).whenStable();
    await Promise.resolve();

    const primeng = TestBed.inject(PrimeNG);
    expect(primeng.translation.accept).toBe('Yes');
    expect(primeng.translation.reject).toBe('No');
  });
});
