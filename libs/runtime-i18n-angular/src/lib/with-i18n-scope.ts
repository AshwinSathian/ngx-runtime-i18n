import {
  DestroyRef,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { I18nService } from './i18n.service';
import { RUNTIME_I18N_SCOPES } from './tokens';

/**
 * Registers a translation scope for a lazy route or feature module.
 * The scope catalog is loaded when the route activates and unloaded when destroyed.
 *
 * URL convention: scope 'checkout' → fetches `<configuredBaseUrl>/checkout/<lang>.json`
 *
 * @example
 * // In route definition:
 * {
 *   path: 'checkout',
 *   loadComponent: () => import('./checkout.component'),
 *   providers: [withI18nScope('checkout')]
 * }
 *
 * @publicApi
 */
export function withI18nScope(scope: string): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: RUNTIME_I18N_SCOPES,
      useValue: scope,
      multi: true,
    },
    provideAppInitializer(() => {
      const i18n = inject(I18nService);
      const destroyRef = inject(DestroyRef);

      destroyRef.onDestroy(() => i18n.unloadScope(scope));

      return i18n.loadScope(scope);
    }),
  ]);
}
