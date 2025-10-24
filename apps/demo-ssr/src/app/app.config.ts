import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import {
  provideClientHydration,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideClientHydration(
      withHttpTransferCacheOptions({ includePostRequests: false })
    ),

    provideRuntimeI18n(
      {
        defaultLang: 'en',
        supported: ['en', 'hi', 'de'],
        // CSR path: catalogs live under /i18n at public root (and dist/browser/i18n after build)
        fetchCatalog: (lang, signal) =>
          fetch(`/i18n/${lang}.json`, { signal }).then((r) => r.json()),
        onMissingKey: (k) => k,
      },
      {
        // Load Angular locale data for pipes at runtime
        localeLoaders: {
          en: () => import('@angular/common/locales/global/en'),
          hi: () => import('@angular/common/locales/global/hi'),
          de: () => import('@angular/common/locales/global/de'),
        },
        options: {
          autoDetect: true,
          storageKey: '@ngx-runtime-i18n:lang',
          preferNavigatorBase: true,
        },
      }
    ),
  ],
};
