import { TestBed } from '@angular/core/testing';
import type { Catalog } from '@ngx-runtime-i18n/core';
import {
  RUNTIME_I18N_CATALOGS,
  RUNTIME_I18N_LOCALES,
} from '@ngx-runtime-i18n/angular';
import { appConfig } from './app.config';
import { App } from './app';
import { NxWelcome } from './nx-welcome';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, NxWelcome],
      providers: [...(appConfig.providers ?? [])],
    }).compileComponents();
    seedDemoCatalogs();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Hello, Ashwin!'
    );
  });
});

const demoCatalog: Catalog = {
  hello: { user: 'Hello, {name}!' },
  cart: {
    items: '{count, plural, =0 {No items} one {1 item} other {# items}}',
  },
  legacy: {
    title: 'Legacy Title',
  },
};

const germanCatalog: Catalog = {
  hello: { user: 'Hallo, {name}!' },
  cart: {
    items:
      '{count, plural, =0 {Keine Artikel} one {1 Artikel} other {# Artikel}}',
  },
  legacy: {
    title: 'Legacy Titel',
  },
};

function seedDemoCatalogs() {
  const catalogs = TestBed.inject(RUNTIME_I18N_CATALOGS);
  catalogs.set('en', demoCatalog);
  catalogs.set('de', germanCatalog);
  const locales = TestBed.inject(RUNTIME_I18N_LOCALES);
  locales.add('en');
  locales.add('de');
}
