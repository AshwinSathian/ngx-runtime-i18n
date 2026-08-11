import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';
import { provideMaterialRuntimeI18n } from './provide-material-runtime-i18n';

@Component({ standalone: true, template: '' })
class HostCmp {}

describe('provideMaterialRuntimeI18n (real DI wiring)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('applies resolved labels via the real APP_INITIALIZER + effect() pipeline, without an injection-context error', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRuntimeI18n({
          defaultLang: 'en',
          supported: ['en'],
          fetchCatalog: async () => ({}),
        }),
        provideMaterialRuntimeI18n({
          resolveLabels: () => ({ paginator: { itemsPerPageLabel: 'Items:' } }),
        }),
      ],
    });

    const fixture = TestBed.createComponent(HostCmp);
    fixture.detectChanges();

    await TestBed.inject(ApplicationRef).whenStable();
    // Flush the microtask queue so the async resolveLabels() promise settles.
    await Promise.resolve();

    const paginatorIntl = TestBed.inject(MatPaginatorIntl);
    expect(paginatorIntl.itemsPerPageLabel).toBe('Items:');
  });
});
