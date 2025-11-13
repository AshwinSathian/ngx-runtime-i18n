import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideRuntimeI18n } from '@ngx-runtime-i18n/angular';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),

    // Recommended consumer usage: install catalogs into /public/i18n/<lang>.json
    // and fetch them via a simple, idempotent (abortable) fetch.
    provideRuntimeI18n(
      {
        defaultLang: 'en',
        supported: ['en', 'hi', 'de'],
        fallbacks: ['de'],
        fetchCatalog: (lang: string, signal?: AbortSignal) =>
          fetch(`/i18n/${lang}.json`, { signal }).then((r) => {
            if (!r.ok) throw new Error(`Failed to load catalog: ${lang}`);
            return r.json() as Promise<Record<string, unknown>>;
          }),
        // Keep missing keys visible during development.
        onMissingKey: (key) => key,
      },
      {
        // Make Angular pipes (DatePipe, DecimalPipe, etc.) locale-aware per language.
        localeLoaders: {
          en: () => import('@angular/common/locales/global/en'),
          hi: () => import('@angular/common/locales/global/hi'),
          de: () => import('@angular/common/locales/global/de'),
        },
        options: {
          // First boot only: try persisted -> navigator -> defaultLang.
          autoDetect: true,
          // Persist the chosen lang (set falsy to disable).
          storageKey: '@ngx-runtime-i18n:lang',
          // Persist catalogs via localStorage to survive reloads.
          cacheMode: 'storage',
          cacheKeyPrefix: '@ngx-runtime-i18n:catalog:',
          // If navigator gives "en-GB" and only "en" exists, prefer its base.
          preferNavigatorBase: true,
        },
      }
    ),
  ],
};
